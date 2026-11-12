import type { Category, CategoryBudgetStatus } from '@/src/db/types';

export function buildCategoryStatus(
  category: Category,
  spent: number
): CategoryBudgetStatus {
  const remaining = category.monthlyLimit - spent;
  const percent =
    category.monthlyLimit <= 0
      ? spent > 0
        ? 100
        : 0
      : Math.min(999, (spent / category.monthlyLimit) * 100);

  return {
    ...category,
    spent,
    remaining,
    percent,
    overBudget: spent > category.monthlyLimit,
  };
}

export function wouldExceedBudget(
  spent: number,
  monthlyLimit: number,
  additionalAmount: number
): boolean {
  return spent + additionalAmount > monthlyLimit;
}

export function thresholdCrossed(
  previousSpent: number,
  nextSpent: number,
  monthlyLimit: number,
  threshold: number
): boolean {
  if (monthlyLimit <= 0) return false;
  const prev = previousSpent / monthlyLimit;
  const next = nextSpent / monthlyLimit;
  return prev < threshold && next >= threshold;
}
