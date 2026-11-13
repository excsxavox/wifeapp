import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { CategoryChip } from '@/src/components/CategoryChip';
import { CompanionPrompt } from '@/src/components/CompanionPrompt';
import { Field } from '@/src/components/Field';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { useBudget } from '@/src/context/BudgetContext';
import { parseAmount } from '@/src/domain/money';
import { verifyEmergencyPin } from '@/src/domain/pin';
import { colors } from '@/src/theme/colors';

export default function RegistrarScreen() {
  const { categories, addExpense, checkWouldExceed, settings } = useBudget();
  const [categoryId, setCategoryId] = useState<number | null>(
    categories[0]?.id ?? null
  );
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = categoryId ?? categories[0]?.id ?? null;

  const submit = async () => {
    const value = parseAmount(amount);
    if (!selected) {
      Alert.alert('Elige una categoría');
      return;
    }
    if (value == null) {
      Alert.alert('Monto inválido', 'Escribe cuánto vas a gastar.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Motivo requerido', 'Di para qué es este gasto.');
      return;
    }

    const exceeds = checkWouldExceed(selected, value);
    if (exceeds) {
      if (!settings.emergencyPinSet) {
        Alert.alert(
          'Presupuesto agotado',
          'Esta categoría ya no tiene presupuesto. Configura un código de emergencia en Ajustes para forzar el gasto.'
        );
        return;
      }
      const ok = await verifyEmergencyPin(pin);
      if (!ok) {
        Alert.alert(
          'Código incorrecto',
          'Para gastar de más necesitas el código de emergencia.'
        );
        return;
      }
    }

    setBusy(true);
    try {
      await addExpense({
        categoryId: selected,
        amount: value,
        reason,
        source: exceeds ? 'emergency' : 'manual',
      });
      setAmount('');
      setReason('');
      setPin('');
      Alert.alert(
        exceeds ? 'Registrado con emergencia' : 'Gasto registrado',
        exceeds
          ? 'Quedó marcado como emergencia porque superaba el límite.'
          : 'Tu presupuesto se actualizó.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Registrar gasto"
      subtitle="Separa comida, mensuales y el resto desde el celular.">
      <CompanionPrompt role={settings.companionRole} mood="friendly" />
      <Text style={styles.label}>Categoría</Text>
      <View style={styles.chips}>
        {categories.map((category) => (
          <CategoryChip
            key={category.id}
            label={category.name}
            color={category.color}
            selected={selected === category.id}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </View>

      <Field
        label="Monto"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <Field
        label="¿Para qué es?"
        value={reason}
        onChangeText={setReason}
        placeholder="Ej. almuerzo, Uber al trabajo…"
      />

      {selected != null &&
      parseAmount(amount) != null &&
      checkWouldExceed(selected, parseAmount(amount)!) ? (
        <View style={styles.warn}>
          <Text style={styles.warnTitle}>Esta categoría ya está gastada</Text>
          <Text style={styles.warnBody}>
            Ingresa el código de emergencia para registrar el gasto de todas
            formas.
          </Text>
          <Field
            label="Código de emergencia"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            placeholder="••••"
          />
        </View>
      ) : null}

      <PrimaryButton
        label={busy ? 'Guardando…' : 'Registrar'}
        onPress={submit}
        disabled={busy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  warn: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: '#E7C9A0',
    padding: 14,
    marginBottom: 16,
  },
  warnTitle: {
    fontFamily: 'DMSans_700Bold',
    color: colors.warning,
    marginBottom: 4,
  },
  warnBody: {
    fontFamily: 'DMSans_400Regular',
    color: colors.ink,
    marginBottom: 8,
    lineHeight: 20,
  },
});
