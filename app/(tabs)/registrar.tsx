import { useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { CategoryChip } from '@/src/components/CategoryChip';
import { Field } from '@/src/components/Field';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { useBudget } from '@/src/context/BudgetContext';
import { formatMoney, parseAmount } from '@/src/domain/money';
import { verifyEmergencyPin } from '@/src/domain/pin';
import { getCompanionAvatar } from '@/src/theme/companions';
import { colors } from '@/src/theme/colors';

export default function RegistrarScreen() {
  const { categories, statuses, addExpense, checkWouldExceed, settings } =
    useBudget();
  const [categoryId, setCategoryId] = useState<number | null>(
    categories[0]?.id ?? null
  );
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = categoryId ?? categories[0]?.id ?? null;
  const role = settings.companionRole ?? 'esposa';
  const selectedStatus = statuses.find((s) => s.id === selected);
  const parsedAmount = parseAmount(amount);
  const exceeds =
    selected != null &&
    parsedAmount != null &&
    checkWouldExceed(selected, parsedAmount);

  const coachCopy = useMemo(() => {
    if (!selectedStatus) {
      return 'Elige una categoría y cuéntame el gasto.';
    }
    if (exceeds) {
      return `«${selectedStatus.name}» ya no tiene cupo. Si sigues, usa el código de emergencia.`;
    }
    return `Te quedan ${formatMoney(Math.max(selectedStatus.remaining, 0), settings.currency)} en ${selectedStatus.name}.`;
  }, [selectedStatus, exceeds, settings.currency]);

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

    const over = checkWouldExceed(selected, value);
    if (over) {
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
        source: over ? 'emergency' : 'manual',
      });
      setAmount('');
      setReason('');
      setPin('');
      Alert.alert(
        over ? 'Registrado con emergencia' : 'Gasto registrado',
        over
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
      subtitle="Un momento de calma antes de soltar el dinero."
      brandMinimal>
      <View style={styles.coachBanner}>
        <Image
          source={getCompanionAvatar(role, exceeds ? 'annoyed' : 'friendly')}
          style={styles.coachAvatar}
          resizeMode="contain"
        />
        <View style={styles.coachCopy}>
          <Text style={styles.coachTitle}>
            {exceeds ? '¿Estás segura/o?' : '¿En qué vamos a gastar?'}
          </Text>
          <Text style={styles.coachBody}>{coachCopy}</Text>
        </View>
      </View>

      <View style={styles.card}>
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
          label={`Monto (${settings.currency})`}
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

        {exceeds ? (
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
          label={busy ? 'Guardando…' : 'Registrar gasto'}
          onPress={submit}
          disabled={busy}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  coachBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E7F0D8',
    borderRadius: 18,
    paddingVertical: 10,
    paddingLeft: 8,
    paddingRight: 14,
    marginBottom: 14,
    minHeight: 88,
  },
  coachAvatar: {
    width: 78,
    height: 78,
  },
  coachCopy: {
    flex: 1,
  },
  coachTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: colors.ink,
  },
  coachBody: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#6F7F5F',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
  },
  label: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: colors.ink,
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
    borderRadius: 14,
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
