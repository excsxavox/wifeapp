import { Image, StyleSheet, Text, View } from 'react-native';

import type { CompanionRole } from '@/src/db/types';
import { useBudget } from '@/src/context/BudgetContext';
import {
  avatarVariant,
  getCompanionAvatar,
  MOOD_DISC,
  MOOD_INK,
  moodLabel,
  type AvatarVariant,
  type CompanionMood,
} from '@/src/theme/companions';

type Props = {
  role: CompanionRole;
  mood?: CompanionMood;
  photoUri?: string | null;
  variant?: AvatarVariant;
  /** Diameter of the circle. The head pops out above it. */
  size?: number;
  /** Mood pill under the circle. */
  showLabel?: boolean;
  /**
   * No circle: just the companion, cut flat at the bottom so it can sit on an
   * edge (the bust's cut line stays below that edge). Photos keep the circle.
   */
  bare?: boolean;
};

/**
 * Companion inside a mood-colored circle. The illustration is drawn larger
 * than the circle and pushed down, so the head sticks out of the top while the
 * flat bottom edge of the bust stays hidden behind the round bottom.
 *
 * Every avatar PNG has the same framing (head ~3% from the top, bust cut ~96%
 * down), which the constants below are tuned for.
 */
export function AvatarFace({
  role,
  mood = 'happy',
  photoUri,
  variant,
  size = 72,
  showLabel = false,
  bare = false,
}: Props) {
  const { settings } = useBudget();
  const style = variant ?? avatarVariant(settings.avatarSource);
  const ink = MOOD_INK[mood];
  const disc = MOOD_DISC[mood];

  const diameter = size;
  const boxHeight = Math.round(diameter * 1.214);
  const imageSize = Math.round(diameter * 1.314);
  const imageLeft = -Math.round((imageSize - diameter) / 2);
  const imageTop = Math.round(boxHeight - imageSize * 0.959 + diameter * 0.086);
  const ringWidth = Math.max(2, Math.round(diameter * 0.028));

  return (
    <View style={{ width: diameter, alignItems: 'center' }}>
      {photoUri ? (
        // A real photo has no transparent background, so it is a plain circle.
        <View style={{ width: diameter, height: boxHeight, justifyContent: 'flex-end' }}>
          <View
            style={[
              styles.photoCircle,
              {
                width: diameter,
                height: diameter,
                borderRadius: diameter / 2,
                borderWidth: ringWidth,
                borderColor: ink,
                backgroundColor: disc,
              },
            ]}>
            <Image source={{ uri: photoUri }} style={styles.fill} resizeMode="cover" />
          </View>
        </View>
      ) : (
        <View
          style={{
            width: diameter,
            height: boxHeight,
            overflow: 'hidden',
            borderBottomLeftRadius: bare ? 0 : diameter / 2,
            borderBottomRightRadius: bare ? 0 : diameter / 2,
          }}>
          {bare ? null : (
            <View
              style={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                width: diameter,
                height: diameter,
                borderRadius: diameter / 2,
                backgroundColor: disc,
                borderWidth: ringWidth,
                borderColor: ink,
              }}
            />
          )}
          <Image
            source={getCompanionAvatar(role, mood, style)}
            style={{
              position: 'absolute',
              left: imageLeft,
              top: imageTop,
              width: imageSize,
              height: imageSize,
            }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
      )}
      {showLabel ? (
        <View style={[styles.pill, { backgroundColor: ink }]}>
          <Text style={styles.pillText} numberOfLines={1}>
            {moodLabel(role, mood)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  photoCircle: {
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  pill: {
    marginTop: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
