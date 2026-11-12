import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { CategoryBudgetStatus } from '@/src/db/types';
import { formatMoney } from '@/src/domain/money';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function notifyBudgetThresholds(
  statuses: CategoryBudgetStatus[],
  currency: string,
  previousMap: Record<number, number>
) {
  const allowed = await ensureNotificationPermissions();
  if (!allowed) return;

  for (const status of statuses) {
    const previous = previousMap[status.id] ?? 0;
    const prevPct =
      status.monthlyLimit > 0 ? previous / status.monthlyLimit : 0;
    const nextPct =
      status.monthlyLimit > 0 ? status.spent / status.monthlyLimit : 0;

    if (prevPct < 0.8 && nextPct >= 0.8 && nextPct < 1) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${status.name}: 80% del presupuesto`,
          body: `Llevas ${formatMoney(status.spent, currency)} de ${formatMoney(status.monthlyLimit, currency)}.`,
          sound: true,
        },
        trigger: null,
      });
    }

    if (prevPct < 1 && nextPct >= 1) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${status.name}: presupuesto agotado`,
          body:
            Platform.OS === 'ios'
              ? 'Registra con cuidado. En iPhone no se pueden bloquear otras apps.'
              : 'Para gastar más en esta categoría necesitarás el código de emergencia.',
          sound: true,
        },
        trigger: null,
      });
    }
  }
}
