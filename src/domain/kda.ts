import type { CategoryBudgetStatus, ExpenseWithCategory } from '@/src/db/types';

export type KdaTier =
  | 'Hierro'
  | 'Bronce'
  | 'Plata'
  | 'Oro'
  | 'Platino'
  | 'Diamante';

/** Ratio mínimo del mes para contar como “buen KDA”. */
export const GOOD_MONTH_MIN_RATIO = 1.4;

/**
 * Escala de menor a mayor.
 * `monthsToEarn` = meses con buen KDA seguidos necesarios para subir A este nivel
 * desde el anterior. Hierro es el inicio (0).
 */
export const KDA_TIERS: readonly {
  tier: KdaTier;
  monthsToEarn: number;
  hint: string;
}[] = [
  {
    tier: 'Hierro',
    monthsToEarn: 0,
    hint: 'Punto de partida. Cierra meses con buen KDA para subir.',
  },
  {
    tier: 'Bronce',
    monthsToEarn: 1,
    hint: '1 mes con buen KDA te saca de Hierro.',
  },
  {
    tier: 'Plata',
    monthsToEarn: 2,
    hint: '2 meses buenos seguidos desde Bronce.',
  },
  {
    tier: 'Oro',
    monthsToEarn: 3,
    hint: '3 meses de constancia desde Plata.',
  },
  {
    tier: 'Platino',
    monthsToEarn: 4,
    hint: '4 meses sólidos desde Oro.',
  },
  {
    tier: 'Diamante',
    monthsToEarn: 5,
    hint: '5 meses de élite desde Platino.',
  },
];

export type RankState = {
  tier: KdaTier;
  /** Meses buenos acumulados hacia el siguiente nivel. */
  progressMonths: number;
  /** ISO del inicio del último periodo ya liquidado. */
  lastSettledPeriod: string | null;
};

export type KdaMetrics = {
  kills: number;
  deaths: number;
  assists: number;
  ratio: number;
  ratioLabel: string;
  hasActivity: boolean;
  monthQualifies: boolean;
  tier: KdaTier;
  tierHint: string;
  progressMonths: number;
  monthsNeeded: number;
  nextTier: KdaTier | null;
  disciplinedAmount: number;
  emergencyAmount: number;
  categoriesSafe: number;
  categoriesOver: number;
  byCategory: {
    id: number;
    name: string;
    color: string;
    spent: number;
    limit: number;
    percent: number;
    overBudget: boolean;
  }[];
  byDay: {
    day: string;
    label: string;
    disciplined: number;
    emergency: number;
    total: number;
  }[];
};

export function isKdaTier(value: string | null | undefined): value is KdaTier {
  return KDA_TIERS.some((entry) => entry.tier === value);
}

export function parseKdaTier(value: string | null | undefined): KdaTier {
  return isKdaTier(value) ? value : 'Hierro';
}

export function getTierIndex(tier: KdaTier): number {
  return KDA_TIERS.findIndex((entry) => entry.tier === tier);
}

export function getNextTier(tier: KdaTier): KdaTier | null {
  const index = getTierIndex(tier);
  if (index < 0 || index >= KDA_TIERS.length - 1) return null;
  return KDA_TIERS[index + 1].tier;
}

export function getMonthsNeededForNext(tier: KdaTier): number {
  const next = getNextTier(tier);
  if (!next) return 0;
  return KDA_TIERS[getTierIndex(next)].monthsToEarn;
}

export function isGoodMonth(ratio: number, hasActivity: boolean): boolean {
  return hasActivity && ratio >= GOOD_MONTH_MIN_RATIO;
}

export function describeRankProgress(
  rank: RankState,
  monthQualifies: boolean
): string {
  const next = getNextTier(rank.tier);
  if (!next) {
    return monthQualifies
      ? 'Diamante: mantén meses con buen KDA para conservar la élite.'
      : 'Diamante: este mes aún no llega al umbral de constancia.';
  }

  const needed = getMonthsNeededForNext(rank.tier);
  const base = `${rank.progressMonths}/${needed} meses buenos hacia ${next}.`;

  if (!monthQualifies) {
    return `${base} Este mes necesita ratio ≥ ${GOOD_MONTH_MIN_RATIO.toFixed(1)}.`;
  }

  return `${base} Este mes va bien: al cerrarlo suma constancia.`;
}

export function applyMonthResult(
  rank: RankState,
  monthWasGood: boolean
): RankState {
  if (!monthWasGood) {
    return {
      ...rank,
      progressMonths: 0,
    };
  }

  const next = getNextTier(rank.tier);
  if (!next) {
    return rank;
  }

  const needed = getMonthsNeededForNext(rank.tier);
  const progressMonths = rank.progressMonths + 1;

  if (progressMonths >= needed) {
    return {
      ...rank,
      tier: next,
      progressMonths: 0,
    };
  }

  return {
    ...rank,
    progressMonths,
  };
}

export function computeMonthScore(
  expenses: ExpenseWithCategory[],
  statuses: CategoryBudgetStatus[]
): {
  kills: number;
  deaths: number;
  assists: number;
  ratio: number;
  hasActivity: boolean;
  monthQualifies: boolean;
  disciplinedAmount: number;
  emergencyAmount: number;
  categoriesSafe: number;
  categoriesOver: number;
  byCategory: KdaMetrics['byCategory'];
  byDay: KdaMetrics['byDay'];
} {
  let kills = 0;
  let deaths = 0;
  let disciplinedAmount = 0;
  let emergencyAmount = 0;

  const dayMap = new Map<
    string,
    { disciplined: number; emergency: number; total: number }
  >();

  for (const expense of expenses) {
    const day = expense.createdAt.slice(0, 10);
    const bucket = dayMap.get(day) ?? {
      disciplined: 0,
      emergency: 0,
      total: 0,
    };
    bucket.total += expense.amount;

    if (expense.source === 'emergency') {
      deaths += 1;
      emergencyAmount += expense.amount;
      bucket.emergency += expense.amount;
    } else {
      kills += 1;
      disciplinedAmount += expense.amount;
      bucket.disciplined += expense.amount;
    }

    dayMap.set(day, bucket);
  }

  const categoriesSafe = statuses.filter((s) => !s.overBudget).length;
  const categoriesOver = statuses.filter((s) => s.overBudget).length;
  const cleanDays = [...dayMap.values()].filter(
    (d) => d.emergency === 0 && d.disciplined > 0
  ).length;

  const hasActivity = kills > 0 || deaths > 0;
  const assists = hasActivity ? categoriesSafe + cleanDays : 0;
  const ratio = hasActivity ? (kills + assists) / Math.max(deaths, 1) : 0;
  const monthQualifies = isGoodMonth(ratio, hasActivity);

  const byDay = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, values]) => {
      const date = new Date(`${day}T12:00:00`);
      return {
        day,
        label: date.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
        }),
        ...values,
      };
    });

  return {
    kills,
    deaths,
    assists,
    ratio,
    hasActivity,
    monthQualifies,
    disciplinedAmount,
    emergencyAmount,
    categoriesSafe,
    categoriesOver,
    byCategory: statuses.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      spent: s.spent,
      limit: s.monthlyLimit,
      percent: s.percent,
      overBudget: s.overBudget,
    })),
    byDay,
  };
}

export function computeKdaMetrics(
  expenses: ExpenseWithCategory[],
  statuses: CategoryBudgetStatus[],
  rank: RankState = {
    tier: 'Hierro',
    progressMonths: 0,
    lastSettledPeriod: null,
  }
): KdaMetrics {
  const score = computeMonthScore(expenses, statuses);
  const nextTier = getNextTier(rank.tier);
  const monthsNeeded = getMonthsNeededForNext(rank.tier);

  return {
    ...score,
    ratioLabel: score.ratio.toFixed(2),
    tier: rank.tier,
    tierHint: describeRankProgress(rank, score.monthQualifies),
    progressMonths: rank.progressMonths,
    monthsNeeded,
    nextTier,
  };
}
