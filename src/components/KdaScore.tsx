import { StyleSheet, Text, View } from 'react-native';

import { RankBadge } from '@/src/components/RankBadge';
import type { KdaTier } from '@/src/domain/kda';
import { colors } from '@/src/theme/colors';

type Props = {
  kills: number;
  deaths: number;
  assists: number;
  ratioLabel: string;
  tier: KdaTier;
  hint: string;
};

export function KdaScore({
  kills,
  deaths,
  assists,
  ratioLabel,
  tier,
  hint,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>TU RANGO DEL MES</Text>

      <View style={styles.rankRow}>
        <RankBadge tier={tier} size={110} />
        <View style={styles.rankCopy}>
          <Text style={styles.tier}>Rango {tier}</Text>
          <Text style={styles.ratio}>{ratioLabel}</Text>
          <Text style={styles.ratioCaption}>Ratio KDA · (K + A) / D</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Stat letter="K" value={kills} caption="Aciertos" color={colors.success} />
        <Stat letter="D" value={deaths} caption="Deslices" color="#BA7544" />
        <Stat letter="A" value={assists} caption="Apoyos" color={colors.accent} />
      </View>

      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

function Stat({
  letter,
  value,
  caption,
  color,
}: {
  letter: string;
  value: number;
  caption: string;
  color: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.letter, { color }]}>{letter}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
  },
  eyebrow: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: '#92A17F',
    marginBottom: 14,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  rankCopy: {
    flex: 1,
  },
  tier: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  ratio: {
    marginTop: 4,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 36,
    color: colors.ink,
    letterSpacing: -1.2,
  },
  ratioCaption: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkFaint,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  letter: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
  },
  value: {
    marginTop: 4,
    fontFamily: 'Manrope_700Bold',
    fontSize: 26,
    color: colors.ink,
  },
  caption: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.inkMuted,
  },
  hint: {
    marginTop: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
  },
});
