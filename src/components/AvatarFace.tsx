import { Image, StyleSheet, Text, View } from 'react-native';

import type { CompanionRole } from '@/src/db/types';
import {
  getCompanionAvatar,
  MOOD_COLOR,
  MOOD_EMOJI,
  type CompanionMood,
} from '@/src/theme/companions';

type Props = {
  role: CompanionRole;
  mood?: CompanionMood;
  photoUri?: string | null;
  size?: number;
};

export function AvatarFace({ role, mood = 'happy', photoUri, size = 72 }: Props) {
  const ring = MOOD_COLOR[mood];
  const badge = Math.max(18, Math.round(size * 0.38));
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ring,
          },
        ]}>
        <Image
          source={photoUri ? { uri: photoUri } : getCompanionAvatar(role, mood)}
          style={styles.image}
        />
      </View>
      {photoUri ? (
        <View
          style={[
            styles.badge,
            {
              width: badge,
              height: badge,
              borderRadius: badge / 2,
            },
          ]}>
          <Text style={{ fontSize: Math.round(badge * 0.62) }}>{MOOD_EMOJI[mood]}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: '#F4E7D8',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EAD9',
  },
});
