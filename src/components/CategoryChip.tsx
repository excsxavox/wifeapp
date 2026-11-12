import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/src/theme/colors';

type Props = {
  label: string;
  color: string;
  selected?: boolean;
  onPress?: () => void;
};

export function CategoryChip({ label, color, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected && {
          backgroundColor: '#EDF3E5',
          borderColor: '#8FA779',
        },
      ]}>
      <Text style={[styles.text, selected && { color: colors.primary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E5E9DF',
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  text: {
    color: colors.text,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
  },
});
