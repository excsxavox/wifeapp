import { Image, View } from 'react-native';

import { useBudget } from '@/src/context/BudgetContext';
import type { CompanionRole } from '@/src/db/types';
import {
  avatarVariant,
  getCompanionAvatar,
  MOOD_INK,
  type CompanionMood,
} from '@/src/theme/companions';

type Props = {
  role: CompanionRole;
  mood: CompanionMood;
  photoUri?: string | null;
  /** Width of the illustration. */
  size: number;
};

/**
 * The companion with no frame, meant to sit on the top edge of the card below.
 * Every avatar PNG ends in a flat cut ~96% down; clipping at 94% hides it, so
 * the bust looks like it continues behind that card.
 */
export function CompanionPeek({ role, mood, photoUri, size }: Props) {
  const { settings } = useBudget();

  if (photoUri) {
    // A photo has a background of its own, so it gets a plain circle.
    const d = Math.round(size * 0.78);
    return (
      <View
        style={{
          width: d,
          height: d,
          borderRadius: d / 2,
          overflow: 'hidden',
          borderWidth: 3,
          borderColor: MOOD_INK[mood],
          marginBottom: 10,
        }}>
        <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: Math.round(size * 0.94), overflow: 'hidden' }}>
      <Image
        source={getCompanionAvatar(role, mood, avatarVariant(settings.avatarSource))}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel="Tu compañera"
      />
    </View>
  );
}
