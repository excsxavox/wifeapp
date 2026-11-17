import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

import type { KdaTier } from '@/src/domain/kda';
import { getRankBadge } from '@/src/theme/ranks';

type Props = {
  tier: KdaTier;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function RankBadge({ tier, size = 72, style }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image
        source={getRankBadge(tier)}
        style={[styles.image, { width: size, height: size }, style]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: 'transparent',
  },
});
