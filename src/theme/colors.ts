/** Tokens visuales WifeApp — marca naranja #FFB27A. */
export const colors = {
  bg: '#FBF6F1',
  bgElevated: '#F5EDE6',
  surface: '#FFFFFF',
  ink: '#3A2A1F',
  text: '#4A3A2E',
  inkMuted: '#8A7A6E',
  inkFaint: '#A8988C',
  primary: '#FFB27A',
  primarySoft: '#FFE8D6',
  primaryMid: '#E89555',
  lime: '#FFD4B0',
  limeSoft: '#FFF1E6',
  accent: '#D4894A',
  accentSoft: '#FFF0E4',
  danger: '#BD6655',
  dangerSoft: '#F9EEE9',
  warning: '#BA7544',
  warningSoft: '#FCF2DF',
  success: '#3B7050',
  border: '#EFE4DA',
  borderStrong: '#E2D4C8',
  overlay: 'rgba(58, 42, 31, 0.65)',
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
