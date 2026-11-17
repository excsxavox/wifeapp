import { Image, StyleSheet, View } from 'react-native';

import type { CompanionRole } from '@/src/db/types';
import {
  getCompanionAvatar,
  MOOD_COLOR,
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
  return (
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
});
