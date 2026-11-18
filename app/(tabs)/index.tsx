import { useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  isAppGateAvailable,
  openAccessibilitySettings,
  waitForGatePermissions,
  type PendingExpense,
} from '@/modules/app-gate';
import { AttentionCard, type AttentionItem } from '@/src/components/home/AttentionCard';
import { CategoryList } from '@/src/components/home/CategoryList';
import { MonthCard } from '@/src/components/home/MonthCard';
import { GoalTile, PorteroRow, RankTile } from '@/src/components/home/ProgressTiles';
import { TodayHero } from '@/src/components/home/TodayHero';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { useBudget } from '@/src/context/BudgetContext';
import type { Category } from '@/src/db/types';
import { computeKdaMetrics } from '@/src/domain/kda';
import { formatMoneyShort } from '@/src/domain/money';
import { getPeriodEnd, getPeriodStart } from '@/src/domain/month';
import { computeMonthPace } from '@/src/domain/today';
import { colors } from '@/src/theme/colors';
import { companionPhotoUri, moodFromRatio, worstSpentRatio } from '@/src/theme/companions';
import { categoryLook, home, homeFonts } from '@/src/theme/home';

/** From this width the screen splits into a main column and a side column. */
const WIDE_BREAKPOINT = 900;

export default function ResumenScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
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

  useEffect(() => {
    // Off Android there is no gate to check and gateReady starts true.
    if (Platform.OS !== 'android' || !isAppGateAvailable()) return;
    let alive = true;
    const check = () =>
      waitForGatePermissions().then((perms) => {
        if (alive) setGateReady(perms.accessibilityEnabled);
      });
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

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

  const now = new Date();
  const periodStart = getPeriodStart(now, settings.monthlyResetDay);
  const periodEnd = getPeriodEnd(periodStart, settings.monthlyResetDay);
  const pace = computeMonthPace({ totalBudget, totalSpent, periodStart, periodEnd, now });

  const role = settings.companionRole ?? 'esposa';
  const photoUri = companionPhotoUri(settings.avatarSource, settings.avatarPhotoUri);
  const mood = moodFromRatio(worstSpentRatio(statuses));
  const watchedCount = watchedApps.filter((a) => a.enabled).length;
  const isAndroid = Platform.OS === 'android';
  const monthAtRisk = pace.state !== 'ok';

  const attention: AttentionItem[] = [];
  if (isAndroid && !gateReady) {
    attention.push({
      key: 'gate-off',
      title: 'Portero apagado',
      meta: 'Falta Accesibilidad en el teléfono',
      cta: 'Activar',
      icon: { ios: 'exclamationmark.shield', android: 'gpp_maybe', web: 'gpp_maybe' },
      tint: home.badSoft,
      ink: home.bad,
      onPress: openAccessibilitySettings,
    });
  } else if (isAndroid && watchedCount === 0) {
    attention.push({
      key: 'gate-empty',
      title: 'Portero sin apps',
      meta: 'Elige qué apps debe cuidar',
      cta: 'Elegir',
      icon: { ios: 'shield', android: 'shield', web: 'shield' },
      tint: home.track,
      ink: home.ink,
      onPress: () => router.push('/apps-vigiladas'),
    });
  }
  for (const item of pendingExpenses) {
    attention.push(
      pendingItem(item, categories, settings.currency, () =>
        router.push({ pathname: '/gate', params: { pendingId: item.id } })
      )
    );
  }

  const pendingCount = pendingExpenses.length;
  const quote =
    pendingCount > 0
      ? role === 'esposa'
        ? `«Amor, ${pendingCount === 1 ? '¿y ese gasto?' : `¿y esos ${pendingCount} gastos?`} No se me olvida.»`
        : `«${pendingCount === 1 ? '¿Y ese gasto?' : `¿Y esos ${pendingCount} gastos?`} No se me olvida.»`
      : '«Sin el portero no puedo acompañarte.»';
  const calmDetail = isAndroid
    ? `Sin gastos pendientes · portero cuidando ${watchedCount} app${watchedCount === 1 ? '' : 's'}`
    : 'Sin gastos pendientes';

  const goRegister = () => router.push('/registrar');
  const goPortero = () => router.push('/apps-vigiladas');
  const goBudget = () => router.push('/presupuesto');
  const goGoals = () => router.push('/metas' as never);
  const goRank = () => router.push('/constancia');

  const hero = (
    <TodayHero
      pace={pace}
      currency={settings.currency}
      dateLine={formatDateLine(now)}
      role={role}
      mood={mood}
      photoUri={photoUri}
      alertCount={attention.length}
      onPressBell={attention[0]?.onPress}
      wide={wide}
    />
  );

  const goal = (
    <GoalTile
      goal={primaryGoal}
      currency={settings.currency}
      atRisk={monthAtRisk}
      onPress={goGoals}
    />
  );
  const rankTile = (
    <RankTile
      tier={kda.tier}
      nextTier={kda.nextTier}
      progressMonths={kda.progressMonths}
      monthsNeeded={kda.monthsNeeded}
      atRisk={monthAtRisk}
      onPress={goRank}
    />
  );
  const attentionCard = (
    <AttentionCard items={attention} quote={quote} calmDetail={calmDetail} />
  );

  return (
    <Screen
      showBrand={false}
      showHeading={false}
      edgeToEdge
      refreshing={refreshing}
      onRefresh={onRefresh}
      background={home.bg}>
      {wide ? (
        <View style={styles.wideWrap}>
          <View style={styles.wideMain}>
            {hero}
            <MonthCard
              pace={pace}
              totalBudget={totalBudget}
              totalSpent={totalSpent}
              currency={settings.currency}
              onRegister={goRegister}
              onPortero={goPortero}>
              <CategoryList
                statuses={statuses}
                currency={settings.currency}
                onSeeAll={goBudget}
                columns
                framed={false}
              />
            </MonthCard>
          </View>
          <View style={styles.wideSide}>
            {attentionCard}
            {isAndroid ? (
              <PorteroRow
                active={gateReady && watchedCount > 0}
                watchedCount={watchedCount}
                onPress={goPortero}
              />
            ) : null}
            {goal}
            {rankTile}
          </View>
        </View>
      ) : (
        <View style={styles.stack}>
          <View>
            {hero}
            <MonthCard
              pace={pace}
              totalBudget={totalBudget}
              totalSpent={totalSpent}
              currency={settings.currency}
              onRegister={goRegister}
              onPortero={goPortero}
            />
          </View>
          {attentionCard}
          <CategoryList statuses={statuses} currency={settings.currency} onSeeAll={goBudget} />
          <View style={styles.tiles}>
            {goal}
            {rankTile}
          </View>
        </View>
      )}
    </Screen>
  );
}

function pendingItem(
  item: PendingExpense,
  categories: Category[],
  currency: string,
  onPress: () => void
): AttentionItem {
  const category = categories.find((c) => c.id === item.categoryId);
  const look = categoryLook(category?.name ?? '', category?.id ?? 0);
  const needsPin = item.status === 'reported' && item.amount != null;
  const title =
    item.amount != null ? `${item.label} · ${formatMoneyShort(item.amount, currency)}` : item.label;
  const meta = [
    timeAgo(item.endedAt || item.startedAt),
    needsPin ? 'pasa el límite, pide código' : item.amount == null ? 'falta el monto' : category?.name,
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    key: item.id,
    title,
    meta,
    cta: 'Confirmar',
    icon: look.icon,
    tint: look.tint,
    ink: look.ink,
    onPress,
  };
}

function timeAgo(at: number): string {
  const minutes = Math.max(1, Math.round((Date.now() - at) / 60000));
  if (minutes < 60) return `Hace ${minutes} min`;
  if (minutes < 60 * 24) return `Hace ${Math.round(minutes / 60)} h`;
  return `Hace ${Math.round(minutes / (60 * 24))} días`;
}

/** "Martes 17 · Noviembre 2026" */
function formatDateLine(date: Date): string {
  const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' });
  const month = date.toLocaleDateString('es-ES', { month: 'long' });
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return `${cap(weekday)} ${date.getDate()} · ${cap(month)} ${date.getFullYear()}`;
}

const styles = StyleSheet.create({
  homeContent: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 20,
  },
  muted: {
    fontFamily: homeFonts.body,
    color: colors.inkMuted,
  },
  stack: {
    gap: 14,
  },
  tiles: {
    flexDirection: 'row',
    gap: 12,
  },
  wideWrap: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  wideMain: {
    flex: 2,
    minWidth: 0,
  },
  wideSide: {
    flex: 1,
    minWidth: 280,
    gap: 14,
    paddingTop: 72,
  },
});
