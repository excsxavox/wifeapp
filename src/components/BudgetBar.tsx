import { StyleSheet, View } from 'react-native';

import { colors } from '@/src/theme/colors';

type Props = {
  percent: number;
  color: string;
  height?: number;
};

export function BudgetBar({ percent, color, height = 5 }: Props) {
  const width = Math.max(0, Math.min(100, percent));
  const over = percent > 100;
  return (
    <View style={[styles.track, { height, borderRadius: height }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${width}%`,
            backgroundColor: over ? '#C58B6C' : color,
            height,
            borderRadius: height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: '#F0F1EC',
    overflow: 'hidden',
  },
  fill: {
    minWidth: 0,
  },
});
