import { Image, StyleSheet, Text, View } from 'react-native';

import type { CompanionRole } from '@/src/db/types';
import {
  getCompanionAvatar,
  getCompanionCopy,
  type CompanionMood,
} from '@/src/theme/companions';
import { colors } from '@/src/theme/colors';

type Props = {
  role: CompanionRole;
  mood?: CompanionMood;
  title?: string;
  subtitle?: string;
};

export function CompanionPrompt({
  role,
  mood = 'friendly',
  title,
  subtitle,
}: Props) {
  const copy = getCompanionCopy(role, mood);
  return (
    <View style={[styles.wrap, mood === 'annoyed' && styles.wrapAnnoyed]}>
      <Image
        source={getCompanionAvatar(role, mood)}
        style={styles.avatar}
        resizeMode="cover"
      />
      <View style={styles.bubble}>
        <Text style={styles.title}>{title ?? copy.title}</Text>
        <Text style={styles.subtitle}>{subtitle ?? copy.subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: '#EEF2E6',
    borderWidth: 1,
    borderColor: '#E4EAD9',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  wrapAnnoyed: {
    backgroundColor: '#F8F1E8',
    borderColor: '#EBD9C4',
  },
  avatar: {
    width: 78,
    height: 92,
    borderRadius: 14,
    backgroundColor: '#111',
  },
  bubble: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderBottomLeftRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    letterSpacing: -0.3,
    color: colors.primary,
    lineHeight: 20,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 17,
  },
});
