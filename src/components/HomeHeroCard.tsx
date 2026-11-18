import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { AvatarFace } from '@/src/components/AvatarFace';
import type { CompanionRole } from '@/src/db/types';
import { useBudget } from '@/src/context/BudgetContext';
import {
  avatarVariant,
  getCompanionAvatar,
  type CompanionMood,
} from '@/src/theme/companions';
import { colors } from '@/src/theme/colors';

type Props = {
  available: number;
  currency: string;
  monthLabel: string;
  companionRole: CompanionRole;
  photoUri?: string | null;
  mood?: CompanionMood;
  alertCount?: number;
  onPressAlerts?: () => void;
};

export function HomeHeroCard({
  available,
  currency,
  monthLabel,
  companionRole,
  photoUri,
  mood = 'happy',
  alertCount = 0,
  onPressAlerts,
}: Props) {
  const insets = useSafeAreaInsets();
  const { settings } = useBudget();
  const variant = avatarVariant(settings.avatarSource);
  const amount = formatHeroAmount(Math.max(available, 0));

  return (
    <View style={styles.card}>
      <View style={[styles.top, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
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
              tintColor={colors.ink}
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

        <View style={styles.heroCopy}>
          <Text style={styles.headline}>Tu dinero,{'\n'}a tu ritmo.</Text>
          <Text style={styles.month}>{monthLabel}</Text>
        </View>

        <View style={styles.companionWrap} pointerEvents="none">
          {photoUri || variant === 'adult' ? (
            <AvatarFace
              role={companionRole}
              mood={mood}
              photoUri={photoUri}
              variant={variant}
              size={128}
            />
          ) : (
            <Image
              source={getCompanionAvatar(companionRole, mood, variant)}
              style={styles.companion}
              resizeMode="cover"
            />
          )}
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
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: 16,
    backgroundColor: colors.primary,
  },
  top: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 52,
    minHeight: 220,
    position: 'relative',
    overflow: 'hidden',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    zIndex: 2,
  },
  brand: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: colors.ink,
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
  heroCopy: {
    width: '62%',
    maxWidth: 220,
    paddingBottom: 8,
    zIndex: 2,
  },
  headline: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.9,
    color: colors.ink,
  },
  month: {
    marginTop: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: 'rgba(58, 42, 31, 0.72)',
  },
  companionWrap: {
    position: 'absolute',
    right: 8,
    bottom: 28,
    zIndex: 1,
  },
  companion: {
    width: 148,
    height: 168,
  },
  bottom: {
    width: '100%',
    marginTop: -36,
    zIndex: 4,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
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
    flexWrap: 'wrap',
    gap: 8,
  },
  amount: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -1.4,
    color: colors.ink,
  },
  currency: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: 8,
    letterSpacing: 0.4,
  },
});
