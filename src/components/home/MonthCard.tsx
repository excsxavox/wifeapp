import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { formatMoneyShort } from '@/src/domain/money';
import type { MonthPace } from '@/src/domain/today';
import { home, homeFonts } from '@/src/theme/home';

type Props = {
  pace: MonthPace;
  totalBudget: number;
  totalSpent: number;
  currency: string;
  onRegister: () => void;
  onPortero: () => void;
  /** Extra section under the buttons (categories on wide screens). */
  children?: ReactNode;
};

const STATE_COPY = {
  ok: { label: 'Vas a tu ritmo', color: home.green, bar: home.orange },
  fast: { label: 'Vas rápido', color: home.warnInk, bar: home.warnBar },
  over: { label: 'Te pasaste', color: home.bad, bar: home.bad },
} as const;

/** Month at a glance: what is left, spent vs. calendar, and the two main actions. */
export function MonthCard({
  pace,
  totalBudget,
  totalSpent,
  currency,
  onRegister,
  onPortero,
  children,
}: Props) {
  const state = STATE_COPY[pace.state];
  const spentPct = Math.round(pace.spentRatio * 100);
  const barWidth = `${Math.min(100, Math.max(0, spentPct))}%` as const;
  const markerLeft = `${Math.round(pace.timeRatio * 100)}%` as const;

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.muted}>Disponible del mes</Text>
        <Text style={[styles.state, { color: state.color }]}>{state.label}</Text>
      </View>
      <Text style={styles.available}>
        {formatMoneyShort(pace.available, currency)}
        <Text style={styles.of}>  de {formatMoneyShort(totalBudget, currency)}</Text>
      </Text>

      <View
        accessible
        accessibilityLabel={`Has gastado el ${spentPct}% del presupuesto y va el día ${pace.dayIndex} de ${pace.totalDays}`}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: barWidth, backgroundColor: state.bar }]} />
          <View style={[styles.marker, { left: markerLeft }]} />
        </View>
        <View style={styles.legend}>
          <Text style={styles.small}>
            Gastado {formatMoneyShort(totalSpent, currency)} · {spentPct}%
          </Text>
          <Text style={styles.small}>
            Día {pace.dayIndex} de {pace.totalDays}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onRegister}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          accessibilityRole="button">
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor={home.ink} size={16} />
          <Text style={styles.primaryText} numberOfLines={1}>
            Registrar gasto
          </Text>
        </Pressable>
        <Pressable
          onPress={onPortero}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          accessibilityRole="button">
          <SymbolView
            name={{ ios: 'shield', android: 'shield', web: 'shield' }}
            tintColor={home.ink}
            size={16}
          />
          <Text style={styles.secondaryText} numberOfLines={1}>
            Portero
          </Text>
        </Pressable>
      </View>

      {children ? <View style={styles.extra}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: home.surface,
    borderWidth: 1,
    borderColor: home.line,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  muted: {
    fontFamily: homeFonts.body,
    fontSize: 14,
    color: home.muted,
  },
  state: {
    fontFamily: homeFonts.bold,
    fontSize: 13,
  },
  available: {
    fontFamily: homeFonts.number,
    fontSize: 28,
    letterSpacing: -0.6,
    color: home.ink,
  },
  of: {
    fontFamily: homeFonts.numberBold,
    fontSize: 14,
    letterSpacing: 0,
    color: home.muted,
  },
  track: {
    height: 12,
    borderRadius: 6,
    backgroundColor: home.track,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 6,
  },
  marker: {
    position: 'absolute',
    top: -5,
    width: 3,
    height: 22,
    marginLeft: -1,
    borderRadius: 2,
    backgroundColor: home.ink,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  small: {
    fontFamily: homeFonts.body,
    fontSize: 12,
    color: home.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  // The main action takes more room than the secondary one, so its label
  // stays on one line on narrow phones.
  primary: {
    flex: 1.4,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: home.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryText: {
    flexShrink: 1,
    fontFamily: homeFonts.bold,
    fontSize: 14,
    color: home.ink,
  },
  secondary: {
    flex: 1,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: home.track,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryText: {
    flexShrink: 1,
    fontFamily: homeFonts.semibold,
    fontSize: 14,
    color: home.ink,
  },
  pressed: {
    opacity: 0.8,
  },
  extra: {
    borderTopWidth: 1,
    borderTopColor: home.track,
    paddingTop: 16,
  },
});
