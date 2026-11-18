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

export type AvatarSource = 'pixel' | 'adult' | 'disney' | 'photo';
export type AuthMode = 'none' | 'guest' | 'account';

export type AppSettings = {
  monthlyResetDay: number;
  currency: string;
  emergencyPinSet: boolean;
  setupComplete: boolean;
  /** Sesión de acceso: none = pantalla login. */
  authMode: AuthMode;
  /** Correo de la cuenta local, si aplica. */
  authEmail: string;
  /** Quién usa la app (avatar de cabecera / perfil). */
  userRole: CompanionRole;
  /** Compañero/a del portero y coach. */
  companionRole: CompanionRole;
  avatarSource: AvatarSource;
  avatarPhotoUri: string;
  /** Rango KDA persistido (constancia mensual). */
  kdaTier: string;
  /** Meses buenos hacia el siguiente rango. */
  kdaProgressMonths: number;
  /** ISO del inicio/fin del último periodo liquidado. */
  kdaLastSettledPeriod: string | null;
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
  icon: string;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
};
