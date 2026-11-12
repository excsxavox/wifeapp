import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { KdaScore } from '@/src/components/KdaScore';
import {
  CategoryMetricBars,
  DailyMetricBars,
} from '@/src/components/MetricBars';
import { Screen } from '@/src/components/Screen';
import { useBudget } from '@/src/context/BudgetContext';
import { computeKdaMetrics } from '@/src/domain/kda';
import { formatMoney } from '@/src/domain/money';
import { colors } from '@/src/theme/colors';

export default function MetricasScreen() {
  const {
    ready,
    expenses,
    statuses,
    periodLabel,
    settings,
    refresh,
  } = useBudget();
  const [refreshing, setRefreshing] = useState(false);

  const kda = useMemo(
    () => computeKdaMetrics(expenses, statuses),
    [expenses, statuses]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (!ready) {
    return (
      <Screen title="Métricas KDA" subtitle="Cargando…">
        <Text style={styles.muted}>Calculando tu rendimiento…</Text>
      </Screen>
    );
  }

  return (
    <Screen
      title="Métricas KDA"
      subtitle={periodLabel}
      refreshing={refreshing}
      onRefresh={onRefresh}>
      <KdaScore
        kills={kda.kills}
        deaths={kda.deaths}
        assists={kda.assists}
        ratioLabel={kda.ratioLabel}
        tier={kda.tier}
        hint={kda.tierHint}
      />

      <View style={styles.legendCard}>
        <Text style={styles.legendTitle}>Cómo se calcula</Text>
        <Text style={styles.legendLine}>
          <Text style={styles.k}>K · Aciertos</Text> — gastos dentro del
          presupuesto (manual o portero)
        </Text>
        <Text style={styles.legendLine}>
          <Text style={styles.d}>D · Deslices</Text> — gastos con código de
          emergencia
        </Text>
        <Text style={styles.legendLine}>
          <Text style={styles.a}>A · Apoyos</Text> — categorías bajo control +
          días sin emergencias
        </Text>
        <Text style={styles.formula}>
          Ratio = (K + A) / D
        </Text>
      </View>

      <View style={styles.split}>
        <View style={styles.splitItem}>
          <Text style={styles.splitLabel}>Disciplinado</Text>
          <Text style={styles.splitValue}>
            {formatMoney(kda.disciplinedAmount, settings.currency)}
          </Text>
        </View>
        <View style={styles.splitItem}>
          <Text style={styles.splitLabel}>Emergencias</Text>
          <Text style={[styles.splitValue, { color: colors.danger }]}>
            {formatMoney(kda.emergencyAmount, settings.currency)}
          </Text>
        </View>
      </View>

      <View style={styles.split}>
        <View style={styles.splitItem}>
          <Text style={styles.splitLabel}>Categorías OK</Text>
          <Text style={styles.splitValue}>{kda.categoriesSafe}</Text>
        </View>
        <View style={styles.splitItem}>
          <Text style={styles.splitLabel}>Categorías pasadas</Text>
          <Text
            style={[
              styles.splitValue,
              kda.categoriesOver > 0 && { color: colors.danger },
            ]}>
            {kda.categoriesOver}
          </Text>
        </View>
      </View>

      <CategoryMetricBars rows={kda.byCategory} currency={settings.currency} />
      <DailyMetricBars rows={kda.byDay} currency={settings.currency} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: {
    fontFamily: 'DMSans_400Regular',
    color: colors.inkMuted,
  },
  legendCard: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  legendTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: colors.ink,
    marginBottom: 8,
  },
  legendLine: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 19,
    marginBottom: 4,
  },
  k: { color: colors.success, fontFamily: 'DMSans_700Bold' },
  d: { color: colors.danger, fontFamily: 'DMSans_700Bold' },
  a: { color: colors.accent, fontFamily: 'DMSans_700Bold' },
  formula: {
    marginTop: 8,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.ink,
  },
  split: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  splitItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  splitLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.inkMuted,
  },
  splitValue: {
    marginTop: 4,
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    color: colors.ink,
  },
});
