import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import type { CompanionRole } from '@/src/db/types';
import { getCompanionAvatar } from '@/src/theme/companions';
import { colors } from '@/src/theme/colors';

const HERO = '#FFB27A';
const HERO_INK = '#3A2A1F';
const HERO_INK_SOFT = 'rgba(58, 42, 31, 0.72)';

type Props = {
  available: number;
  currency: string;
  monthLabel: string;
  companionRole: CompanionRole;
  alertCount?: number;
  onPressAlerts?: () => void;
};

export function HomeHeroCard({
  available,
  currency,
  monthLabel,
  companionRole,
  alertCount = 0,
  onPressAlerts,
}: Props) {
  const amount = formatHeroAmount(Math.max(available, 0));

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.topBar}>
          <Text style={styles.brand}>WifeApp</Text>
          <Pressable
            onPress={onPressAlerts}
            hitSlop={10}
            style={styles.bellBtn}
            accessibilityRole="button"
            accessibilityLabel="Avisos">
            <SymbolView
              name={{
                ios: 'bell',
                android: 'notifications_none',
                web: 'notifications_none',
              }}
              tintColor={HERO_INK}
              size={22}
            />
            {alertCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {alertCount > 9 ? '9+' : String(alertCount)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.headline}>Tu dinero,{'\n'}a tu ritmo.</Text>
            <Text style={styles.month}>{monthLabel}</Text>
          </View>
          <Image
            source={getCompanionAvatar(companionRole, 'happy')}
            style={styles.companion}
            resizeMode="cover"
          />
        </View>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.availableLabel}>Disponible este mes</Text>
        <View style={styles.amountRow}>
          <Text style={styles.amount}>${amount}</Text>
          <Text style={styles.currency}>{currency.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
}

function formatHeroAmount(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#F0E4D8',
  },
  top: {
    backgroundColor: HERO,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    minHeight: 188,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  brand: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: HERO_INK,
    letterSpacing: -0.3,
  },
  bellBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 9,
    color: '#FFFFFF',
    lineHeight: 11,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  heroCopy: {
    flex: 1,
    paddingBottom: 18,
  },
  headline: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.9,
    color: HERO_INK,
  },
  month: {
    marginTop: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: HERO_INK_SOFT,
  },
  companion: {
    width: 132,
    height: 152,
    marginBottom: -4,
    marginRight: -4,
  },
  bottom: {
    backgroundColor: '#FBFCF8',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
  },
  availableLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.ink,
  },
  amountRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  amount: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -1.4,
    color: HERO_INK,
  },
  currency: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: 8,
    letterSpacing: 0.4,
  },
});
