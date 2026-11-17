import type { SymbolViewProps } from 'expo-symbols';

/** Tokens of the "Hoy primero" home screen (tab bar shares ink/orange/muted). */
export const home = {
  bg: '#FAF7F2',
  surface: '#FFFFFF',
  line: '#EDE4DA',
  track: '#F3ECE4',
  ink: '#231A14',
  muted: '#6B5D52',
  orange: '#FF8B3D',
  orangeSoft: '#FFEBDC',
  orangeInk: '#A84A12',
  quoteInk: '#6A3A1B',
  warnInk: '#A8380C',
  warnBar: '#D9480F',
  bad: '#B3261E',
  badSoft: '#FDE3E1',
  green: '#2F7A55',
  greenSoft: '#EAF4EE',
  greenInk: '#1F4D37',
  greenInkSoft: '#2C5A43',
} as const;

export const homeFonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  heading: 'BricolageGrotesque_700Bold',
  body: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  /** Amounts and percentages: Manrope's figures read cleaner than Bricolage's. */
  number: 'Manrope_800ExtraBold',
  numberBold: 'Manrope_700Bold',
} as const;

export type SymbolName = SymbolViewProps['name'];

export type CategoryLook = {
  bar: string;
  tint: string;
  ink: string;
  icon: SymbolName;
};

const LOOKS: Record<string, CategoryLook> = {
  Comida: {
    bar: '#FF8B3D',
    tint: '#FFEBDC',
    ink: '#A84A12',
    icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  },
  Movilidad: {
    bar: '#3F6FD8',
    tint: '#E8EEFC',
    ink: '#2F57B5',
    icon: { ios: 'car.fill', android: 'directions_car', web: 'directions_car' },
  },
  Entretenimiento: {
    bar: '#8A55C9',
    tint: '#F1E9FA',
    ink: '#6E3FA8',
    icon: { ios: 'play.rectangle', android: 'movie', web: 'movie' },
  },
  Banca: {
    bar: '#2F7A55',
    tint: '#E6F2EB',
    ink: '#2F7A55',
    icon: {
      ios: 'building.columns',
      android: 'account_balance',
      web: 'account_balance',
    },
  },
  Otros: {
    bar: '#6B5D52',
    tint: '#F1ECE6',
    ink: '#5A4C42',
    icon: { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' },
  },
};

const FALLBACKS: CategoryLook[] = [
  LOOKS.Comida,
  LOOKS.Movilidad,
  LOOKS.Entretenimiento,
  LOOKS.Banca,
  LOOKS.Otros,
];

const TAG_ICON: SymbolName = { ios: 'tag', android: 'sell', web: 'sell' };

/** Colors and icon for a category; user-made ones cycle the palette with a tag icon. */
export function categoryLook(name: string, id: number): CategoryLook {
  const known = LOOKS[name];
  if (known) return known;
  const base = FALLBACKS[Math.abs(id) % FALLBACKS.length];
  return { ...base, icon: TAG_ICON };
}
