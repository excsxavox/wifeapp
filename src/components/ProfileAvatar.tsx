import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { AvatarFace } from '@/src/components/AvatarFace';
import { useBudget } from '@/src/context/BudgetContext';
import { colors } from '@/src/theme/colors';
import {
  companionPhotoUri,
  moodFromRatio,
  worstSpentRatio,
} from '@/src/theme/companions';

type Props = {
  size?: number;
};

/** Cabecera de perfil. Con foto, muestra esa imagen y el emoji del gasto. */
export function ProfileAvatar({ size = 42 }: Props) {
  const { settings, statuses } = useBudget();
  const photoUri = companionPhotoUri(settings.avatarSource, settings.avatarPhotoUri);
  const mood = moodFromRatio(worstSpentRatio(statuses));
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.35);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.35, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [glow, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: glow.value,
  }));

  const head = Math.round(size * 0.22);
  const bodyW = Math.round(size * 0.42);
  const bodyH = Math.round(size * 0.28);

  if (photoUri) {
    return (
      <View pointerEvents="none">
        <AvatarFace
          role={settings.companionRole}
          mood={mood}
          photoUri={photoUri}
          size={size}
        />
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          ringStyle,
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.face,
          {
            width: size - 4,
            height: size - 4,
            borderRadius: (size - 4) / 2,
          },
        ]}>
        <View
          style={[
            styles.head,
            {
              width: head,
              height: head,
              borderRadius: head / 2,
              marginBottom: Math.round(size * 0.04),
            },
          ]}
        />
        <View
          style={[
            styles.body,
            {
              width: bodyW,
              height: bodyH,
              borderTopLeftRadius: bodyW / 2,
              borderTopRightRadius: bodyW / 2,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    backgroundColor: '#D9EDAB',
  },
  face: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  head: {
    backgroundColor: '#E7F0D8',
  },
  body: {
    backgroundColor: '#E7F0D8',
  },
});
