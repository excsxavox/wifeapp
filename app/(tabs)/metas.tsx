import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BudgetBar } from '@/src/components/BudgetBar';
import { Field } from '@/src/components/Field';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { useBudget } from '@/src/context/BudgetContext';
import { formatMoney, parseAmount } from '@/src/domain/money';
import { colors } from '@/src/theme/colors';

const GOAL_COLORS = ['#88A2B0', '#BDA65F', '#7B9984', '#B594AD', '#9B9F85'];

export default function MetasScreen() {
  const {
    savingsGoals,
    primaryGoal,
    settings,
    totalBudget,
    totalSpent,
    saveGoal,
    contributeToGoal,
    removeGoal,
  } = useBudget();

  const [name, setName] = useState('Viaje');
  const [target, setTarget] = useState('1000');
  const [saved, setSaved] = useState('0');
  const [color, setColor] = useState(GOAL_COLORS[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [contribution, setContribution] = useState('');
  const [busy, setBusy] = useState(false);

  const available = Math.max(0, totalBudget - totalSpent);

  const [didHydrate, setDidHydrate] = useState(false);

  useEffect(() => {
    if (didHydrate) return;
    if (!primaryGoal) {
      setDidHydrate(true);
      return;
    }
    setName(primaryGoal.name);
    setTarget(String(primaryGoal.targetAmount));
    setSaved(String(primaryGoal.savedAmount));
    setColor(primaryGoal.color);
    setEditingId(primaryGoal.id);
    setDidHydrate(true);
  }, [primaryGoal, didHydrate]);

  const startNew = () => {
    setEditingId(null);
    setName('Viaje');
    setTarget('1000');
    setSaved('0');
    setColor(GOAL_COLORS[0]);
    setContribution('');
  };

  const loadGoal = (id: number) => {
    const goal = savingsGoals.find((g) => g.id === id);
    if (!goal) return;
    setEditingId(goal.id);
    setName(goal.name);
    setTarget(String(goal.targetAmount));
    setSaved(String(goal.savedAmount));
    setColor(goal.color);
    setContribution('');
  };

  const submit = async () => {
    const targetAmount = parseAmount(target);
    const savedAmount = parseAmount(saved) ?? 0;
    if (!name.trim()) {
      Alert.alert('Nombre requerido', 'Ejemplo: Viaje, Fondo de emergencia…');
      return;
    }
    if (targetAmount == null || targetAmount <= 0) {
      Alert.alert('Meta inválida', 'Escribe un monto objetivo mayor a cero.');
      return;
    }
    setBusy(true);
    try {
      const goal = await saveGoal({
        id: editingId ?? undefined,
        name,
        targetAmount,
        savedAmount,
        color,
      });
      setEditingId(goal.id);
      setSaved(String(goal.savedAmount));
      Alert.alert(
        editingId ? 'Meta actualizada' : 'Meta creada',
        `«${name.trim()}» ya aparece en el inicio.`
      );
    } finally {
      setBusy(false);
    }
  };

  const addContribution = async () => {
    if (editingId == null) {
      Alert.alert('Guarda la meta primero');
      return;
    }
    const amount = parseAmount(contribution);
    if (amount == null || amount <= 0) {
      Alert.alert('Monto inválido', 'Escribe cuánto quieres aportar.');
      return;
    }
    setBusy(true);
    try {
      await contributeToGoal(editingId, amount);
      const next = (parseAmount(saved) ?? 0) + amount;
      setSaved(String(next));
      setContribution('');
      Alert.alert('Aporte registrado', `Sumaste ${formatMoney(amount, settings.currency)}.`);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (editingId == null) return;
    Alert.alert('Eliminar meta', `¿Borrar «${name}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await removeGoal(editingId);
          startNew();
        },
      },
    ]);
  };

  return (
    <Screen
      title="Para qué ahorras."
      subtitle="El KDA mide hábitos. La meta te muestra el destino.">
      {savingsGoals.length > 0 ? (
        <View style={styles.list}>
          {savingsGoals.map((goal) => {
            const percent =
              goal.targetAmount > 0
                ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100)
                : 0;
            return (
              <Pressable
                key={goal.id}
                style={[
                  styles.goalRow,
                  editingId === goal.id && styles.goalRowActive,
                ]}
                onPress={() => loadGoal(goal.id)}>
                <View style={[styles.swatch, { backgroundColor: goal.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <Text style={styles.goalMeta}>
                    {formatMoney(goal.savedAmount, settings.currency)} /{' '}
                    {formatMoney(goal.targetAmount, settings.currency)}
                  </Text>
                  <BudgetBar percent={percent} color={goal.color} />
                </View>
                <Text style={styles.goalPct}>{Math.round(percent)}%</Text>
              </Pressable>
            );
          })}
          <PrimaryButton
            label="Nueva meta"
            variant="secondary"
            onPress={startNew}
            style={{ marginBottom: 8 }}
          />
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {editingId ? 'Editar meta' : 'Crear meta'}
        </Text>
        <Field
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Viaje, Casa, Emergencias…"
        />
        <Field
          label={`Objetivo (${settings.currency})`}
          value={target}
          onChangeText={setTarget}
          keyboardType="decimal-pad"
          placeholder="1000"
        />
        <Field
          label={`Ya ahorrado (${settings.currency})`}
          value={saved}
          onChangeText={setSaved}
          keyboardType="decimal-pad"
          placeholder="0"
          hint="Puedes empezar en cero y aportar después."
        />

        <Text style={styles.label}>Color</Text>
        <View style={styles.colors}>
          {GOAL_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                color === c && styles.colorDotActive,
              ]}
            />
          ))}
        </View>

        <PrimaryButton
          label={busy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear meta'}
          onPress={submit}
          disabled={busy}
        />
        {editingId ? (
          <PrimaryButton
            label="Eliminar meta"
            variant="danger"
            onPress={confirmDelete}
            style={{ marginTop: 10 }}
          />
        ) : null}
      </View>

      {editingId ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Aportar a esta meta</Text>
          <Text style={styles.cardBody}>
            Este mes te quedan{' '}
            <Text style={styles.bold}>
              {formatMoney(available, settings.currency)}
            </Text>{' '}
            sin gastar. Puedes mover parte a tu meta.
          </Text>
          <Field
            label="Monto a aportar"
            value={contribution}
            onChangeText={setContribution}
            keyboardType="decimal-pad"
            placeholder="50"
          />
          {available > 0 ? (
            <PrimaryButton
              label={`Usar ${formatMoney(available, settings.currency)} disponible`}
              variant="subtle"
              onPress={() => setContribution(String(available))}
              style={{ marginBottom: 10 }}
            />
          ) : null}
          <PrimaryButton
            label={busy ? 'Guardando…' : 'Registrar aporte'}
            variant="lime"
            onPress={addContribution}
            disabled={busy}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    marginBottom: 8,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  goalRowActive: {
    borderColor: '#8FA779',
    backgroundColor: '#F7FAF2',
  },
  swatch: {
    width: 12,
    height: 40,
    borderRadius: 6,
  },
  goalName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: colors.ink,
    marginBottom: 2,
  },
  goalMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.inkMuted,
    marginBottom: 8,
  },
  goalPct: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 14,
  },
  cardBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
    marginBottom: 12,
  },
  bold: {
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: colors.ink,
    marginBottom: 10,
  },
  colors: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: colors.primary,
  },
});
