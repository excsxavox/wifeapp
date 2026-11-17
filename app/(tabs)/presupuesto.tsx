import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BudgetBar } from '@/src/components/BudgetBar';
import { Field } from '@/src/components/Field';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { useBudget } from '@/src/context/BudgetContext';
import { formatMoney, parseAmount } from '@/src/domain/money';
import { categoryMeta, categoryPalette, colors } from '@/src/theme/colors';

export default function PresupuestoScreen() {
  const {
    categories,
    statuses,
    updateLimit,
    addCategory,
    removeCategory,
    settings,
    totalBudget,
    totalSpent,
  } = useBudget();
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [newName, setNewName] = useState('');
  const [newLimit, setNewLimit] = useState('100');
  const [newColor, setNewColor] = useState<string>(categoryPalette[4]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const next: Record<number, string> = {};
    for (const category of categories) {
      next[category.id] = String(category.monthlyLimit);
    }
    setDrafts(next);
  }, [categories]);

  const available = totalBudget - totalSpent;
  const monthLabel = useMemo(() => {
    const raw = new Date().toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, []);

  const saveAll = async () => {
    setBusy(true);
    try {
      for (const category of categories) {
        const amount = parseAmount(drafts[category.id] ?? '');
        if (amount == null && drafts[category.id] !== '0') {
          Alert.alert(
            'Monto inválido',
            `Revisa el límite de «${category.name}».`
          );
          return;
        }
        await updateLimit(category.id, amount ?? 0);
      }
      setEditing(false);
      Alert.alert('Listo', 'Presupuesto actualizado.');
    } finally {
      setBusy(false);
    }
  };

  const createCategory = async () => {
    const amount = parseAmount(newLimit);
    if (!newName.trim()) {
      Alert.alert('Nombre requerido', 'Ejemplo: Salud, Mascotas, Regalos…');
      return;
    }
    if (amount == null || amount < 0) {
      Alert.alert('Límite inválido', 'Escribe un monto mensual válido.');
      return;
    }
    setBusy(true);
    try {
      await addCategory({
        name: newName.trim(),
        monthlyLimit: amount,
        color: newColor,
      });
      setNewName('');
      setNewLimit('100');
      setNewColor(categoryPalette[categories.length % categoryPalette.length]);
      setCreating(false);
      Alert.alert('Categoría creada', `«${newName.trim()}» ya está en tu plan.`);
    } catch (error) {
      Alert.alert(
        'No se pudo crear',
        error instanceof Error ? error.message : 'Intenta de nuevo'
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (id: number, name: string) => {
    Alert.alert(
      'Eliminar categoría',
      `¿Borrar «${name}»? También se borrarán sus gastos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeCategory(id);
            } catch (error) {
              Alert.alert(
                'No se pudo eliminar',
                error instanceof Error ? error.message : 'Intenta de nuevo'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <Screen
      title="Presupuestos"
      brandMinimal
      right={
        <Pressable
          style={styles.editBtn}
          onPress={() => setEditing((value) => !value)}>
          <Text style={styles.editBtnText}>{editing ? 'Ver' : '✎'}</Text>
        </Pressable>
      }>
      <View style={styles.periodPill}>
        <Text style={styles.periodChevron}>‹</Text>
        <Text style={styles.periodText}>{monthLabel}</Text>
        <Text style={styles.periodChevron}>›</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Presupuesto mensual</Text>
          <Text style={styles.summaryValue}>
            {formatMoney(totalBudget, settings.currency)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Te quedan</Text>
          <Text style={styles.summaryValue}>
            {formatMoney(Math.max(available, 0), settings.currency)}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Por categoría</Text>
        <Pressable onPress={() => setCreating((open) => !open)}>
          <Text style={styles.addLink}>
            {creating ? 'Cancelar' : '+ Nueva'}
          </Text>
        </Pressable>
      </View>

      {creating ? (
        <View style={styles.createCard}>
          <Text style={styles.createTitle}>Nueva categoría</Text>
          <Field
            label="Nombre"
            value={newName}
            onChangeText={setNewName}
            placeholder="Salud, Mascotas, Regalos…"
          />
          <Field
            label={`Límite mensual (${settings.currency})`}
            value={newLimit}
            onChangeText={setNewLimit}
            keyboardType="decimal-pad"
            placeholder="100"
          />
          <Text style={styles.colorLabel}>Color</Text>
          <View style={styles.colors}>
            {categoryPalette.map((c) => (
              <Pressable
                key={c}
                onPress={() => setNewColor(c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  newColor === c && styles.colorDotActive,
                ]}
              />
            ))}
          </View>
          <PrimaryButton
            label={busy ? 'Creando…' : 'Crear categoría'}
            onPress={createCategory}
            disabled={busy}
          />
        </View>
      ) : null}

      {statuses.map((status) => {
        const meta = categoryMeta[status.name] ?? {
          color: status.color,
          tint: colors.bgElevated,
        };
        return (
          <View key={status.id} style={styles.catCard}>
            <View style={styles.catTop}>
              <View style={[styles.catIcon, { backgroundColor: meta.tint }]}>
                <View style={[styles.catDot, { backgroundColor: meta.color }]} />
              </View>
              <View style={styles.catMain}>
                <View style={styles.catTitleRow}>
                  <Text style={styles.catTitle}>{status.name}</Text>
                  {!editing ? (
                    <Text style={styles.catPercent}>
                      {Math.round(status.percent)}%
                    </Text>
                  ) : (
                    <Pressable
                      onPress={() => confirmDelete(status.id, status.name)}
                      hitSlop={8}>
                      <Text style={styles.deleteText}>Eliminar</Text>
                    </Pressable>
                  )}
                </View>

                {editing ? (
                  <View style={styles.editRow}>
                    <Text style={styles.editPrefix}>{settings.currency}</Text>
                    <TextInput
                      value={drafts[status.id] ?? ''}
                      onChangeText={(text) =>
                        setDrafts((prev) => ({ ...prev, [status.id]: text }))
                      }
                      keyboardType="decimal-pad"
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor={colors.inkFaint}
                    />
                  </View>
                ) : (
                  <>
                    <Text style={styles.catAmount}>
                      {formatMoney(status.spent, settings.currency)} de{' '}
                      {formatMoney(status.monthlyLimit, settings.currency)}
                    </Text>
                    <View style={styles.catBar}>
                      <BudgetBar
                        percent={status.percent}
                        color={meta.color}
                        height={8}
                      />
                    </View>
                    <Text style={styles.catRemain}>
                      Te quedan{' '}
                      {formatMoney(
                        Math.max(status.remaining, 0),
                        settings.currency
                      )}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        );
      })}

      {editing ? (
        <PrimaryButton
          label={busy ? 'Guardando…' : 'Guardar presupuesto'}
          onPress={saveAll}
          disabled={busy}
        />
      ) : (
        <PrimaryButton
          label="Ajustar presupuesto"
          variant="secondary"
          onPress={() => setEditing(true)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: colors.ink,
  },
  periodPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 14,
  },
  periodChevron: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: '#8A9480',
  },
  periodText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.ink,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7F0D8',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  summaryCol: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#C9D7B8',
    marginHorizontal: 12,
  },
  summaryLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: '#6F7F5F',
  },
  summaryValue: {
    marginTop: 4,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: colors.ink,
  },
  addLink: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: colors.primaryMid,
  },
  createCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  createTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 8,
  },
  colorLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: colors.ink,
    marginBottom: 8,
  },
  colors: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: colors.ink,
  },
  catCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  catTop: {
    flexDirection: 'row',
    gap: 12,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catMain: {
    flex: 1,
  },
  catTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  catTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: colors.ink,
  },
  catPercent: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: colors.inkMuted,
  },
  deleteText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: colors.danger,
  },
  catAmount: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: '#8B9382',
  },
  catBar: {
    marginTop: 10,
  },
  catRemain: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: '#8B9382',
  },
  editRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editPrefix: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: colors.inkMuted,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DFE5D8',
    backgroundColor: '#FCFDF9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: colors.ink,
  },
});
