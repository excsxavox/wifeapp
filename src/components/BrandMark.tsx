import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: size * 0.31,
        },
      ]}>
      <Text style={[styles.glyph, { fontSize: size * 0.48 }]}>W</Text>
    </View>
  );
}

export function BrandLockup() {
  return (
    <View style={styles.lockup}>
      <BrandMark />
      <Text style={styles.name}>
        wifeapp<Text style={styles.dot}>.</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    color: colors.ink,
    fontWeight: '700',
  },
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 24,
    letterSpacing: -1.1,
    color: colors.ink,
  },
  dot: {
    color: colors.primaryMid,
  },
});

