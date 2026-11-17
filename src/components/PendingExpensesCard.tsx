import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PendingExpense } from '@/modules/app-gate';
import { AvatarFace } from '@/src/components/AvatarFace';
import type { Category, CompanionRole } from '@/src/db/types';
import { formatMoney } from '@/src/domain/money';
import { colors } from '@/src/theme/colors';
import type { CompanionMood } from '@/src/theme/companions';

type Props = {
  items: PendingExpense[];
  categories: Category[];
  role: CompanionRole;
  currency: string;
  photoUri?: string | null;
  mood?: CompanionMood;
  onConfirm: (item: PendingExpense) => void;
};

function timeAgo(at: number): string {
  const minutes = Math.max(1, Math.round((Date.now() - at) / 60000));
  if (minutes < 60) return `hace ${minutes} min`;
  if (minutes < 60 * 24) return `hace ${Math.round(minutes / 60)} h`;
  return `hace ${Math.round(minutes / (60 * 24))} días`;
}

/** Visits to watched apps whose expense is still waiting to be confirmed. */
export function PendingExpensesCard({
  items,
  categories,
  role,
  currency,
  photoUri,
  mood = 'annoyed',
  onConfirm,
}: Props) {
  if (items.length === 0) return null;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AvatarFace role={role} mood={mood} photoUri={photoUri} size={48} />
        <View style={styles.bubble}>
          <Text style={styles.title}>
            {items.length === 1
              ? 'Tienes un gasto por confirmar'
              : `Tienes ${items.length} gastos por confirmar`}
          </Text>
          <Text style={styles.subtitle}>
            {role === 'esposa'
              ? 'Amor, no se me olvida. ¿De qué fueron?'
              : 'No se me olvida. ¿De qué fueron?'}
          </Text>
        </View>
      </View>
      {items.map((item) => {
        const category = categories.find((c) => c.id === item.categoryId);
        const needsPin = item.status === 'reported' && item.amount != null;
        return (
          <Pressable
            key={item.id}
            onPress={() => onConfirm(item)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.label}</Text>
              <Text style={styles.rowMeta}>
                {timeAgo(item.endedAt || item.startedAt)}
                {category ? ` · ${category.name}` : ''}
                {needsPin && item.amount != null
                  ? ` · ${formatMoney(item.amount, currency)} · requiere código`
                  : ''}
              </Text>
            </View>
            <Text style={styles.cta}>Confirmar ›</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: '#EBD9C4',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  bubble: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: colors.primary,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  rowTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: colors.ink,
  },
  rowMeta: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.inkMuted,
  },
  cta: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    color: colors.primary,
  },
});
