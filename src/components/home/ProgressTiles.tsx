import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { RankBadge } from '@/src/components/RankBadge';
import type { SavingsGoal } from '@/src/db/types';
import type { KdaTier } from '@/src/domain/kda';
import { formatMoneyShort } from '@/src/domain/money';
import { home, homeFonts } from '@/src/theme/home';

export function GoalTile({
  goal,
  currency,
  atRisk,
  onPress,
}: {
  goal: SavingsGoal | null;
  currency: string;
  /** No money left over this month, so nothing will go to the goal. */
  atRisk: boolean;
  onPress: () => void;
}) {
  if (!goal) {
    return (
      <Pressable onPress={onPress} style={styles.tile} accessibilityRole="button">
        <Text style={styles.eyebrow}>Meta de ahorro</Text>
        <Text style={styles.big}>¿Para qué ahorras?</Text>
        <Text style={styles.link}>Crear meta ›</Text>
      </Pressable>
    );
  }
  const pct =
    goal.targetAmount > 0 ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100)) : 0;
  return (
    <Pressable onPress={onPress} style={styles.tile} accessibilityRole="button">
      <Text style={styles.eyebrow} numberOfLines={1}>
        Meta · {goal.name}
      </Text>
      <Text style={styles.bigNumber}>{pct}%</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={[styles.small, atRisk && styles.warn]}>
        {atRisk
          ? 'Este mes no hay sobrante'
          : `${formatMoneyShort(goal.savedAmount, currency)} de ${formatMoneyShort(goal.targetAmount, currency)}`}
      </Text>
    </Pressable>
  );
}

export function RankTile({
  tier,
  nextTier,
  progressMonths,
  monthsNeeded,
  atRisk,
  onPress,
}: {
  tier: KdaTier;
  nextTier: KdaTier | null;
  progressMonths: number;
  monthsNeeded: number;
  atRisk: boolean;
  onPress: () => void;
}) {
  const steps = nextTier ? Math.max(1, monthsNeeded) : 0;
  return (
    <Pressable onPress={onPress} style={styles.tile} accessibilityRole="button">
      <Text style={styles.eyebrow}>Tu constancia</Text>
      <View style={styles.rankRow}>
        <RankBadge tier={tier} size={30} />
        <Text style={styles.rankName}>{tier}</Text>
      </View>
      {steps > 0 ? (
        <View style={styles.steps}>
          {Array.from({ length: steps }, (_, i) => (
            <View key={i} style={[styles.step, i < progressMonths && styles.stepOn]} />
          ))}
        </View>
      ) : null}
      <Text style={[styles.small, atRisk && styles.warn]}>
        {atRisk
          ? 'Este mes está en riesgo'
          : nextTier
            ? `${progressMonths} de ${monthsNeeded} meses hacia ${nextTier}`
            : 'Nivel máximo alcanzado'}
      </Text>
    </Pressable>
  );
}

export function PorteroRow({
  active,
  watchedCount,
  onPress,
}: {
  active: boolean;
  watchedCount: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tile, styles.porteroRow]} accessibilityRole="button">
      <View style={styles.porteroIcon}>
        <SymbolView
          name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }}
          tintColor={home.ink}
          size={20}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.porteroTitle}>{active ? 'Portero activo' : 'Portero en pausa'}</Text>
        <Text style={styles.small}>
          Cuidando {watchedCount} app{watchedCount === 1 ? '' : 's'}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: home.surface,
    borderWidth: 1,
    borderColor: home.line,
    borderRadius: 22,
    padding: 16,
    gap: 8,
  },
  eyebrow: {
    fontFamily: homeFonts.semibold,
    fontSize: 12,
    color: home.muted,
  },
  big: {
    fontFamily: homeFonts.heading,
    fontSize: 24,
    color: home.ink,
  },
  bigNumber: {
    fontFamily: homeFonts.number,
    fontSize: 24,
    letterSpacing: -0.5,
    color: home.ink,
  },
  link: {
    fontFamily: homeFonts.semibold,
    fontSize: 13,
    color: home.orangeInk,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: home.track,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: home.ink,
  },
  small: {
    fontFamily: homeFonts.body,
    fontSize: 12,
    color: home.muted,
  },
  warn: {
    color: home.warnInk,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankName: {
    fontFamily: homeFonts.heading,
    fontSize: 20,
    color: home.ink,
  },
  steps: {
    flexDirection: 'row',
    gap: 4,
  },
  step: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: home.track,
  },
  stepOn: {
    backgroundColor: home.ink,
  },
  porteroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  porteroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: home.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  porteroTitle: {
    fontFamily: homeFonts.bold,
    fontSize: 15,
    color: home.ink,
  },
  chevron: {
    fontFamily: homeFonts.body,
    fontSize: 20,
    color: home.muted,
  },
});
