import { StyleSheet, Text, View } from 'react-native';

import { BudgetBar } from '@/src/components/BudgetBar';
import { formatMoney } from '@/src/domain/money';
import { colors } from '@/src/theme/colors';

type CategoryRow = {
  id: number;
  name: string;
  color: string;
  spent: number;
  limit: number;
  percent: number;
  overBudget: boolean;
};

type DayRow = {
  day: string;
  label: string;
  disciplined: number;
  emergency: number;
  total: number;
};

export function CategoryMetricBars({
  rows,
  currency,
}: {
  rows: CategoryRow[];
  currency: string;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.title}>Uso por categoría</Text>
      {rows.map((row) => (
        <View key={row.id} style={styles.item}>
          <View style={styles.itemTop}>
            <Text style={styles.name}>{row.name}</Text>
            <Text
              style={[
                styles.amount,
                row.overBudget && { color: colors.danger },
              ]}>
              {formatMoney(row.spent, currency)}
              <Text style={styles.limit}>
                {' '}
                / {formatMoney(row.limit, currency)}
              </Text>
            </Text>
          </View>
          <BudgetBar percent={row.percent} color={row.color} height={8} />
        </View>
      ))}
    </View>
  );
}

export function DailyMetricBars({
  rows,
  currency,
}: {
  rows: DayRow[];
  currency: string;
}) {
  if (rows.length === 0) {
    return (
      <View style={styles.block}>
        <Text style={styles.title}>Gasto diario</Text>
        <Text style={styles.empty}>Aún no hay movimientos este período.</Text>
      </View>
    );
  }

  const max = Math.max(...rows.map((r) => r.total), 1);

  return (
    <View style={styles.block}>
      <Text style={styles.title}>Gasto diario</Text>
      <View style={styles.chart}>
        {rows.slice(-10).map((row) => {
          const height = Math.max(6, Math.round((row.total / max) * 96));
          const emergencyShare =
            row.total > 0 ? row.emergency / row.total : 0;
          return (
            <View key={row.day} style={styles.col}>
              <View style={[styles.barTrack, { height: 96 }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height,
                      backgroundColor:
                        emergencyShare > 0.35 ? colors.danger : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.dayLabel}>{row.label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.legend}>
        Últimos días · rojo si hubo mucha emergencia (
        {formatMoney(
          rows.reduce((s, r) => s + r.emergency, 0),
          currency
        )}{' '}
        en emergencias)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: colors.ink,
    marginBottom: 12,
  },
  item: {
    marginBottom: 12,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  name: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: colors.ink,
  },
  amount: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: colors.ink,
  },
  limit: {
    fontFamily: 'DMSans_400Regular',
    color: colors.inkFaint,
    fontWeight: '400',
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    color: colors.inkMuted,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
    minHeight: 120,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: colors.bgElevated,
  },
  barFill: {
    width: '100%',
  },
  dayLabel: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 9,
    color: colors.inkFaint,
    textAlign: 'center',
  },
  legend: {
    marginTop: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 18,
  },
});
