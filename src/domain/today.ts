const DAY_MS = 24 * 60 * 60 * 1000;

export type PaceState = 'ok' | 'fast' | 'over';

export type MonthPace = {
  /** 1-based day of the budget period. */
  dayIndex: number;
  totalDays: number;
  /** Days left including today (at least 1). */
  daysLeft: number;
  /** Share of the budget already spent, 0..1+ (0 with no budget). */
  spentRatio: number;
  /** Share of the period already elapsed, 0..1. */
  timeRatio: number;
  available: number;
  /** What can be spent today and still end the period inside the plan. */
  dailyAllowance: number;
  state: PaceState;
};

/** How far ahead of the calendar spending is before we call it "fast". */
const FAST_MARGIN = 0.1;

export function computeMonthPace({
  totalBudget,
  totalSpent,
  periodStart,
  periodEnd,
  now = new Date(),
}: {
  totalBudget: number;
  totalSpent: number;
  periodStart: Date;
  periodEnd: Date;
  now?: Date;
}): MonthPace {
  const totalDays = Math.max(
    1,
    Math.round((periodEnd.getTime() - periodStart.getTime()) / DAY_MS)
  );
  const elapsed = Math.floor((now.getTime() - periodStart.getTime()) / DAY_MS);
  const dayIndex = Math.min(totalDays, Math.max(1, elapsed + 1));
  const daysLeft = Math.max(1, totalDays - dayIndex + 1);
  const available = totalBudget - totalSpent;
  const spentRatio = totalBudget > 0 ? totalSpent / totalBudget : 0;
  const timeRatio = dayIndex / totalDays;

  let state: PaceState = 'ok';
  if (available < 0) state = 'over';
  else if (spentRatio > timeRatio + FAST_MARGIN) state = 'fast';

  return {
    dayIndex,
    totalDays,
    daysLeft,
    spentRatio,
    timeRatio,
    available,
    dailyAllowance: Math.max(0, available) / daysLeft,
    state,
  };
}
