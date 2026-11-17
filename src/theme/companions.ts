import type { ImageSourcePropType } from 'react-native';

import type { CompanionRole } from '@/src/db/types';

export type CompanionMood = 'happy' | 'uneasy' | 'annoyed' | 'angry' | 'furious';

export const COMPANION_MOODS: CompanionMood[] = [
  'happy',
  'uneasy',
  'annoyed',
  'angry',
  'furious',
];

const AVATARS: Record<CompanionRole, Record<CompanionMood, ImageSourcePropType>> = {
  esposa: {
    happy: require('../../assets/avatars/girl_purple/emotions/happy.png'),
    uneasy: require('../../assets/avatars/girl_purple/emotions/uneasy.png'),
    annoyed: require('../../assets/avatars/girl_purple/emotions/annoyed.png'),
    angry: require('../../assets/avatars/girl_purple/emotions/angry.png'),
    furious: require('../../assets/avatars/girl_purple/emotions/furious.png'),
  },
  esposo: {
    happy: require('../../assets/avatars/boy_navy/emotions/happy.png'),
    uneasy: require('../../assets/avatars/boy_navy/emotions/uneasy.png'),
    annoyed: require('../../assets/avatars/boy_navy/emotions/annoyed.png'),
    angry: require('../../assets/avatars/boy_navy/emotions/angry.png'),
    furious: require('../../assets/avatars/boy_navy/emotions/furious.png'),
  },
};

const LABELS: Record<CompanionRole, Record<CompanionMood, string>> = {
  esposa: {
    happy: 'Tranquila',
    uneasy: 'Atenta',
    annoyed: 'Molesta',
    angry: 'Enojada',
    furious: 'Furiosa',
  },
  esposo: {
    happy: 'Tranquilo',
    uneasy: 'Atento',
    annoyed: 'Molesto',
    angry: 'Enojado',
    furious: 'Furioso',
  },
};

export const MOOD_COLOR: Record<CompanionMood, string> = {
  happy: '#244D3B',
  uneasy: '#C4A35A',
  annoyed: '#BA7544',
  angry: '#BD6655',
  furious: '#A33B32',
};

/** Same steps the floating bubble uses for the face. */
export function moodFromRatio(ratio: number): CompanionMood {
  if (!Number.isFinite(ratio) || ratio < 0.45) return 'happy';
  if (ratio < 0.7) return 'uneasy';
  if (ratio < 0.85) return 'annoyed';
  if (ratio < 1) return 'angry';
  return 'furious';
}

export function worstSpentRatio(
  items: { spent: number; monthlyLimit: number }[]
): number {
  let worst = 0;
  for (const item of items) {
    if (item.monthlyLimit <= 0) continue;
    worst = Math.max(worst, item.spent / item.monthlyLimit);
  }
  return worst;
}

export function getCompanionAvatar(
  role: CompanionRole,
  mood: CompanionMood = 'happy'
): ImageSourcePropType {
  return AVATARS[role][mood];
}

export function moodLabel(role: CompanionRole, mood: CompanionMood): string {
  return LABELS[role][mood];
}

export function companionPhotoUri(
  source: string | undefined,
  uri: string | undefined
): string | null {
  if (source !== 'photo' || !uri) return null;
  return uri;
}

export function getCompanionCopy(
  role: CompanionRole,
  mood: CompanionMood
): { title: string; subtitle: string } {
  const stern = mood === 'annoyed' || mood === 'angry' || mood === 'furious';
  if (stern) {
    return role === 'esposa'
      ? {
          title: mood === 'furious' ? 'Amor… te pasaste.' : 'Amor… ¿cuánto fue al final?',
          subtitle: 'Cuéntame el monto. Sin rodeos.',
        }
      : {
          title: mood === 'furious' ? 'Te pasaste.' : 'Bueno… ¿cuánto salió?',
          subtitle: 'Registra el gasto real, sin inventos.',
        };
  }

  return role === 'esposa'
    ? {
        title: 'Amor, ¿en qué vamos a gastar?',
        subtitle: 'Lo revisamos juntos.',
      }
    : {
        title: '¿En qué vamos a gastar?',
        subtitle: 'Elige la categoría y seguimos.',
      };
}
