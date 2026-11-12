import { StyleSheet, Text, View } from 'react-native';

import type { KdaTier } from '@/src/domain/kda';
import { colors } from '@/src/theme/colors';

const tierColor: Record<KdaTier, string> = {
  Hierro: '#6B7280',
  Bronce: '#A15C12',
  Plata: '#5A6B62',
  Oro: '#B8860B',
  Platino: '#2A6F97',
  Diamante: '#1B4D3E',
};

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
      <Text style={styles.eyebrow}>Rendimiento del período</Text>
      <Text style={[styles.tier, { color: tierColor[tier] }]}>{tier}</Text>
      <Text style={styles.ratio}>{ratioLabel}</Text>
      <Text style={styles.ratioCaption}>KDA ratio</Text>

      <View style={styles.row}>
        <Stat letter="K" value={kills} caption="Aciertos" color={colors.success} />
        <Stat letter="D" value={deaths} caption="Deslices" color={colors.danger} />
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
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.inkMuted,
  },
  tier: {
    marginTop: 6,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  ratio: {
    marginTop: 4,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 48,
    color: colors.ink,
    letterSpacing: -1.5,
  },
  ratioCaption: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.inkFaint,
    marginBottom: 16,
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
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
  },
});
