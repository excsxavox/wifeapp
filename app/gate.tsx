import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { removePendingExpense } from '@/modules/app-gate';
import { CategoryChip } from '@/src/components/CategoryChip';
import { CompanionPrompt } from '@/src/components/CompanionPrompt';
import { Field } from '@/src/components/Field';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useBudget } from '@/src/context/BudgetContext';
import { formatMoney, parseAmount } from '@/src/domain/money';
import { verifyEmergencyPin } from '@/src/domain/pin';
import { colors } from '@/src/theme/colors';
import {
  companionPhotoUri,
  moodFromRatio,
  worstSpentRatio,
} from '@/src/theme/companions';

/**
 * Confirm an expense from a watched app. Opened by the user from the pending
 * list (or as a simulation on web/iOS) — never forced on screen.
 */
export default function GateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pendingId?: string; package?: string }>();
  const {
    categories,
    watchedApps,
    pendingExpenses,
    addExpense,
    checkWouldExceed,
    settings,
    refresh,
    statuses,
  } = useBudget();

  const pending = useMemo(
    () => pendingExpenses.find((p) => p.id === params.pendingId) ?? null,
    [pendingExpenses, params.pendingId]
  );
  const packageName = pending?.packageName ?? params.package ?? null;
  const watched = watchedApps.find((a) => a.androidPackage === packageName);
  const appLabel = pending?.label ?? watched?.label ?? packageName ?? 'la app';

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  // Prefill once per pending item (refreshes must not wipe what the user typed).
  const prefillKey = `${pending?.id ?? params.package ?? ''}:${categories.length > 0}`;
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  if (appliedKey !== prefillKey) {
    setAppliedKey(prefillKey);
    const fromPending =
      pending && pending.categoryId > 0 ? pending.categoryId : null;
    setCategoryId(
      fromPending ?? watched?.categoryId ?? categories[0]?.id ?? null
    );
    if (pending?.reason && pending.reason !== 'Solo ver') setReason(pending.reason);
    if (pending?.amount != null) setAmount(String(pending.amount));
  }

  const selected = categoryId ?? categories[0]?.id ?? null;
  const value = parseAmount(amount);
  const exceeds =
    selected != null && value != null ? checkWouldExceed(selected, value) : false;

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const spentNothing = async () => {
    setBusy(true);
    try {
      if (pending) {
        await removePendingExpense(pending.id);
        await refresh();
      }
      close();
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (selected == null) {
      Alert.alert('Elige una categoría');
      return;
    }
    if (value == null) {
      Alert.alert('Monto', 'Escribe cuánto gastaste, o elige «No gasté nada».');
      return;
    }
    if (exceeds) {
      if (!settings.emergencyPinSet) {
        Alert.alert(
          'Presupuesto agotado',
          'Configura un código de emergencia en Ajustes.'
        );
        return;
      }
      if (!(await verifyEmergencyPin(pin))) {
        Alert.alert('Código incorrecto');
        return;
      }
    }

    setBusy(true);
    try {
      if (pending) await removePendingExpense(pending.id);
      await addExpense({
        categoryId: selected,
        amount: value,
        reason: reason.trim() || `Gasto en ${appLabel}`,
        source: exceeds ? 'emergency' : 'gate',
        appPackage: packageName,
      });
      close();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo registrar'
      );
    } finally {
      setBusy(false);
    }
  };

  const when = pending?.endedAt
    ? new Date(pending.endedAt).toLocaleString('es-ES', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const moodCategory = statuses.find(
    (item) => item.id === (categoryId ?? pending?.categoryId)
  );
  const moodRatio =
    moodCategory && moodCategory.monthlyLimit > 0
      ? moodCategory.spent / moodCategory.monthlyLimit
      : worstSpentRatio(statuses);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <CompanionPrompt
        role={settings.companionRole}
        mood={moodFromRatio(moodRatio)}
        photoUri={companionPhotoUri(settings.avatarSource, settings.avatarPhotoUri)}
        title={
          settings.companionRole === 'esposa'
            ? `Amor, ¿de qué fue lo de ${appLabel}?`
            : `¿Qué gastaste en ${appLabel}?`
        }
        subtitle={
          when
            ? `Saliste de la app el ${when}. Confírmalo y listo.`
            : 'Cuéntame el monto y de qué fue.'
        }
      />

      {pending?.status === 'reported' && pending.amount != null ? (
        <View style={styles.warn}>
          <Text style={styles.warnTitle}>Supera el presupuesto</Text>
          <Text style={styles.warnBody}>
            Desde la burbuja dijiste {formatMoney(pending.amount, settings.currency)}.
            Para registrarlo necesitas tu código de emergencia.
          </Text>
        </View>
      ) : null}

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
        label="¿De qué fue?"
        value={reason}
        onChangeText={setReason}
        placeholder="Ej. Uber al trabajo, pedido de comida…"
      />
      <Field
        label="Monto gastado"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />

      {exceeds ? (
        <View style={styles.warn}>
          <Text style={styles.warnTitle}>Esta categoría ya está al límite</Text>
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
        label={
          busy ? 'Guardando…' : exceeds ? 'Registrar con emergencia' : 'Registrar gasto'
        }
        onPress={save}
        disabled={busy}
        style={{ marginBottom: 10 }}
      />
      <PrimaryButton
        label="No gasté nada"
        variant="lime"
        onPress={spentNothing}
        disabled={busy}
        style={{ marginBottom: 10 }}
      />
      <PrimaryButton
        label="Más tarde"
        variant="ghost"
        onPress={close}
        disabled={busy}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 23,
    paddingTop: 16,
    paddingBottom: 32,
  },
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
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#E8B4BA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  warnTitle: {
    fontFamily: 'DMSans_700Bold',
    color: colors.danger,
    marginBottom: 6,
  },
  warnBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.text,
  },
});
