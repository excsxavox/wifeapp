import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BudgetBar } from '@/src/components/BudgetBar';
import type { SavingsGoal } from '@/src/db/types';
import { formatMoney } from '@/src/domain/money';
import { colors } from '@/src/theme/colors';

type Props = {
  goal: SavingsGoal | null;
  currency: string;
  availableThisMonth: number;
  onPress: () => void;
};

export function GoalProgressCard({
  goal,
  currency,
  availableThisMonth,
  onPress,
}: Props) {
  if (!goal) {
    return (
      <Pressable style={styles.emptyCard} onPress={onPress}>
        <Text style={styles.eyebrow}>META DE AHORRO</Text>
        <Text style={styles.emptyTitle}>¿Para qué estás ahorrando?</Text>
        <Text style={styles.emptyBody}>
          Crea una meta como «Viaje» y ve su progreso aquí. El KDA mira tus
          hábitos; la meta te recuerda el para qué.
        </Text>
        <Text style={styles.cta}>Crear meta →</Text>
      </Pressable>
    );
  }

  const percent =
    goal.targetAmount > 0
      ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100)
      : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
  const done = remaining <= 0;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.eyebrow}>META DE AHORRO</Text>
          <Text style={styles.title}>{goal.name}</Text>
        </View>
        <View style={[styles.pill, done && styles.pillDone]}>
          <Text style={[styles.pillText, done && styles.pillDoneText]}>
            {done ? 'Lograda' : `${Math.round(percent)}%`}
          </Text>
        </View>
      </View>

      <View style={styles.amounts}>
        <Text style={styles.saved}>
          {formatMoney(goal.savedAmount, currency)}
        </Text>
        <Text style={styles.target}>
          {' '}
          / {formatMoney(goal.targetAmount, currency)}
        </Text>
      </View>

      <BudgetBar percent={percent} color={goal.color} height={6} />

      <Text style={styles.caption}>
        {done
          ? 'Llegaste a tu meta. Puedes crear otra cuando quieras.'
          : availableThisMonth > 0
            ? `Te quedan ${formatMoney(availableThisMonth, currency)} este mes. Puedes aportarlos a «${goal.name}».`
            : `Faltan ${formatMoney(remaining, currency)} para ${goal.name}.`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#EEF2E6',
    borderWidth: 1,
    borderColor: '#E4EAD9',
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
  },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  eyebrow: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: '#92A17F',
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  emptyTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    letterSpacing: -0.4,
    color: colors.ink,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#82906F',
    marginBottom: 14,
  },
  cta: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  pill: {
    backgroundColor: '#EEF3E7',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pillDone: {
    backgroundColor: colors.lime,
  },
  pillText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 10,
    color: '#63864D',
  },
  pillDoneText: {
    color: colors.primary,
  },
  amounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  saved: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
    letterSpacing: -0.8,
    color: colors.ink,
  },
  target: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#A1A79B',
  },
  caption: {
    marginTop: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    lineHeight: 17,
    color: '#8B9480',
  },
});
