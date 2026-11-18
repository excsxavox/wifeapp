import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { AvatarFace } from '@/src/components/AvatarFace';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import type { CompanionRole } from '@/src/db/types';
import { useBudget } from '@/src/context/BudgetContext';
import { formatMoney } from '@/src/domain/money';
import type { CompanionMood } from '@/src/theme/companions';
import { colors } from '@/src/theme/colors';

const HERO = '#FFB27A';
const HERO_INK = '#3A2A1F';
const HERO_INK_SOFT = 'rgba(58, 42, 31, 0.72)';

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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const { statuses, categories, watchedApps, totalSpent } = useBudget();
  const heaviest = heaviestCategory(statuses);
  const watchedCount = watchedApps.filter((app) => app.enabled).length;
  const amount = formatHeroAmount(Math.abs(available));

  return (
    <View style={styles.card}>
      <View style={[styles.top, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <View style={styles.topBar}>
          <Text style={styles.brand}>WifeApp</Text>
          <Text style={styles.month}>{monthLabel}</Text>
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
            <Text style={styles.availableLabel}>Disponible este mes</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amount}>
                {available < 0 ? '−' : ''}
                {amount}
              </Text>
              <Text style={styles.currency}>{currency.toUpperCase()}</Text>
            </View>
            <Text style={styles.phrase}>
              {paceLine(heaviest?.name, heaviest?.percent ?? 0, mood)}
            </Text>
            <View style={styles.actions}>
              <PrimaryButton
                label="Registrar un gasto"
                onPress={() => router.push('/registrar')}
                style={styles.action}
              />
              <PrimaryButton
                label="Ver el portero"
                variant="secondary"
                onPress={() => router.push('/apps-vigiladas')}
                style={styles.action}
              />
            </View>
          </View>
          {wide ? (
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>{bubbleLine(mood)}</Text>
            </View>
          ) : null}
          <View style={[styles.portrait, wide && styles.portraitWide]}>
            <AvatarFace
              role={companionRole}
              mood={mood}
              photoUri={photoUri}
              size={wide ? 140 : 112}
              bare
            />
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatMoney(totalSpent, currency)}</Text>
          <Text style={styles.statLabel}>Gastado</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{categories.length}</Text>
          <Text style={styles.statLabel}>Categorías</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{watchedCount}</Text>
          <Text style={styles.statLabel}>Apps vigiladas</Text>
        </View>
      </View>
    </View>
  );
}

function heaviestCategory(
  statuses: { name: string; spent: number; monthlyLimit: number; percent: number }[]
) {
  return statuses.reduce<(typeof statuses)[number] | null>((best, item) => {
    if (!best) return item;
    return item.percent >= best.percent ? item : best;
  }, null);
}

function paceLine(name: string | undefined, percent: number, mood: CompanionMood) {
  if (!name) {
    return 'Cuando armes el presupuesto, aquí verás cómo va el mes.';
  }
  const pct = Math.round(percent);
  if (mood === 'furious' || mood === 'angry') {
    return `${name} va al ${pct}%. Conviene frenar antes de seguir.`;
  }
  if (mood === 'annoyed' || mood === 'uneasy') {
    return `${name} va al ${pct}%. Todavía se puede bajar el ritmo.`;
  }
  return `${name} va al ${pct}%. Todavía hay margen si el resto del mes se queda así.`;
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
    backgroundColor: colors.surface,
  },
  top: {
    backgroundColor: HERO,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  brand: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: HERO_INK,
    letterSpacing: -0.3,
  },
  month: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: HERO_INK_SOFT,
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
    gap: 10,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  availableLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: HERO_INK,
  },
  amountRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
  },
  amount: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1,
    color: HERO_INK,
  },
  currency: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: HERO_INK_SOFT,
    marginBottom: 4,
  },
  phrase: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: HERO_INK,
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  action: {
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  portrait: {
    marginRight: 6,
    marginBottom: -16,
  },
  portraitWide: {
    marginRight: 56,
    marginTop: -44,
  },
  bubble: {
    alignSelf: 'center',
    maxWidth: 210,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bubbleText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
    color: HERO_INK,
  },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 14,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: colors.ink,
    textAlign: 'center',
  },
  statLabel: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});
