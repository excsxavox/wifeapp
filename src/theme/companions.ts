import type { ImageSourcePropType } from 'react-native';

import type { CompanionRole } from '@/src/db/types';

export type CompanionMood = 'friendly' | 'annoyed';

const AVATARS: Record<
  CompanionRole,
  Record<CompanionMood, ImageSourcePropType>
> = {
  esposa: {
    friendly: require('../../assets/companions/esposa.png'),
    annoyed: require('../../assets/companions/esposa-molesta.jpg'),
  },
  esposo: {
    friendly: require('../../assets/companions/esposo.png'),
    annoyed: require('../../assets/companions/esposo-molesto.jpg'),
  },
};

export function getCompanionAvatar(
  role: CompanionRole,
  mood: CompanionMood = 'friendly'
): ImageSourcePropType {
  return AVATARS[role][mood];
}

export function getCompanionCopy(
  role: CompanionRole,
  mood: CompanionMood
): { title: string; subtitle: string } {
  if (mood === 'annoyed') {
    return role === 'esposa'
      ? {
          title: 'Amor… ¿cuánto fue al final?',
          subtitle: 'Cuéntame el monto. Sin rodeos.',
        }
      : {
          title: 'Bueno… ¿cuánto salió?',
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
