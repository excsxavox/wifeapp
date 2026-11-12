import { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors } from '@/src/theme/colors';

type Props = TextInputProps & {
  label: string;
  hint?: string;
  right?: ReactNode;
};

export function Field({ label, hint, right, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          placeholderTextColor="#A5AE9C"
          style={[styles.input, style]}
          {...rest}
        />
        {right}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#FCFDF9',
    borderWidth: 1,
    borderColor: '#DFE5D8',
    borderRadius: 10,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.ink,
  },
  hint: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: '#919B85',
    lineHeight: 16,
  },
});
