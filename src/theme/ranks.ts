import type { ImageSourcePropType } from 'react-native';

import type { KdaTier } from '@/src/domain/kda';

export const rankBadges: Record<KdaTier, ImageSourcePropType> = {
  Hierro: require('../../assets/ranks/hierro.png'),
  Bronce: require('../../assets/ranks/bronce.png'),
  Plata: require('../../assets/ranks/plata.png'),
  Oro: require('../../assets/ranks/oro.png'),
  Platino: require('../../assets/ranks/platino.png'),
  Diamante: require('../../assets/ranks/diamante.png'),
};

export function getRankBadge(tier: KdaTier): ImageSourcePropType {
  return rankBadges[tier];
}
