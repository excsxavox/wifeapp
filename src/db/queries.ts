import { getDatabase } from '@/src/db/database';
import type {
  AppSettings,
  Category,
  Expense,
  ExpenseSource,
  ExpenseWithCategory,
  SavingsGoal,
  WatchedApp,
} from '@/src/db/types';
import { getPeriodStart, toIso } from '@/src/domain/month';

function mapCategory(row: {
  id: number;
  name: string;
  monthly_limit: number;
  color: string;
  sort_order: number;
}): Category {
  return {
    id: row.id,
    name: row.name,
    monthlyLimit: row.monthly_limit,
    color: row.color,
    sortOrder: row.sort_order,
  };
}

function mapExpense(row: {
  id: number;
  category_id: number;
  amount: number;
  reason: string;
  created_at: string;
  source: ExpenseSource;
  app_package: string | null;
}): Expense {
  return {
    id: row.id,
    categoryId: row.category_id,
    amount: row.amount,
    reason: row.reason,
    createdAt: row.created_at,
    source: row.source,
    appPackage: row.app_package,
  };
}

function mapWatchedApp(row: {
  id: number;
  label: string;
  android_package: string;
  enabled: number;
  category_id?: number | null;
  kind?: string | null;
}): WatchedApp {
  return {
    id: row.id,
    label: row.label,
    androidPackage: row.android_package,
    enabled: row.enabled === 1,
    categoryId: row.category_id ?? null,
    kind: row.kind ?? null,
  };
}

export async function getCategories(): Promise<Category[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    name: string;
    monthly_limit: number;
    color: string;
    sort_order: number;
  }>('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
  return rows.map(mapCategory);
}

export async function updateCategoryLimit(id: number, monthlyLimit: number) {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE categories SET monthly_limit = ? WHERE id = ?',
    monthlyLimit,
    id
  );
}

export async function addCategory(input: {
  name: string;
  monthlyLimit: number;
  color?: string;
}): Promise<Category> {
  const db = await getDatabase();
  const name = input.name.trim();
  if (!name) {
    throw new Error('El nombre de la categoría es obligatorio');
  }
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM categories WHERE lower(name) = lower(?)',
    name
  );
  if (existing) {
    throw new Error(`Ya existe la categoría «${name}»`);
  }
  const maxOrder = await db.getFirstAsync<{ max: number | null }>(
    'SELECT MAX(sort_order) as max FROM categories'
  );
  const sortOrder = (maxOrder?.max ?? -1) + 1;
  const color = input.color ?? '#9B9F85';
  const result = await db.runAsync(
    `INSERT INTO categories (name, monthly_limit, color, sort_order)
     VALUES (?, ?, ?, ?)`,
    name,
    Math.max(0, input.monthlyLimit),
    color,
    sortOrder
  );
  return {
    id: Number(result.lastInsertRowId),
    name,
    monthlyLimit: Math.max(0, input.monthlyLimit),
    color,
    sortOrder,
  };
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDatabase();
  const count = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) as total FROM categories'
  );
  if ((count?.total ?? 0) <= 1) {
    throw new Error('Debes dejar al menos una categoría');
  }
  await db.runAsync('UPDATE watched_apps SET category_id = NULL WHERE category_id = ?', id);
  await db.runAsync('DELETE FROM expenses WHERE category_id = ?', id);
  await db.runAsync('DELETE FROM categories WHERE id = ?', id);
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const authMode =
    map.authMode === 'guest' || map.authMode === 'account'
      ? map.authMode
      : 'none';
  return {
    monthlyResetDay: Number(map.monthlyResetDay ?? 1),
    currency: map.currency ?? 'USD',
    emergencyPinSet: map.emergencyPinSet === '1',
    setupComplete: map.setupComplete === '1',
    authMode,
    authEmail: map.authEmail ?? '',
    userRole: map.userRole === 'esposa' ? 'esposa' : 'esposo',
    companionRole: map.companionRole === 'esposo' ? 'esposo' : 'esposa',
    kdaTier: map.kdaTier ?? 'Hierro',
    kdaProgressMonths: Number(map.kdaProgressMonths ?? 0),
    kdaLastSettledPeriod: map.kdaLastSettledPeriod
      ? map.kdaLastSettledPeriod
      : null,
  };
}

export async function setSetting(key: string, value: string) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value
  );
}

export async function getSpentByCategory(
  monthlyResetDay: number,
  now = new Date()
): Promise<Record<number, number>> {
  const db = await getDatabase();
  const periodStart = toIso(getPeriodStart(now, monthlyResetDay));
  const rows = await db.getAllAsync<{ category_id: number; total: number }>(
    `SELECT category_id, COALESCE(SUM(amount), 0) as total
     FROM expenses
     WHERE created_at >= ?
     GROUP BY category_id`,
    periodStart
  );
  return Object.fromEntries(rows.map((r) => [r.category_id, r.total]));
}

export async function getCategorySpent(
  categoryId: number,
  monthlyResetDay: number,
  now = new Date()
): Promise<number> {
  const db = await getDatabase();
  const periodStart = toIso(getPeriodStart(now, monthlyResetDay));
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM expenses
     WHERE category_id = ? AND created_at >= ?`,
    categoryId,
    periodStart
  );
  return row?.total ?? 0;
}

export async function addExpense(input: {
  categoryId: number;
  amount: number;
  reason: string;
  source: ExpenseSource;
  appPackage?: string | null;
  createdAt?: string;
}): Promise<Expense> {
  const db = await getDatabase();
  const createdAt = input.createdAt ?? new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO expenses (category_id, amount, reason, created_at, source, app_package)
     VALUES (?, ?, ?, ?, ?, ?)`,
    input.categoryId,
    input.amount,
    input.reason.trim(),
    createdAt,
    input.source,
    input.appPackage ?? null
  );

  return {
    id: Number(result.lastInsertRowId),
    categoryId: input.categoryId,
    amount: input.amount,
    reason: input.reason.trim(),
    createdAt,
    source: input.source,
    appPackage: input.appPackage ?? null,
  };
}

export async function getExpensesInRange(
  rangeStart: Date,
  rangeEnd: Date,
  categoryId?: number | null
): Promise<ExpenseWithCategory[]> {
  const db = await getDatabase();
  const params: (string | number)[] = [toIso(rangeStart), toIso(rangeEnd)];
  let sql = `
    SELECT e.*, c.name as category_name, c.color as category_color
    FROM expenses e
    JOIN categories c ON c.id = e.category_id
    WHERE e.created_at >= ? AND e.created_at < ?
  `;
  if (categoryId != null) {
    sql += ' AND e.category_id = ?';
    params.push(categoryId);
  }
  sql += ' ORDER BY e.created_at DESC, e.id DESC';

  const rows = await db.getAllAsync<{
    id: number;
    category_id: number;
    amount: number;
    reason: string;
    created_at: string;
    source: ExpenseSource;
    app_package: string | null;
    category_name: string;
    category_color: string;
  }>(sql, ...params);

  return rows.map((row) => ({
    ...mapExpense(row),
    categoryName: row.category_name,
    categoryColor: row.category_color,
  }));
}

export async function getExpensesForPeriod(
  monthlyResetDay: number,
  categoryId?: number | null,
  now = new Date()
): Promise<ExpenseWithCategory[]> {
  const periodStart = getPeriodStart(now, monthlyResetDay);
  // Periodo abierto: desde el inicio hasta “ahora” (sin tope superior).
  const periodEnd = new Date(
    Math.max(now.getTime() + 1, periodStart.getTime() + 1)
  );
  return getExpensesInRange(periodStart, periodEnd, categoryId);
}

export async function getSpentByCategoryInRange(
  rangeStart: Date,
  rangeEnd: Date
): Promise<Record<number, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ category_id: number; total: number }>(
    `SELECT category_id, COALESCE(SUM(amount), 0) as total
     FROM expenses
     WHERE created_at >= ? AND created_at < ?
     GROUP BY category_id`,
    toIso(rangeStart),
    toIso(rangeEnd)
  );
  return Object.fromEntries(rows.map((r) => [r.category_id, r.total]));
}

export async function deleteExpense(id: number) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM expenses WHERE id = ?', id);
}

export async function getWatchedApps(): Promise<WatchedApp[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    label: string;
    android_package: string;
    enabled: number;
    category_id: number | null;
    kind: string | null;
  }>('SELECT * FROM watched_apps ORDER BY label ASC');
  return rows.map(mapWatchedApp);
}

export async function setWatchedAppEnabled(id: number, enabled: boolean) {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE watched_apps SET enabled = ? WHERE id = ?',
    enabled ? 1 : 0,
    id
  );
}

export async function addWatchedApp(
  label: string,
  androidPackage: string,
  categoryId?: number | null,
  kind?: string | null
) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO watched_apps (label, android_package, enabled, category_id, kind)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(android_package) DO UPDATE SET
       label = excluded.label,
       enabled = 1,
       category_id = excluded.category_id,
       kind = excluded.kind`,
    label.trim(),
    androidPackage.trim(),
    categoryId ?? null,
    kind ?? null
  );
}

export async function updateWatchedAppCategory(
  id: number,
  categoryId: number | null,
  kind: string | null
) {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE watched_apps SET category_id = ?, kind = ? WHERE id = ?',
    categoryId,
    kind,
    id
  );
}

export async function replaceWatchedApps(
  apps: Array<{
    label: string;
    androidPackage: string;
    enabled: boolean;
    categoryId: number | null;
    kind: string | null;
  }>
) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM watched_apps');
  for (const app of apps) {
    await db.runAsync(
      `INSERT INTO watched_apps (label, android_package, enabled, category_id, kind)
       VALUES (?, ?, ?, ?, ?)`,
      app.label,
      app.androidPackage,
      app.enabled ? 1 : 0,
      app.categoryId,
      app.kind
    );
  }
}

export async function deleteWatchedApp(id: number) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM watched_apps WHERE id = ?', id);
}

export async function getEnabledWatchedPackages(): Promise<string[]> {
  const apps = await getWatchedApps();
  return apps.filter((a) => a.enabled).map((a) => a.androidPackage);
}

export async function markSetupComplete() {
  await setSetting('setupComplete', '1');
}

export async function clearSetupComplete() {
  await setSetting('setupComplete', '0');
}

function mapSavingsGoal(row: {
  id: number;
  name: string;
  target_amount: number;
  saved_amount: number;
  color: string;
  icon?: string | null;
  target_date?: string | null;
  created_at: string;
  updated_at: string;
}): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    savedAmount: row.saved_amount,
    color: row.color,
    icon: row.icon || '✈️',
    targetDate: row.target_date ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    name: string;
    target_amount: number;
    saved_amount: number;
    color: string;
    icon: string | null;
    target_date: string | null;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM savings_goals ORDER BY updated_at DESC, id DESC');
  return rows.map(mapSavingsGoal);
}

export async function upsertSavingsGoal(input: {
  id?: number;
  name: string;
  targetAmount: number;
  savedAmount?: number;
  color?: string;
  icon?: string;
  targetDate?: string | null;
}): Promise<SavingsGoal> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const color = input.color ?? '#3B7050';
  const icon = input.icon ?? '✈️';
  const targetDate = input.targetDate ?? null;
  const savedAmount = Math.max(0, input.savedAmount ?? 0);
  const name = input.name.trim();

  if (input.id != null) {
    await db.runAsync(
      `UPDATE savings_goals
       SET name = ?, target_amount = ?, saved_amount = ?, color = ?, icon = ?,
           target_date = ?, updated_at = ?
       WHERE id = ?`,
      name,
      input.targetAmount,
      savedAmount,
      color,
      icon,
      targetDate,
      now,
      input.id
    );
    return {
      id: input.id,
      name,
      targetAmount: input.targetAmount,
      savedAmount,
      color,
      icon,
      targetDate,
      createdAt: now,
      updatedAt: now,
    };
  }

  const result = await db.runAsync(
    `INSERT INTO savings_goals
      (name, target_amount, saved_amount, color, icon, target_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    name,
    input.targetAmount,
    savedAmount,
    color,
    icon,
    targetDate,
    now,
    now
  );

  return {
    id: Number(result.lastInsertRowId),
    name,
    targetAmount: input.targetAmount,
    savedAmount,
    color,
    icon,
    targetDate,
    createdAt: now,
    updatedAt: now,
  };
}

export async function contributeToGoal(id: number, amount: number) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE savings_goals
     SET saved_amount = MAX(0, saved_amount + ?), updated_at = ?
     WHERE id = ?`,
    amount,
    now,
    id
  );
}

export async function deleteSavingsGoal(id: number) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM savings_goals WHERE id = ?', id);
}
