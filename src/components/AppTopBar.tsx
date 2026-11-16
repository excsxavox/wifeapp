import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { BrandLockup } from '@/src/components/BrandMark';
import { ProfileAvatar } from '@/src/components/ProfileAvatar';
import { colors } from '@/src/theme/colors';

type Props = {
  showCaption?: boolean;
  /** Cabecera del prototipo: solo marca + avatar. */
  minimal?: boolean;
};

export function AppTopBar({ showCaption = true, minimal = false }: Props) {
  const size = minimal ? 42 : 36;

  return (
    <View style={[styles.wrap, minimal && styles.wrapMinimal]}>
      <View style={styles.top}>
        <BrandLockup />
        <View style={styles.right}>
          {!minimal ? (
            <View style={styles.pill}>
              <View style={styles.dot} />
              <Text style={styles.pillText}>Mi espacio</Text>
            </View>
          ) : null}
          <Link href="/perfil" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir mi perfil"
              hitSlop={16}
              style={({ pressed }) => [
                styles.avatarBtn,
                minimal && styles.avatarBtnLarge,
                pressed && styles.avatarBtnPressed,
              ]}>
              <ProfileAvatar size={size} />
            </Pressable>
          </Link>
        </View>
      </View>
      {showCaption && !minimal ? (
        <Text style={styles.caption}>Tu dinero, con intención.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
    zIndex: 20,
    elevation: 20,
  },
  wrapMinimal: {
    marginBottom: 10,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 21,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E1E7D7',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#77965B',
  },
  pillText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: '#79866B',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  avatarBtnLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarBtnPressed: {
    opacity: 0.7,
  },
  caption: {
    marginTop: 6,
    marginLeft: 46,
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: colors.inkMuted,
  },
});
