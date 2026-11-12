import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { useBudget } from '@/src/context/BudgetContext';
import { parseAmount } from '@/src/domain/money';
import { colors } from '@/src/theme/colors';

export default function PresupuestoScreen() {
  const { categories, updateLimit, settings } = useBudget();
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    const next: Record<number, string> = {};
    for (const category of categories) {
      next[category.id] = String(category.monthlyLimit);
    }
    setDrafts(next);
  }, [categories]);

  const save = async (id: number) => {
    const amount = parseAmount(drafts[id] ?? '');
    if (amount == null && drafts[id] !== '0') {
      Alert.alert('Monto inválido', 'Escribe un número válido.');
      return;
    }
    await updateLimit(id, amount ?? 0);
    Alert.alert('Listo', 'Presupuesto actualizado.');
  };

  return (
    <Screen
      title="Presupuesto"
      subtitle={`Límites mensuales por categoría (${settings.currency})`}>
      {categories.map((category) => (
        <View key={category.id} style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: category.color }]} />
            <Text style={styles.name}>{category.name}</Text>
          </View>
          <TextInput
            value={drafts[category.id] ?? ''}
            onChangeText={(text) =>
              setDrafts((prev) => ({ ...prev, [category.id]: text }))
            }
            keyboardType="decimal-pad"
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.inkFaint}
          />
          <PrimaryButton
            label="Guardar"
            variant="secondary"
            onPress={() => save(category.id)}
          />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 10,
    height: 10,
    marginRight: 8,
  },
  name: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: colors.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    color: colors.ink,
    marginBottom: 12,
  },
});
