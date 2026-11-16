import { StyleSheet, Text, View } from 'react-native';

import { RankBadge } from '@/src/components/RankBadge';
import {
  GOOD_MONTH_MIN_RATIO,
  KDA_TIERS,
  type KdaTier,
} from '@/src/domain/kda';
import { colors } from '@/src/theme/colors';

type Props = {
  currentTier: KdaTier;
  progressMonths?: number;
};

export function RankLadder({ currentTier, progressMonths = 0 }: Props) {
  const currentIndex = KDA_TIERS.findIndex((entry) => entry.tier === currentTier);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Niveles</Text>
      <Text style={styles.subtitle}>
        Empiezas en Hierro. Cada mes con buen KDA (ratio ≥{' '}
        {GOOD_MONTH_MIN_RATIO.toFixed(1)}) suma constancia. Cuanto más alto el
        nivel, más meses seguidos necesitas.
      </Text>

      {KDA_TIERS.map((entry, index) => {
        const active = entry.tier === currentTier;
        const unlocked = index <= currentIndex;
        const requirement =
          entry.monthsToEarn <= 0
            ? 'Inicio'
            : `${entry.monthsToEarn} mes${entry.monthsToEarn === 1 ? '' : 'es'} bueno${entry.monthsToEarn === 1 ? '' : 's'} seguidos`;
        const progressLabel =
          active && entry.tier !== 'Diamante' && index < KDA_TIERS.length - 1
            ? ` · ${progressMonths}/${KDA_TIERS[index + 1].monthsToEarn}`
            : '';

        return (
          <View
            key={entry.tier}
            style={[styles.row, active && styles.rowActive]}>
            <RankBadge tier={entry.tier} size={40} />
            <View style={styles.copy}>
              <Text style={[styles.name, !unlocked && styles.locked]}>
                {entry.tier}
                {active ? ' · actual' : ''}
                {progressLabel}
              </Text>
              <Text style={styles.requirement}>{requirement}</Text>
            </View>
            <Text style={[styles.mark, active && styles.markActive]}>
              {active ? '●' : unlocked ? '○' : '·'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  rowActive: {
    backgroundColor: colors.bgElevated,
  },
  copy: {
    flex: 1,
  },
  name: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    color: colors.ink,
  },
  locked: {
    color: colors.inkFaint,
  },
  requirement: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
  },
  mark: {
    fontSize: 14,
    color: colors.inkFaint,
  },
  markActive: {
    color: colors.accent,
  },
});
