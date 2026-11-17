import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { getDatabase } from '@/src/db/database';
import * as queries from '@/src/db/queries';
import type {
  AppSettings,
  Category,
  CategoryBudgetStatus,
  ExpenseSource,
  ExpenseWithCategory,
  SavingsGoal,
  WatchedApp,
} from '@/src/db/types';
import { buildCategoryStatus, wouldExceedBudget } from '@/src/domain/budget';
import type { RankState } from '@/src/domain/kda';
import { formatPeriodLabel, getPeriodEnd, getPeriodStart } from '@/src/domain/month';
import { notifyBudgetThresholds } from '@/src/domain/notifications';
import { isPinSet } from '@/src/domain/pin';
import { AppState } from 'react-native';

import {
  getPendingExpenses,
  removePendingExpense,
  setOverlayConfig,
  syncWatchedAppsToNative,
  type PendingExpense,
} from '@/modules/app-gate';
import {
  rankStateFromSettings,
  settleClosedRankPeriods,
} from '@/src/domain/rankSettlement';

type BudgetContextValue = {
  ready: boolean;
  initError: string | null;
  categories: Category[];
  statuses: CategoryBudgetStatus[];
  expenses: ExpenseWithCategory[];
  watchedApps: WatchedApp[];
  savingsGoals: SavingsGoal[];
  /** Expenses the floating bubble still needs confirmed (no amount, or needs PIN). */
  pendingExpenses: PendingExpense[];
  dismissPending: (id: string) => Promise<void>;
  primaryGoal: SavingsGoal | null;
  settings: AppSettings;
  rank: RankState;
  periodLabel: string;
  totalBudget: number;
  totalSpent: number;
  refresh: () => Promise<void>;
  updateLimit: (id: number, monthlyLimit: number) => Promise<void>;
  addCategory: (input: {
    name: string;
    monthlyLimit: number;
    color?: string;
  }) => Promise<void>;
  removeCategory: (id: number) => Promise<void>;
  addExpense: (input: {
    categoryId: number;
    amount: number;
    reason: string;
    source: ExpenseSource;
    appPackage?: string | null;
  }) => Promise<{ overBudget: boolean }>;
  removeExpense: (id: number) => Promise<void>;
  setWatchedEnabled: (id: number, enabled: boolean) => Promise<void>;
  addWatched: (
    label: string,
    androidPackage: string,
    categoryId?: number | null,
    kind?: string | null
  ) => Promise<void>;
  removeWatched: (id: number) => Promise<void>;
  saveClassifiedApps: (
    apps: Array<{
      label: string;
      androidPackage: string;
      enabled: boolean;
      categoryId: number | null;
      kind: string | null;
    }>
  ) => Promise<void>;
  saveGoal: (input: {
    id?: number;
    name: string;
    targetAmount: number;
    savedAmount?: number;
    color?: string;
    icon?: string;
    targetDate?: string | null;
  }) => Promise<SavingsGoal>;
  contributeToGoal: (id: number, amount: number) => Promise<void>;
  removeGoal: (id: number) => Promise<void>;
  completeSetup: () => Promise<void>;
  reloadSettings: () => Promise<void>;
  checkWouldExceed: (categoryId: number, amount: number) => boolean;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spentMap, setSpentMap] = useState<Record<number, number>>({});
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [watchedApps, setWatchedApps] = useState<WatchedApp[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    monthlyResetDay: 1,
    currency: 'USD',
    emergencyPinSet: false,
    setupComplete: false,
    authMode: 'none',
    authEmail: '',
    userRole: 'esposo',
    companionRole: 'esposa',
    avatarSource: 'pixel',
    avatarPhotoUri: '',
    kdaTier: 'Hierro',
    kdaProgressMonths: 0,
    kdaLastSettledPeriod: null,
  });
  const [rank, setRank] = useState<RankState>({
    tier: 'Hierro',
    progressMonths: 0,
    lastSettledPeriod: null,
  });

  const [initError, setInitError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setInitError(null);
    try {
      await getDatabase();
      const [cats, sett, watched, goals] = await Promise.all([
        queries.getCategories(),
        queries.getSettings(),
        queries.getWatchedApps(),
        queries.getSavingsGoals(),
      ]);
      let pinConfigured = false;
      try {
        pinConfigured = await isPinSet();
      } catch (pinError) {
        console.warn('PIN storage unavailable', pinError);
      }
      let nextSettings = { ...sett, emergencyPinSet: pinConfigured };
      let nextRank = rankStateFromSettings(nextSettings);
      let pending: PendingExpense[] = [];
      try {
        nextRank = await settleClosedRankPeriods(nextSettings, cats);
        nextSettings = {
          ...nextSettings,
          kdaTier: nextRank.tier,
          kdaProgressMonths: nextRank.progressMonths,
          kdaLastSettledPeriod: nextRank.lastSettledPeriod,
        };
      } catch (rankError) {
        console.warn('Rank settlement skipped', rankError);
      }
      try {
        pending = await importReportedExpenses(
          cats,
          nextSettings.monthlyResetDay,
          nextSettings.currency
        );
      } catch (pendingError) {
        console.warn('Pending expenses import skipped', pendingError);
      }
      const spent = await queries.getSpentByCategory(nextSettings.monthlyResetDay);
      const list = await queries.getExpensesForPeriod(nextSettings.monthlyResetDay);

      setCategories(cats);
      setSettings(nextSettings);
      setRank(nextRank);
      setSpentMap(spent);
      setExpenses(list);
      setWatchedApps(watched);
      setSavingsGoals(goals);
      setPendingExpenses(pending);
      try {
        await syncWatchedAppsToNative(
          watched.filter((a) => a.enabled).map((a) => a.androidPackage)
        );
      } catch (syncError) {
        console.warn('Native gate sync skipped', syncError);
      }
      setReady(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo iniciar la base de datos';
      console.error('Failed to init budget db', error);
      setInitError(message);
      setReady(false);
      // Do not rethrow — keep UI usable with the error state.
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      // initError already set
    });
  }, [refresh]);

  // Coming back to the app: pick up whatever the bubble collected meanwhile.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh().catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [refresh]);

  const statuses = useMemo(
    () =>
      categories.map((category) =>
        buildCategoryStatus(category, spentMap[category.id] ?? 0)
      ),
    [categories, spentMap]
  );

  const periodStart = getPeriodStart(new Date(), settings.monthlyResetDay);
  const periodEnd = getPeriodEnd(periodStart, settings.monthlyResetDay);
  const periodLabel = formatPeriodLabel(periodStart, periodEnd);
  const totalBudget = categories.reduce((sum, c) => sum + c.monthlyLimit, 0);
  const totalSpent = statuses.reduce((sum, s) => sum + s.spent, 0);

  const updateLimit = useCallback(
    async (id: number, monthlyLimit: number) => {
      await queries.updateCategoryLimit(id, monthlyLimit);
      await refresh();
    },
    [refresh]
  );

  const addCategory = useCallback(
    async (input: { name: string; monthlyLimit: number; color?: string }) => {
      await queries.addCategory(input);
      await refresh();
    },
    [refresh]
  );

  const removeCategory = useCallback(
    async (id: number) => {
      await queries.deleteCategory(id);
      await refresh();
    },
    [refresh]
  );

  const addExpense = useCallback(
    async (input: {
      categoryId: number;
      amount: number;
      reason: string;
      source: ExpenseSource;
      appPackage?: string | null;
    }) => {
      const previousMap = { ...spentMap };
      const category = categories.find((c) => c.id === input.categoryId);
      const currentSpent = spentMap[input.categoryId] ?? 0;
      const overBudget = category
        ? wouldExceedBudget(currentSpent, category.monthlyLimit, input.amount)
        : false;

      await queries.addExpense(input);
      await refresh();

      const nextStatuses = categories.map((c) => {
        const spent =
          c.id === input.categoryId
            ? (previousMap[c.id] ?? 0) + input.amount
            : previousMap[c.id] ?? 0;
        return buildCategoryStatus(c, spent);
      });
      await notifyBudgetThresholds(nextStatuses, settings.currency, previousMap);

      return { overBudget };
    },
    [categories, refresh, settings.currency, spentMap]
  );

  const removeExpense = useCallback(
    async (id: number) => {
      await queries.deleteExpense(id);
      await refresh();
    },
    [refresh]
  );

  const setWatchedEnabled = useCallback(
    async (id: number, enabled: boolean) => {
      await queries.setWatchedAppEnabled(id, enabled);
      await refresh();
    },
    [refresh]
  );

  const addWatched = useCallback(
    async (
      label: string,
      androidPackage: string,
      categoryId?: number | null,
      kind?: string | null
    ) => {
      await queries.addWatchedApp(label, androidPackage, categoryId, kind);
      await refresh();
    },
    [refresh]
  );

  const removeWatched = useCallback(
    async (id: number) => {
      await queries.deleteWatchedApp(id);
      await refresh();
    },
    [refresh]
  );

  const saveClassifiedApps = useCallback(
    async (
      apps: Array<{
        label: string;
        androidPackage: string;
        enabled: boolean;
        categoryId: number | null;
        kind: string | null;
      }>
    ) => {
      await queries.replaceWatchedApps(apps);
      await refresh();
    },
    [refresh]
  );

  const completeSetup = useCallback(async () => {
    await queries.markSetupComplete();
    await refresh();
  }, [refresh]);

  const reloadSettings = useCallback(async () => {
    const sett = await queries.getSettings();
    let pinConfigured = false;
    try {
      pinConfigured = await isPinSet();
    } catch {
      pinConfigured = false;
    }
    setSettings({ ...sett, emergencyPinSet: pinConfigured });
  }, []);

  const checkWouldExceed = useCallback(
    (categoryId: number, amount: number) => {
      const category = categories.find((c) => c.id === categoryId);
      if (!category) return false;
      return wouldExceedBudget(
        spentMap[categoryId] ?? 0,
        category.monthlyLimit,
        amount
      );
    },
    [categories, spentMap]
  );

  const saveGoal = useCallback(
    async (input: {
      id?: number;
      name: string;
      targetAmount: number;
      savedAmount?: number;
      color?: string;
      icon?: string;
      targetDate?: string | null;
    }) => {
      const goal = await queries.upsertSavingsGoal(input);
      await refresh();
      return goal;
    },
    [refresh]
  );

  const contributeToGoal = useCallback(
    async (id: number, amount: number) => {
      await queries.contributeToGoal(id, amount);
      await refresh();
    },
    [refresh]
  );

  const removeGoal = useCallback(
    async (id: number) => {
      await queries.deleteSavingsGoal(id);
      await refresh();
    },
    [refresh]
  );

  const dismissPending = useCallback(
    async (id: string) => {
      await removePendingExpense(id);
      await refresh();
    },
    [refresh]
  );

  // Keep the native bubble in sync: companion, app labels, budget left.
  useEffect(() => {
    if (!ready) return;
    setOverlayConfig({
      role: settings.companionRole,
      currency: settings.currency,
      reminderMinutes: 20,
      apps: watchedApps
        .filter((a) => a.enabled)
        .map((a) => ({
          packageName: a.androidPackage,
          label: a.label,
          categoryId: a.categoryId ?? -1,
        })),
      categories: statuses.map((s) => ({
        id: s.id,
        name: s.name,
        remaining: s.remaining,
        spent: s.spent,
        limit: s.monthlyLimit,
      })),
      avatarSource: settings.avatarSource,
      avatarPhotoUri:
        settings.avatarSource === 'photo' ? settings.avatarPhotoUri : '',
    }).catch((error) => console.warn('Overlay config sync skipped', error));
  }, [ready, settings.companionRole, settings.currency, settings.avatarSource, settings.avatarPhotoUri, watchedApps, statuses]);

  const primaryGoal = savingsGoals[0] ?? null;

  const value: BudgetContextValue = {
    ready,
    initError,
    categories,
    statuses,
    expenses,
    watchedApps,
    savingsGoals,
    pendingExpenses,
    dismissPending,
    primaryGoal,
    settings,
    rank,
    periodLabel,
    totalBudget,
    totalSpent,
    refresh,
    updateLimit,
    addCategory,
    removeCategory,
    addExpense,
    removeExpense,
    setWatchedEnabled,
    addWatched,
    removeWatched,
    saveClassifiedApps,
    saveGoal,
    contributeToGoal,
    removeGoal,
    completeSetup,
    reloadSettings,
    checkWouldExceed,
  };

  return (
    <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
  );
}

/**
 * Imports amounts the user typed in the floating bubble. Anything that would
 * blow a category's budget stays pending so it gets confirmed with the PIN.
 * Returns what is still pending.
 */
async function importReportedExpenses(
  categories: Category[],
  monthlyResetDay: number,
  currency: string
): Promise<PendingExpense[]> {
  const all = await getPendingExpenses();
  const reported = all.filter((p) => p.status === 'reported' && p.amount != null);
  if (reported.length === 0) return all;

  const before = await queries.getSpentByCategory(monthlyResetDay);
  const running = { ...before };
  const imported = new Set<string>();

  for (const item of reported) {
    const category =
      categories.find((c) => c.id === item.categoryId) ?? categories[0];
    if (!category || item.amount == null) continue;
    const spent = running[category.id] ?? 0;
    if (wouldExceedBudget(spent, category.monthlyLimit, item.amount)) continue;

    await queries.addExpense({
      categoryId: category.id,
      amount: item.amount,
      reason: item.reason || `Gasto en ${item.label}`,
      source: 'gate',
      appPackage: item.packageName || null,
      createdAt: new Date(item.endedAt || Date.now()).toISOString(),
    });
    await removePendingExpense(item.id);
    running[category.id] = spent + item.amount;
    imported.add(item.id);
  }

  if (imported.size > 0) {
    const nextStatuses = categories.map((c) =>
      buildCategoryStatus(c, running[c.id] ?? 0)
    );
    await notifyBudgetThresholds(nextStatuses, currency, before).catch(
      () => undefined
    );
  }

  return all.filter((p) => !imported.has(p.id));
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) {
    throw new Error('useBudget must be used within BudgetProvider');
  }
  return ctx;
}
