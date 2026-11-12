/** Tokens visuales del prototipo WifeApp (dist/styles.css). */
export const colors = {
  bg: '#F7F8F4',
  bgElevated: '#F0F3EB',
  surface: '#FFFFFF',
  ink: '#223C31',
  text: '#37483F',
  inkMuted: '#7B857E',
  inkFaint: '#99A197',
  primary: '#244D3B',
  primarySoft: '#ECF2E6',
  primaryMid: '#3B7050',
  lime: '#D9EDAB',
  limeSoft: '#EDF2E4',
  accent: '#668450',
  accentSoft: '#EEF3E8',
  danger: '#BD6655',
  dangerSoft: '#F9EEE9',
  warning: '#BA7544',
  warningSoft: '#FCF2DF',
  success: '#3B7050',
  border: '#E9ECE5',
  borderStrong: '#E0E5DA',
  overlay: 'rgba(24, 51, 37, 0.65)',
} as const;

/** Colores de categoría del prototipo. */
export const categoryMeta: Record<
  string,
  { color: string; tint: string }
> = {
  Comida: { color: '#BDA65F', tint: '#F8F2DF' },
  Banca: { color: '#7B9984', tint: '#EDF4ED' },
  Movilidad: { color: '#88A2B0', tint: '#EDF3F6' },
  Entretenimiento: { color: '#B594AD', tint: '#F4EDF2' },
  Otros: { color: '#9B9F85', tint: '#F2F2E8' },
};

export const categoryPalette = [
  '#BDA65F',
  '#7B9984',
  '#88A2B0',
  '#B594AD',
  '#9B9F85',
] as const;
