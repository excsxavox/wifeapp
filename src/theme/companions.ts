import type { ImageSourcePropType } from 'react-native';

import type { CompanionRole } from '@/src/db/types';

export type CompanionMood = 'happy' | 'uneasy' | 'annoyed' | 'angry' | 'furious';
export type AvatarVariant = 'pixel' | 'adult' | 'disney';

export const COMPANION_MOODS: CompanionMood[] = [
  'happy',
  'uneasy',
  'annoyed',
  'angry',
  'furious',
];

const PIXEL: Record<CompanionRole, Record<CompanionMood, ImageSourcePropType>> = {
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

const ADULT: Record<CompanionRole, Record<CompanionMood, ImageSourcePropType>> = {
  esposa: {
    happy: require('../../assets/avatars/girl_adult/emotions/happy.png'),
    uneasy: require('../../assets/avatars/girl_adult/emotions/uneasy.png'),
    annoyed: require('../../assets/avatars/girl_adult/emotions/annoyed.png'),
    angry: require('../../assets/avatars/girl_adult/emotions/angry.png'),
    furious: require('../../assets/avatars/girl_adult/emotions/furious.png'),
  },
  esposo: {
    happy: require('../../assets/avatars/boy_adult/emotions/happy.png'),
    uneasy: require('../../assets/avatars/boy_adult/emotions/uneasy.png'),
    annoyed: require('../../assets/avatars/boy_adult/emotions/annoyed.png'),
    angry: require('../../assets/avatars/boy_adult/emotions/angry.png'),
    furious: require('../../assets/avatars/boy_adult/emotions/furious.png'),
  },
};

/** Pareja del login: solo cara tranquila / molesta. */
const DISNEY_BASE: Record<CompanionRole, { calm: ImageSourcePropType; stern: ImageSourcePropType }> = {
  esposa: {
    calm: require('../../assets/companions/esposa.png'),
    stern: require('../../assets/companions/esposa-molesta.jpg'),
  },
  esposo: {
    calm: require('../../assets/companions/esposo.png'),
    stern: require('../../assets/companions/esposo-molesto.jpg'),
  },
};

function disneyMoodSet(
  role: CompanionRole
): Record<CompanionMood, ImageSourcePropType> {
  const { calm, stern } = DISNEY_BASE[role];
  return {
    happy: calm,
    uneasy: calm,
    annoyed: stern,
    angry: stern,
    furious: stern,
  };
}

const DISNEY: Record<CompanionRole, Record<CompanionMood, ImageSourcePropType>> = {
  esposa: disneyMoodSet('esposa'),
  esposo: disneyMoodSet('esposo'),
};

const AVATARS: Record<
  AvatarVariant,
  Record<CompanionRole, Record<CompanionMood, ImageSourcePropType>>
> = {
  pixel: PIXEL,
  adult: ADULT,
  disney: DISNEY,
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
  happy: '#E89555',
  uneasy: '#C4A35A',
  annoyed: '#BA7544',
  angry: '#BD6655',
  furious: '#A33B32',
};

/** A photo cannot change face, so the mood rides on an emoji. */
export const MOOD_EMOJI: Record<CompanionMood, string> = {
  happy: '😊',
  uneasy: '😟',
  annoyed: '😒',
  angry: '😠',
  furious: '😡',
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

export function avatarVariant(source: string | undefined): AvatarVariant {
  if (source === 'adult') return 'adult';
  if (source === 'disney') return 'disney';
  return 'pixel';
}

export function getCompanionAvatar(
  role: CompanionRole,
  mood: CompanionMood = 'happy',
  variant: AvatarVariant = 'pixel'
): ImageSourcePropType {
  return AVATARS[variant][role][mood];
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
