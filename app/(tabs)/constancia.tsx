import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BudgetBar } from '@/src/components/BudgetBar';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { RankBadge } from '@/src/components/RankBadge';
import { RankLadder } from '@/src/components/RankLadder';
import { Screen } from '@/src/components/Screen';
import { useBudget } from '@/src/context/BudgetContext';
import { GOOD_MONTH_MIN_RATIO, computeKdaMetrics } from '@/src/domain/kda';
import { computeExpenseStreak } from '@/src/domain/streak';
import { getCompanionAvatar } from '@/src/theme/companions';
import { colors } from '@/src/theme/colors';

export default function ConstanciaScreen() {
  const router = useRouter();
  const {
    ready,
    expenses,
    statuses,
    savingsGoals,
    settings,
    rank,
    refresh,
  } = useBudget();
  const [refreshing, setRefreshing] = useState(false);
  const [showLadder, setShowLadder] = useState(false);

  const kda = useMemo(
    () => computeKdaMetrics(expenses, statuses, rank),
    [expenses, statuses, rank]
  );
  const streakDays = useMemo(
    () => computeExpenseStreak(expenses),
    [expenses]
  );
  const goalsDone = useMemo(
    () =>
      savingsGoals.filter((goal) => goal.savedAmount >= goal.targetAmount)
        .length,
    [savingsGoals]
  );

  const role = settings.companionRole ?? 'esposa';
  const rankProgressPercent =
    kda.nextTier && kda.monthsNeeded > 0
      ? Math.min(100, (kda.progressMonths / kda.monthsNeeded) * 100)
      : kda.nextTier
        ? 0
        : 100;

  const recordedToday = expenses.some((e) => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return e.createdAt.slice(0, 10) === key;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (!ready) {
    return (
      <Screen
        title="Tu constancia cuenta"
        subtitle="Cargando…"
        brandMinimal>
        <Text style={styles.muted}>Preparando tu racha…</Text>
      </Screen>
    );
  }

  return (
    <Screen
      title="Tu constancia cuenta"
      subtitle="Cada pequeño hábito suma"
      brandMinimal
      refreshing={refreshing}
      onRefresh={onRefresh}>
      <View style={styles.rankCard}>
        <View style={styles.rankHeader}>
          <RankBadge tier={kda.tier} size={72} />
          <View style={styles.rankCopy}>
            <Text style={styles.rankName}>Rango {kda.tier}</Text>
            <Text style={styles.rankHint}>
              {kda.monthQualifies
                ? 'Este mes va bien: al cerrarlo suma constancia.'
                : kda.hasActivity
                  ? `Necesitas ratio ≥ ${GOOD_MONTH_MIN_RATIO.toFixed(1)} este mes.`
                  : 'Empiezas en Hierro. Registra gastos con intención.'}
            </Text>
          </View>
        </View>

        <View style={styles.rankBar}>
          <BudgetBar
            percent={rankProgressPercent}
            color={colors.primaryMid}
            height={10}
          />
        </View>
        <View style={styles.rankMeta}>
          <Text style={styles.rankMetaLeft}>
            {kda.progressMonths} mes{kda.progressMonths === 1 ? '' : 'es'}
          </Text>
          <Text style={styles.rankMetaRight}>
            {kda.nextTier
              ? `${kda.monthsNeeded} para ${kda.nextTier}`
              : 'Nivel máximo'}
          </Text>
        </View>
      </View>

      <View style={styles.streakBanner}>
        <Image
          source={getCompanionAvatar(role, 'happy')}
          style={styles.streakAvatar}
          resizeMode="cover"
        />
        <Text style={styles.streakText}>
          {streakDays > 0
            ? `¡Llevas ${streakDays} día${streakDays === 1 ? '' : 's'} registrando tus gastos!`
            : 'Registra hoy y empieza tu racha.'}
        </Text>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🔥</Text>
          <Text style={styles.statValue}>{streakDays}</Text>
          <Text style={styles.statLabel}>Días de racha</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>☰</Text>
          <Text style={styles.statValue}>{expenses.length}</Text>
          <Text style={styles.statLabel}>Registros</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⚑</Text>
          <Text style={styles.statValue}>{goalsDone}</Text>
          <Text style={styles.statLabel}>Metas cumplidas</Text>
        </View>
      </View>

      <View style={styles.nextCard}>
        <View style={styles.nextTop}>
          <Text style={styles.nextEyebrow}>Tu siguiente paso</Text>
          <View style={styles.nextBadge}>
            <Text style={styles.nextBadgeText}>
              {recordedToday ? 'Hecho hoy' : '+1 día de racha'}
            </Text>
          </View>
        </View>
        <Text style={styles.nextTitle}>
          {recordedToday
            ? 'Ya registraste algo hoy. Sigue así.'
            : 'Registra tus gastos de hoy'}
        </Text>
        <PrimaryButton
          label={recordedToday ? 'Ver historial' : 'Registrar gasto'}
          onPress={() =>
            router.push(recordedToday ? '/historial' : '/registrar')
          }
        />
      </View>

      <Pressable
        style={styles.howLink}
        onPress={() => setShowLadder((open) => !open)}>
        <View style={styles.howIcon}>
          <Text style={styles.howIconText}>i</Text>
        </View>
        <Text style={styles.howText}>¿Cómo funcionan los rangos?</Text>
        <Text style={styles.chevron}>{showLadder ? '˄' : '›'}</Text>
      </Pressable>

      {showLadder ? (
        <View style={styles.ladderWrap}>
          <RankLadder
            currentTier={kda.tier}
            progressMonths={kda.progressMonths}
          />
          <Pressable onPress={() => router.push('/metricas')}>
            <Text style={styles.metricsLink}>Ver métricas KDA del mes →</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: {
    fontFamily: 'DMSans_400Regular',
    color: colors.inkMuted,
  },
  rankCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  rankCopy: {
    flex: 1,
  },
  rankName: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  rankHint: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkMuted,
  },
  rankBar: {
    marginBottom: 8,
  },
  rankMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rankMetaLeft: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.ink,
  },
  rankMetaRight: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E7F0D8',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  streakAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  streakText: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 16,
    marginBottom: 6,
  },
  statValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 20,
    color: colors.ink,
  },
  statLabel: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  nextCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  nextTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextEyebrow: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    color: colors.inkMuted,
    letterSpacing: 0.3,
  },
  nextBadge: {
    backgroundColor: '#E7F0D8',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  nextBadgeText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: '#5F7A4A',
  },
  nextTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    color: colors.ink,
    marginBottom: 14,
  },
  howLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  howIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howIconText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: colors.inkMuted,
  },
  howText: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: colors.ink,
  },
  chevron: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 22,
    color: '#A3AD97',
  },
  ladderWrap: {
    marginTop: 4,
  },
  metricsLink: {
    marginTop: -6,
    marginBottom: 12,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: colors.primaryMid,
  },
});
