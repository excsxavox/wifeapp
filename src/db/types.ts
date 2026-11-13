export type ExpenseSource = 'manual' | 'gate' | 'emergency';

export type Category = {
  id: number;
  name: string;
  monthlyLimit: number;
  color: string;
  sortOrder: number;
};

export type Expense = {
  id: number;
  categoryId: number;
  amount: number;
  reason: string;
  createdAt: string;
  source: ExpenseSource;
  appPackage: string | null;
};

export type ExpenseWithCategory = Expense & {
  categoryName: string;
  categoryColor: string;
};

export type WatchedApp = {
  id: number;
  label: string;
  androidPackage: string;
  enabled: boolean;
  categoryId: number | null;
  kind: string | null;
};

export type CompanionRole = 'esposa' | 'esposo';

export type AppSettings = {
  monthlyResetDay: number;
  currency: string;
  emergencyPinSet: boolean;
  setupComplete: boolean;
  companionRole: CompanionRole;
};

export type CategoryBudgetStatus = Category & {
  spent: number;
  remaining: number;
  percent: number;
  overBudget: boolean;
};

export type SavingsGoal = {
  id: number;
  name: string;
  targetAmount: number;
  savedAmount: number;
  color: string;
  createdAt: string;
  updatedAt: string;
};
