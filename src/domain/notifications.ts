import { Platform } from 'react-native';

import type { CategoryBudgetStatus } from '@/src/db/types';
import { formatMoney } from '@/src/domain/money';
import { toastInfo, toastWarning } from '@/src/domain/feedback';

/** Las alertas de presupuesto van in-app (Notiflix), sin notificaciones del sistema. */
export async function ensureNotificationPermissions(): Promise<boolean> {
  return true;
}

export async function notifyBudgetThresholds(
  statuses: CategoryBudgetStatus[],
  currency: string,
  previousMap: Record<number, number>
) {
  for (const status of statuses) {
    const previous = previousMap[status.id] ?? 0;
    const prevPct =
      status.monthlyLimit > 0 ? previous / status.monthlyLimit : 0;
    const nextPct =
      status.monthlyLimit > 0 ? status.spent / status.monthlyLimit : 0;

    if (prevPct < 0.8 && nextPct >= 0.8 && nextPct < 1) {
      toastWarning(
        `${status.name}: 80% del presupuesto · ${formatMoney(status.spent, currency)} de ${formatMoney(status.monthlyLimit, currency)}`
      );
    }

    if (prevPct < 1 && nextPct >= 1) {
      toastInfo(
        Platform.OS === 'ios'
          ? `${status.name}: presupuesto agotado. En iPhone no se pueden bloquear otras apps.`
          : `${status.name}: presupuesto agotado. Para gastar más necesitarás el código de emergencia.`
      );
    }
  }
}
