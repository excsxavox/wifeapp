import type { CategoryBudgetStatus, ExpenseWithCategory } from '@/src/db/types';

export type KdaTier =
  | 'Hierro'
  | 'Bronce'
  | 'Plata'
  | 'Oro'
  | 'Platino'
  | 'Diamante';

export type KdaMetrics = {
  kills: number;
  deaths: number;
  assists: number;
  ratio: number;
  ratioLabel: string;
  tier: KdaTier;
  tierHint: string;
  disciplinedAmount: number;
  emergencyAmount: number;
  categoriesSafe: number;
  categoriesOver: number;
  byCategory: Array<{
    id: number;
    name: string;
    color: string;
    spent: number;
    limit: number;
    percent: number;
    overBudget: boolean;
  }>;
  byDay: Array<{
    day: string;
    label: string;
    disciplined: number;
    emergency: number;
    total: number;
  }>;
};

function tierFromRatio(ratio: number): { tier: KdaTier; hint: string } {
  if (ratio >= 5) {
    return {
      tier: 'Diamante',
      hint: 'Control élite: casi no usas emergencias.',
    };
  }
  if (ratio >= 3.5) {
    return {
      tier: 'Platino',
      hint: 'Muy sólido. Pocos deslices frente a aciertos.',
    };
  }
  if (ratio >= 2.2) {
    return {
      tier: 'Oro',
      hint: 'Buen ritmo. Sigue separando comida y mensuales.',
    };
  }
  if (ratio >= 1.4) {
    return {
      tier: 'Plata',
      hint: 'Vas bien, pero las emergencias aún pesan.',
    };
  }
  if (ratio >= 0.8) {
    return {
      tier: 'Bronce',
      hint: 'Hay progreso, reduce gastos de emergencia.',
    };
  }
  return {
    tier: 'Hierro',
    hint: 'El presupuesto te está ganando. Usa el portero y el motivo.',
  };
}

export function computeKdaMetrics(
  expenses: ExpenseWithCategory[],
  statuses: CategoryBudgetStatus[]
): KdaMetrics {
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
  // Assists: categorías bajo control + días solo con gastos disciplinados
  const cleanDays = [...dayMap.values()].filter(
    (d) => d.emergency === 0 && d.disciplined > 0
  ).length;
  const assists = categoriesSafe + cleanDays;

  const ratio = (kills + assists) / Math.max(deaths, 1);
  const { tier, hint } = tierFromRatio(ratio);

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
    ratioLabel: ratio.toFixed(2),
    tier,
    tierHint: hint,
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
