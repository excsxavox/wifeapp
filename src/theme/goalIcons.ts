/** Iconos limitados y fijos para metas de ahorro. */
export const GOAL_ICONS = [
  '✈️',
  '🏠',
  '🎓',
  '🛟',
  '💍',
  '🚗',
  '💻',
  '🎁',
  '💪',
  '🌱',
] as const;

export type GoalIcon = (typeof GOAL_ICONS)[number];

export function isGoalIcon(value: string): value is GoalIcon {
  return (GOAL_ICONS as readonly string[]).includes(value);
}

export function normalizeGoalIcon(value: string | null | undefined): GoalIcon {
  if (value && isGoalIcon(value)) return value;
  return GOAL_ICONS[0];
}
