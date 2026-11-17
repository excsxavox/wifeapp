import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { CompanionPeek } from '@/src/components/home/CompanionPeek';
import type { CompanionRole } from '@/src/db/types';
import { moneyParts } from '@/src/domain/money';
import type { MonthPace } from '@/src/domain/today';
import type { CompanionMood } from '@/src/theme/companions';
import { home, homeFonts } from '@/src/theme/home';

type Props = {
  pace: MonthPace;
  currency: string;
  dateLine: string;
  role: CompanionRole;
  mood: CompanionMood;
  photoUri?: string | null;
  alertCount: number;
  onPressBell?: () => void;
  wide: boolean;
};

/** Greeting, today's allowance in big type and the companion leaning on the month card. */
export function TodayHero({
  pace,
  currency,
  dateLine,
  role,
  mood,
  photoUri,
  alertCount,
  onPressBell,
  wide,
}: Props) {
  const money = moneyParts(pace.dailyAllowance, currency);
  const noMargin = pace.available <= 0;

  return (
    <View>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.date}>{dateLine}</Text>
          <Text style={styles.hello}>Hola, amor</Text>
        </View>
        <Pressable
          onPress={onPressBell}
          style={styles.bell}
          accessibilityRole="button"
          accessibilityLabel={
            alertCount > 0 ? `Avisos, ${alertCount} sin resolver` : 'Avisos'
          }>
          <SymbolView
            name={{ ios: 'bell', android: 'notifications_none', web: 'notifications_none' }}
            tintColor={home.ink}
            size={20}
          />
          {alertCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{alertCount > 9 ? '9+' : alertCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={[styles.label, wide && styles.labelWide]}>
            {noMargin ? 'Hoy no queda margen' : 'Hoy puedes gastar'}
          </Text>
          <Text style={[styles.amount, wide && styles.amountWide]}>
            {money.symbol}
            {money.whole}
            <Text style={[styles.cents, wide && styles.centsWide]}>,{money.cents}</Text>
          </Text>
          <Text style={styles.hint}>
            {noMargin
              ? 'El presupuesto del mes ya se usó'
              : pace.state === 'fast'
                ? `para no pasarte en ${daysText(pace.daysLeft)}`
                : `y seguir dentro del plan ${daysText(pace.daysLeft)}`}
          </Text>
        </View>
        <View style={styles.companion}>
          {wide ? (
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>{bubbleLine(mood)}</Text>
            </View>
          ) : null}
          <CompanionPeek role={role} mood={mood} photoUri={photoUri} size={wide ? 180 : 140} />
        </View>
      </View>
    </View>
  );
}

function daysText(days: number): string {
  return days === 1 ? 'hoy, el último día' : `los próximos ${days} días`;
}

function bubbleLine(mood: CompanionMood): string {
  switch (mood) {
    case 'uneasy':
      return 'Vamos bien, pero ojo con el ritmo.';
    case 'annoyed':
      return 'Amor, bajemos un poquito el ritmo.';
    case 'angry':
      return 'Ya casi no queda margen. Pensémoslo.';
    case 'furious':
      return 'Nos pasamos. Hablemos de esto.';
    default:
      return 'Vamos bien, amor. Sigue así.';
  }
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
  },
  date: {
    fontFamily: homeFonts.body,
    fontSize: 13,
    color: home.muted,
  },
  hello: {
    fontFamily: homeFonts.heading,
    fontSize: 18,
    color: home.ink,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: home.line,
    backgroundColor: home.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: home.bad,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: homeFonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 18,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 18,
  },
  label: {
    fontFamily: homeFonts.semibold,
    fontSize: 15,
    color: home.muted,
  },
  labelWide: {
    fontSize: 16,
  },
  amount: {
    marginTop: 2,
    fontFamily: homeFonts.number,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1.5,
    color: home.ink,
  },
  amountWide: {
    fontSize: 68,
    lineHeight: 76,
    letterSpacing: -2,
  },
  cents: {
    fontFamily: homeFonts.numberBold,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  centsWide: {
    fontSize: 36,
  },
  hint: {
    marginTop: 2,
    fontFamily: homeFonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: home.muted,
  },
  companion: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  bubble: {
    marginBottom: 60,
    maxWidth: 190,
    backgroundColor: home.surface,
    borderWidth: 1,
    borderColor: home.line,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bubbleText: {
    fontFamily: homeFonts.semibold,
    fontSize: 14,
    lineHeight: 19,
    color: home.ink,
  },
});
