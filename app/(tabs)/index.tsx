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
import { SymbolView } from 'expo-symbols';

import {
  isAppGateAvailable,
  openAccessibilitySettings,
  waitForGatePermissions,
} from '@/modules/app-gate';
import { BudgetBar } from '@/src/components/BudgetBar';
import { GoalProgressCard } from '@/src/components/GoalProgressCard';
import { HomeHeroCard } from '@/src/components/HomeHeroCard';
import { PendingExpensesCard } from '@/src/components/PendingExpensesCard';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { RankBadge } from '@/src/components/RankBadge';
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
    totalBudget,
    totalSpent,
    settings,
    rank,
    refresh,
  } = useBudget();
  const [refreshing, setRefreshing] = useState(false);
  const [gateReady, setGateReady] = useState(true);

  const kda = useMemo(
    () => computeKdaMetrics(expenses, statuses, rank),
    [expenses, statuses, rank]
  );

  const available = totalBudget - totalSpent;
  const enabledWatched = watchedApps.filter((a) => a.enabled);
  const watchedCount = enabledWatched.length;
  const role = settings.companionRole ?? 'esposa';

  const rankProgressPercent =
    kda.nextTier && kda.monthsNeeded > 0
      ? Math.min(100, (kda.progressMonths / kda.monthsNeeded) * 100)
      : kda.nextTier
        ? 0
        : 100;

  const checkGate = useCallback(async () => {
    if (Platform.OS !== 'android' || !isAppGateAvailable()) {
      setGateReady(true);
      return;
    }
    const perms = await waitForGatePermissions();
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
        title="Tu mes, bajo control"
        brandMinimal
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

  const monthLabel = formatMonthHeading(new Date());
  const previewCategories = statuses.slice(0, 3);

  return (
    <Screen
      showBrand={false}
      showHeading={false}
      edgeToEdge
      refreshing={refreshing}
      onRefresh={onRefresh}>
      <HomeHeroCard
        available={available}
        currency={settings.currency}
        monthLabel={monthLabel}
        companionRole={role}
        photoUri={companionPhotoUri(settings.avatarSource, settings.avatarPhotoUri)}
        mood={moodFromRatio(worstSpentRatio(statuses))}
        alertCount={gateReady ? 0 : 1}
        onPressAlerts={
          gateReady ? undefined : () => openAccessibilitySettings()
        }
      />

      <View style={styles.homeContent}>
        {!gateReady ? (
          <View style={styles.gateWarn}>
            <Text style={styles.gateWarnTitle}>Portero apagado</Text>
            <Text style={styles.gateWarnBody}>
              Falta Accesibilidad. Sin eso no aparecerá tu compañero al abrir tus
              apps.
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
          photoUri={companionPhotoUri(
            settings.avatarSource,
            settings.avatarPhotoUri
          )}
          mood={moodFromRatio(worstSpentRatio(statuses))}
          onConfirm={(item) =>
            router.push({ pathname: '/gate', params: { pendingId: item.id } })
          }
        />

        <Pressable
          style={styles.porteroCard}
          onPress={() => router.push('/apps-vigiladas')}>
          <SymbolView
            name={{
              ios: 'checkmark.shield',
              android: 'verified_user',
              web: 'verified_user',
            }}
            tintColor="#6F825C"
            size={26}
            style={styles.porteroIcon}
          />
          <View style={styles.porteroCopy}>
            <Text style={styles.porteroTitle}>
              {gateReady && watchedCount > 0
                ? 'Portero activo'
                : 'Portero en pausa'}
            </Text>
            <Text style={styles.porteroBody}>
              {watchedCount} app{watchedCount === 1 ? '' : 's'} protegida
              {watchedCount === 1 ? '' : 's'}
            </Text>
          </View>
          <Text style={styles.porteroChevron}>›</Text>
        </Pressable>

        <GoalProgressCard
          goal={primaryGoal}
          currency={settings.currency}
          availableThisMonth={available}
          onPress={() => router.push('/metas' as never)}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Tus categorías</Text>
            <Pressable onPress={() => router.push('/presupuesto')}>
              <Text style={styles.textButton}>Ver todo</Text>
            </Pressable>
          </View>

          {previewCategories.map((status) => {
            const meta = categoryMeta[status.name] ?? {
              color: status.color,
              tint: colors.primarySoft,
            };
            return (
              <View key={status.id} style={styles.catCard}>
                <View style={styles.catTop}>
                  <View style={[styles.catIcon, { backgroundColor: meta.tint }]}>
                    <View
                      style={[styles.catDot, { backgroundColor: meta.color }]}
                    />
                  </View>
                  <View style={styles.catMain}>
                    <View style={styles.catTitleRow}>
                      <Text style={styles.catTitle}>{status.name}</Text>
                      <Text style={styles.catPercent}>
                        {Math.round(status.percent)}%
                      </Text>
                    </View>
                    <Text style={styles.catAmount}>
                      {formatMoney(status.spent, settings.currency)} de{' '}
                      {formatMoney(status.monthlyLimit, settings.currency)}
                    </Text>
                    <View style={styles.catBar}>
                      <BudgetBar
                        percent={status.percent}
                        color={meta.color}
                        height={8}
                      />
                    </View>
                    <Text style={styles.catRemain}>
                      Te quedan{' '}
                      {formatMoney(
                        Math.max(status.remaining, 0),
                        settings.currency
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <Pressable
          style={styles.rankQuick}
          onPress={() => router.push('/constancia')}>
          <View style={styles.rankQuickTop}>
            <Text style={styles.rankQuickEyebrow}>Tu constancia</Text>
            <Text style={styles.rankQuickLink}>Ver todo ›</Text>
          </View>
          <View style={styles.rankQuickBody}>
            <RankBadge tier={kda.tier} size={56} />
            <View style={styles.rankQuickCopy}>
              <Text style={styles.rankQuickName}>Rango {kda.tier}</Text>
              <Text style={styles.rankQuickHint}>
                {kda.nextTier
                  ? `${kda.progressMonths}/${kda.monthsNeeded} meses hacia ${kda.nextTier}`
                  : 'Nivel máximo alcanzado'}
              </Text>
              <View style={styles.rankQuickBar}>
                <BudgetBar
                  percent={rankProgressPercent}
                  color={colors.primaryMid}
                  height={8}
                />
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    </Screen>
  );
}

function formatMonthHeading(date: Date) {
  const raw = date.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const styles = StyleSheet.create({
  homeContent: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 20,
  },
  muted: {
    fontFamily: 'DMSans_400Regular',
    color: colors.inkMuted,
  },
  gateWarn: {
    width: '100%',
    alignSelf: 'stretch',
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
  porteroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E9E1',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  porteroIcon: {
    width: 28,
    height: 28,
  },
  porteroCopy: {
    flex: 1,
  },
  porteroTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#1F2A24',
  },
  porteroBody: {
    marginTop: 3,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#7A8478',
  },
  porteroChevron: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 22,
    color: '#8B9486',
    marginTop: -2,
  },
  chevron: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 22,
    color: '#A3AD97',
  },
  section: {
    marginBottom: 8,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: colors.ink,
  },
  textButton: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: '#70825E',
  },
  catCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  catTop: {
    flexDirection: 'row',
    gap: 12,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catMain: {
    flex: 1,
  },
  catTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  catTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: colors.ink,
  },
  catPercent: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: colors.inkMuted,
  },
  catAmount: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: '#8B9382',
  },
  catBar: {
    marginTop: 10,
  },
  catRemain: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: '#8B9382',
  },
  rankQuick: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
  },
  rankQuickTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankQuickEyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    color: colors.ink,
  },
  rankQuickLink: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: '#70825E',
  },
  rankQuickBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rankQuickCopy: {
    flex: 1,
  },
  rankQuickName: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: colors.ink,
  },
  rankQuickHint: {
    marginTop: 3,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
  },
  rankQuickBar: {
    marginTop: 10,
  },
});
