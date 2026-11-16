import type { ExpenseWithCategory } from '@/src/db/types';

/** Días consecutivos con al menos un gasto, contando hacia atrás desde hoy. */
export function computeExpenseStreak(
  expenses: ExpenseWithCategory[],
  now = new Date()
): number {
  const days = new Set(expenses.map((e) => e.createdAt.slice(0, 10)));
  if (days.size === 0) return 0;

  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let i = 0; i < 366; i += 1) {
    const key = toDayKey(cursor);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
