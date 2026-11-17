import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  getGatePermissions,
  isAppGateAvailable,
  openAccessibilitySettings,
} from '@/modules/app-gate';
import { BudgetBar } from '@/src/components/BudgetBar';
import { GoalProgressCard } from '@/src/components/GoalProgressCard';
import { PendingExpensesCard } from '@/src/components/PendingExpensesCard';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { useBudget } from '@/src/context/BudgetContext';
import { companionPhotoUri, moodFromRatio, worstSpentRatio } from '@/src/theme/companions';
import { computeKdaMetrics } from '@/src/domain/kda';
import { formatMoney } from '@/src/domain/money';
import { categoryMeta, colors } from '@/src/theme/colors';

export default function ResumenScreen() {
  const router = useRouter();
  const {
    ready,
    initError,
    statuses,
    expenses,
    watchedApps,
    pendingExpenses,
    categories,
    primaryGoal,
    periodLabel,
    totalBudget,
    totalSpent,
    settings,
    refresh,
  } = useBudget();
  const [refreshing, setRefreshing] = useState(false);
  const [gateReady, setGateReady] = useState(true);
  const kda = useMemo(
    () => computeKdaMetrics(expenses, statuses),
    [expenses, statuses]
  );

  const available = totalBudget - totalSpent;
  const watchedCount = watchedApps.filter((a) => a.enabled).length;

  const checkGate = useCallback(async () => {
    if (Platform.OS !== 'android' || !isAppGateAvailable()) {
      setGateReady(true);
      return;
    }
    const perms = await getGatePermissions();
    setGateReady(perms.accessibilityEnabled);
  }, []);

  useEffect(() => {
    checkGate();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkGate();
    });
    return () => sub.remove();
  }, [checkGate]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (!ready) {
    return (
      <Screen
        title="Tu mes, bajo control."
        subtitle={initError ? 'Error al iniciar' : 'Cargando…'}>
        {initError ? (
          <View>
            <Text style={styles.muted}>{initError}</Text>
            <PrimaryButton
              label="Reintentar"
              onPress={() => {
                refresh().catch(() => undefined);
              }}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : (
          <Text style={styles.muted}>Preparando tu presupuesto…</Text>
        )}
      </Screen>
    );
  }

  const formattedAvailable = formatMoney(
    Math.max(available, 0),
    settings.currency
  );

  return (
    <Screen
      title="Tu mes, bajo control."
      subtitle="Un vistazo a tus gastos. Un respiro para ti."
      refreshing={refreshing}
      onRefresh={onRefresh}
      right={
        <PrimaryButton
          label="+ Registrar"
          onPress={() => router.push('/registrar')}
          style={{ paddingHorizontal: 12, minHeight: 38 }}
        />
      }>
      <Text style={styles.period}>{periodLabel}</Text>

      {!gateReady ? (
        <View style={styles.gateWarn}>
          <Text style={styles.gateWarnTitle}>Portero apagado</Text>
          <Text style={styles.gateWarnBody}>
            Falta Accesibilidad. Sin eso no aparecerá tu compañero al abrir tus apps.
          </Text>
          <PrimaryButton
            label="Activar Accesibilidad ahora"
            onPress={openAccessibilitySettings}
          />
        </View>
      ) : null}

      <PendingExpensesCard
        items={pendingExpenses}
        categories={categories}
        role={settings.companionRole}
        currency={settings.currency}
        photoUri={companionPhotoUri(settings.avatarSource, settings.avatarPhotoUri)}
        mood={moodFromRatio(worstSpentRatio(statuses))}
        onConfirm={(item) =>
          router.push({ pathname: '/gate', params: { pendingId: item.id } })
        }
      />

      <View style={styles.balanceCard}>
        <View style={styles.balanceTop}>
          <Text style={styles.balanceTitle}>Disponible este mes</Text>
          <View style={styles.balanceChip}>
            <Text style={styles.balanceChipText}>
              {available >= 0 ? 'A tu ritmo' : 'Revisa tu plan'}
            </Text>
          </View>
        </View>
        <Text style={styles.balanceAmount}>{formattedAvailable}</Text>
        <Text style={styles.balanceSub}>
          {available >= 0
            ? 'Todavía hay espacio para lo que importa.'
            : 'Es un buen momento para ajustar tus límites.'}
        </Text>
        <View style={styles.balanceBottom}>
          <View>
            <Text style={styles.balanceLabel}>Presupuesto</Text>
            <Text style={styles.balanceValue}>
              {formatMoney(totalBudget, settings.currency)}
            </Text>
          </View>
          <View>
            <Text style={styles.balanceLabel}>Gastado</Text>
            <Text style={styles.balanceValue}>
              {formatMoney(totalSpent, settings.currency)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.gateCard}>
        <View style={styles.gateHeader}>
          <View style={styles.shield}>
            <Text style={styles.shieldGlyph}>▣</Text>
          </View>
          <View
            style={[
              styles.pill,
              gateReady && watchedCount > 0 ? styles.pillOk : styles.pillIdle,
            ]}>
            <Text style={styles.pillText}>
              {gateReady && watchedCount > 0 ? 'Portero listo' : 'En pausa'}
            </Text>
          </View>
        </View>
        <Text style={styles.gateTitle}>
          Una pausa antes{'\n'}de gastar.
        </Text>
        <Text style={styles.gateBody}>
          Tu portero te ayuda a decidir con calma antes de abrir tus apps.
        </Text>
        <Text style={styles.gateApps}>
          {watchedCount} apps bajo tu cuidado
        </Text>
        <PrimaryButton
          label="Ver apps vigiladas"
          variant="secondary"
          onPress={() => router.push('/apps-vigiladas')}
        />
      </View>

      <GoalProgressCard
        goal={primaryGoal}
        currency={settings.currency}
        availableThisMonth={available}
        onPress={() => router.push('/metas' as never)}
      />

      <View style={styles.card}>
        <View style={styles.cardHeading}>
          <Text style={styles.cardTitle}>Por categoría</Text>
          <Pressable onPress={() => router.push('/presupuesto')}>
            <Text style={styles.textButton}>Editar</Text>
          </Pressable>
        </View>
        {statuses.map((status) => {
          const meta = categoryMeta[status.name] ?? {
            color: status.color,
            tint: colors.primarySoft,
          };
          const label = status.overBudget
            ? 'Al límite'
            : status.percent >= 80
              ? 'Con cuidado'
              : 'Bajo control';
          return (
            <View key={status.id} style={styles.catRow}>
              <View style={[styles.catIcon, { backgroundColor: meta.tint }]}>
                <View
                  style={[styles.catDot, { backgroundColor: meta.color }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.catTop}>
                  <Text style={styles.catTitle}>{status.name}</Text>
                  <Text style={styles.catAmount}>
                    <Text style={styles.catAmountBold}>
                      {formatMoney(status.spent, settings.currency)}
                    </Text>
                    {' / '}
                    {formatMoney(status.monthlyLimit, settings.currency)}
                  </Text>
                </View>
                <BudgetBar percent={status.percent} color={meta.color} />
              </View>
              <View style={styles.catRight}>
                <View
                  style={[
                    styles.statusPill,
                    status.overBudget || status.percent >= 80
                      ? styles.statusPillWarn
                      : null,
                  ]}>
                  <Text
                    style={[
                      styles.statusPillText,
                      (status.overBudget || status.percent >= 80) && {
                        color: colors.warning,
                      },
                    ]}>
                    {label}
                  </Text>
                </View>
                <Text style={styles.catStatus}>
                  {Math.round(status.percent)}% utilizado
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <Pressable style={styles.kdaCard} onPress={() => router.push('/metricas')}>
        <View style={styles.cardHeading}>
          <Text style={styles.cardTitle}>Tu constancia cuenta</Text>
          <Text style={styles.textButton}>Ver →</Text>
        </View>
        <Text style={styles.rankTitle}>Rango {kda.tier}</Text>
        <Text style={styles.rankCaption}>Cada decisión suma.</Text>
        <View style={styles.kdaValues}>
          <View style={styles.kdaCol}>
            <Text style={styles.kdaNum}>{kda.kills}</Text>
            <Text style={styles.kdaSmall}>Aciertos</Text>
          </View>
          <View style={[styles.kdaCol, styles.kdaBorder]}>
            <Text style={[styles.kdaNum, { color: colors.warning }]}>
              {kda.deaths}
            </Text>
            <Text style={styles.kdaSmall}>Deslices</Text>
          </View>
          <View style={[styles.kdaCol, styles.kdaBorder]}>
            <Text style={styles.kdaNum}>{kda.assists}</Text>
            <Text style={styles.kdaSmall}>Apoyos</Text>
          </View>
        </View>
        <View style={styles.kdaRatio}>
          <Text style={styles.kdaRatioLabel}>Tu ratio KDA</Text>
          <Text style={styles.kdaRatioValue}>{kda.ratioLabel}</Text>
        </View>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: {
    fontFamily: 'DMSans_400Regular',
    color: colors.inkMuted,
  },
  period: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: colors.inkMuted,
    marginBottom: 14,
  },
  gateWarn: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: '#E7C9A0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  gateWarnTitle: {
    fontFamily: 'DMSans_700Bold',
    color: colors.warning,
    marginBottom: 4,
  },
  gateWarnBody: {
    fontFamily: 'DMSans_400Regular',
    color: colors.ink,
    marginBottom: 10,
    lineHeight: 20,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 25,
    marginBottom: 16,
    overflow: 'hidden',
    minHeight: 240,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceTitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: '#D0DED1',
  },
  balanceChip: {
    borderWidth: 1,
    borderColor: '#FFFFFF2D',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  balanceChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 9,
    color: '#DCE6D9',
  },
  balanceAmount: {
    marginTop: 13,
    fontFamily: 'Manrope_700Bold',
    fontSize: 42,
    letterSpacing: -2,
    color: '#fff',
  },
  balanceSub: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: '#B7CCBD',
  },
  balanceBottom: {
    marginTop: 25,
    paddingTop: 19,
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF24',
    flexDirection: 'row',
    gap: 22,
  },
  balanceLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: '#ADC7B5',
  },
  balanceValue: {
    marginTop: 6,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 18,
    color: '#fff',
  },
  gateCard: {
    backgroundColor: colors.limeSoft,
    borderWidth: 1,
    borderColor: '#E4EAD9',
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
  },
  gateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shield: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#E0E9CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldGlyph: {
    color: '#527143',
    fontSize: 18,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  pillOk: { backgroundColor: '#EEF3E7' },
  pillIdle: { backgroundColor: '#F1F3EE' },
  pillText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 9,
    color: '#63864D',
  },
  gateTitle: {
    marginTop: 16,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 21,
    letterSpacing: -0.6,
    color: colors.ink,
    lineHeight: 28,
  },
  gateBody: {
    marginTop: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    lineHeight: 18,
    color: '#82906F',
  },
  gateApps: {
    marginVertical: 16,
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: '#6D7F5A',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
  },
  cardHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: colors.ink,
  },
  textButton: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: '#70825E',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  catIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  catTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: colors.ink,
  },
  catAmount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: '#A1A79B',
  },
  catAmountBold: {
    fontFamily: 'DMSans_600SemiBold',
    color: '#4D5C4E',
  },
  catRight: {
    minWidth: 64,
    alignItems: 'flex-end',
  },
  statusPill: {
    backgroundColor: '#EEF3E7',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillWarn: {
    backgroundColor: '#FCF2DF',
  },
  statusPillText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 9,
    color: '#63864D',
  },
  catStatus: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 9,
    color: '#9A9F92',
  },
  kdaCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
  },
  rankTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
  },
  rankCaption: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: '#929A8B',
    textAlign: 'center',
  },
  kdaValues: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 14,
  },
  kdaCol: {
    flex: 1,
    alignItems: 'center',
  },
  kdaBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  kdaNum: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 23,
    color: colors.ink,
  },
  kdaSmall: {
    marginTop: 5,
    fontFamily: 'DMSans_400Regular',
    fontSize: 9,
    color: '#8B9382',
  },
  kdaRatio: {
    backgroundColor: '#F8F9F4',
    borderRadius: 9,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kdaRatioLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: '#8B9480',
  },
  kdaRatioValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    color: '#687E4E',
  },
});
