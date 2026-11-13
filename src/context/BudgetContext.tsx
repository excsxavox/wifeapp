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
import { formatPeriodLabel, getPeriodEnd, getPeriodStart } from '@/src/domain/month';
import { notifyBudgetThresholds } from '@/src/domain/notifications';
import { isPinSet } from '@/src/domain/pin';
import { syncWatchedAppsToNative } from '@/modules/app-gate';

type BudgetContextValue = {
  ready: boolean;
  initError: string | null;
  categories: Category[];
  statuses: CategoryBudgetStatus[];
  expenses: ExpenseWithCategory[];
  watchedApps: WatchedApp[];
  savingsGoals: SavingsGoal[];
  primaryGoal: SavingsGoal | null;
  settings: AppSettings;
  periodLabel: string;
  totalBudget: number;
  totalSpent: number;
  refresh: () => Promise<void>;
  updateLimit: (id: number, monthlyLimit: number) => Promise<void>;
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
  const [settings, setSettings] = useState<AppSettings>({
    monthlyResetDay: 1,
    currency: 'USD',
    emergencyPinSet: false,
    setupComplete: false,
    companionRole: 'esposa',
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
      const nextSettings = { ...sett, emergencyPinSet: pinConfigured };
      const spent = await queries.getSpentByCategory(nextSettings.monthlyResetDay);
      const list = await queries.getExpensesForPeriod(nextSettings.monthlyResetDay);

      setCategories(cats);
      setSettings(nextSettings);
      setSpentMap(spent);
      setExpenses(list);
      setWatchedApps(watched);
      setSavingsGoals(goals);
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
      throw error;
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      // initError already set
    });
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

  const primaryGoal = savingsGoals[0] ?? null;

  const value: BudgetContextValue = {
    ready,
    initError,
    categories,
    statuses,
    expenses,
    watchedApps,
    savingsGoals,
    primaryGoal,
    settings,
    periodLabel,
    totalBudget,
    totalSpent,
    refresh,
    updateLimit,
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

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) {
    throw new Error('useBudget must be used within BudgetProvider');
  }
  return ctx;
}
