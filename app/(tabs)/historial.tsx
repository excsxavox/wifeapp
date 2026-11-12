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
    <Screen title="Historial" subtitle={periodLabel}>
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
        <Text style={styles.empty}>Aún no hay gastos en este período.</Text>
      ) : (
        filtered.map((expense) => (
          <Pressable
            key={expense.id}
            onLongPress={() => confirmDelete(expense.id)}
            style={styles.item}>
            <View style={styles.itemTop}>
              <View
                style={[styles.dot, { backgroundColor: expense.categoryColor }]}
              />
              <Text style={styles.reason}>{expense.reason}</Text>
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
          </Pressable>
        ))
      )}
      <Text style={styles.hint}>Mantén pulsado un gasto para eliminarlo.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    color: colors.inkMuted,
    marginTop: 12,
  },
  item: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    marginRight: 8,
  },
  reason: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: colors.ink,
  },
  amount: {
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  meta: {
    marginTop: 6,
    marginLeft: 16,
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
