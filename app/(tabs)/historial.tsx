import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryChip } from '@/src/components/CategoryChip';
import { Screen } from '@/src/components/Screen';
import { useBudget } from '@/src/context/BudgetContext';
import { formatMoney } from '@/src/domain/money';
import { colors } from '@/src/theme/colors';

export default function HistorialScreen() {
  const { expenses, categories, settings, removeExpense, periodLabel } =
    useBudget();
  const [filter, setFilter] = useState<number | null>(null);

  const filtered = useMemo(
    () =>
      filter == null ? expenses : expenses.filter((e) => e.categoryId === filter),
    [expenses, filter]
  );

  const totalFiltered = useMemo(
    () => filtered.reduce((sum, item) => sum + item.amount, 0),
    [filtered]
  );

  const confirmDelete = (id: number) => {
    Alert.alert('Eliminar gasto', '¿Seguro que quieres borrarlo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => removeExpense(id),
      },
    ]);
  };

  return (
    <Screen
      title="Historial"
      subtitle={periodLabel}
      brandMinimal
      right={
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{filtered.length}</Text>
        </View>
      }>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total filtrado</Text>
        <Text style={styles.summaryValue}>
          {formatMoney(totalFiltered, settings.currency)}
        </Text>
      </View>

      <View style={styles.chips}>
        <CategoryChip
          label="Todas"
          color={colors.primary}
          selected={filter == null}
          onPress={() => setFilter(null)}
        />
        {categories.map((category) => (
          <CategoryChip
            key={category.id}
            label={category.name}
            color={category.color}
            selected={filter === category.id}
            onPress={() => setFilter(category.id)}
          />
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Sin movimientos aún</Text>
          <Text style={styles.emptyBody}>
            Cuando registres un gasto o el portero capture uno, aparecerá aquí.
          </Text>
        </View>
      ) : (
        filtered.map((expense) => (
          <Pressable
            key={expense.id}
            onLongPress={() => confirmDelete(expense.id)}
            style={styles.item}>
            <View
              style={[
                styles.icon,
                { backgroundColor: `${expense.categoryColor}22` },
              ]}>
              <View
                style={[styles.dot, { backgroundColor: expense.categoryColor }]}
              />
            </View>
            <View style={styles.itemCopy}>
              <View style={styles.itemTop}>
                <Text style={styles.reason} numberOfLines={1}>
                  {expense.reason}
                </Text>
                <Text style={styles.amount}>
                  {formatMoney(expense.amount, settings.currency)}
                </Text>
              </View>
              <Text style={styles.meta}>
                {expense.categoryName}
                {expense.source === 'emergency' ? ' · emergencia' : ''}
                {expense.source === 'gate' ? ' · portero' : ''}
                {' · '}
                {new Date(expense.createdAt).toLocaleString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </Pressable>
        ))
      )}
      <Text style={styles.hint}>Mantén pulsado un gasto para eliminarlo.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    color: colors.primary,
  },
  summary: {
    backgroundColor: '#E7F0D8',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  summaryLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: '#6F7F5F',
  },
  summaryValue: {
    marginTop: 4,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 24,
    color: colors.ink,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  empty: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 18,
    marginTop: 4,
  },
  emptyTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 6,
  },
  emptyBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  itemCopy: {
    flex: 1,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reason: {
    flex: 1,
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: colors.ink,
  },
  amount: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: colors.ink,
  },
  meta: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
  },
  hint: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkFaint,
  },
});
