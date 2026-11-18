import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors } from '@/src/theme/colors';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'lime' | 'subtle' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: Props) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'lime' && styles.lime,
        variant === 'subtle' && styles.subtle,
        variant === 'danger' && styles.danger,
        variant === 'ghost' && styles.ghost,
        (pressed || disabled) && { opacity: 0.72 },
        style,
      ]}>
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.labelOnPrimary,
          (variant === 'secondary' ||
            variant === 'ghost' ||
            variant === 'lime' ||
            variant === 'subtle') &&
            styles.labelDark,
          variant === 'lime' && { color: colors.ink },
          variant === 'subtle' && { color: colors.ink },
          variant === 'danger' && { color: colors.danger },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 42,
    paddingVertical: 12,
    paddingHorizontal: 17,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  lime: {
    backgroundColor: colors.lime,
  },
  subtle: {
    backgroundColor: colors.accentSoft,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: '#fff',
  },
  labelOnPrimary: {
    color: colors.ink,
  },
  labelDark: {
    color: colors.text,
  },
});

