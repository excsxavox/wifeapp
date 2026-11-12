/** Inclusive start of the current budget period based on reset day (1-28). */
export function getPeriodStart(now = new Date(), monthlyResetDay = 1): Date {
  const day = Math.min(Math.max(monthlyResetDay, 1), 28);
  const year = now.getFullYear();
  const month = now.getMonth();
  const currentDay = now.getDate();

  if (currentDay >= day) {
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function getPeriodEnd(periodStart: Date, monthlyResetDay = 1): Date {
  const day = Math.min(Math.max(monthlyResetDay, 1), 28);
  const end = new Date(periodStart);
  end.setMonth(end.getMonth() + 1);
  end.setDate(day);
  end.setHours(0, 0, 0, 0);
  return end;
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function formatPeriodLabel(periodStart: Date, periodEnd: Date): string {
  const startLabel = periodStart.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
  const endLabel = new Date(periodEnd.getTime() - 1).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
  return `${startLabel} – ${endLabel}`;
}
