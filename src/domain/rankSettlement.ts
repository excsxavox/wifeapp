import * as queries from '@/src/db/queries';
import type { AppSettings, Category } from '@/src/db/types';
import { buildCategoryStatus } from '@/src/domain/budget';
import {
  applyMonthResult,
  computeMonthScore,
  parseKdaTier,
  type RankState,
} from '@/src/domain/kda';
import { getPeriodEnd, getPeriodStart, toIso } from '@/src/domain/month';

export function rankStateFromSettings(settings: AppSettings): RankState {
  return {
    tier: parseKdaTier(settings.kdaTier),
    progressMonths: Math.max(0, settings.kdaProgressMonths || 0),
    lastSettledPeriod: settings.kdaLastSettledPeriod,
  };
}

export async function persistRankState(rank: RankState): Promise<void> {
  await Promise.all([
    queries.setSetting('kdaTier', rank.tier),
    queries.setSetting('kdaProgressMonths', String(rank.progressMonths)),
    queries.setSetting(
      'kdaLastSettledPeriod',
      rank.lastSettledPeriod ?? ''
    ),
  ]);
}

/**
 * Liquida periodos cerrados desde el último asentamiento.
 * Un mes bueno suma constancia; uno malo reinicia el progreso hacia el siguiente nivel.
 */
export async function settleClosedRankPeriods(
  settings: AppSettings,
  categories: Category[],
  now = new Date()
): Promise<RankState> {
  const monthlyResetDay = settings.monthlyResetDay;
  const currentStart = getPeriodStart(now, monthlyResetDay);
  const currentKey = toIso(currentStart);

  let rank = rankStateFromSettings(settings);

  if (!rank.lastSettledPeriod) {
    rank = { ...rank, lastSettledPeriod: currentKey };
    await persistRankState(rank);
    return rank;
  }

  if (rank.lastSettledPeriod >= currentKey) {
    return rank;
  }

  // lastSettledPeriod guarda el inicio del periodo actual (aún abierto) o el
  // siguiente tras liquidar uno cerrado.
  let cursor = new Date(rank.lastSettledPeriod);

  // Safety: avoid infinite loops if dates are odd
  for (let i = 0; i < 36; i += 1) {
    const cursorKey = toIso(cursor);
    if (cursorKey >= currentKey) break;

    const periodEnd = getPeriodEnd(cursor, monthlyResetDay);
    const expenses = await queries.getExpensesInRange(cursor, periodEnd);
    const spentMap = await queries.getSpentByCategoryInRange(cursor, periodEnd);
    const statuses = categories.map((category) =>
      buildCategoryStatus(category, spentMap[category.id] ?? 0)
    );
    const score = computeMonthScore(expenses, statuses);
    rank = applyMonthResult(rank, score.monthQualifies);
    cursor = periodEnd;
    rank = { ...rank, lastSettledPeriod: toIso(cursor) };
  }

  if (!rank.lastSettledPeriod || rank.lastSettledPeriod < currentKey) {
    rank = { ...rank, lastSettledPeriod: currentKey };
  }

  await persistRankState(rank);
  return rank;
}
