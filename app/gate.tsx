import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  clearPendingGatePackage,
  denyAndGoHome,
  getPendingGatePackage,
  grantAccess,
} from '@/modules/app-gate';
import { CategoryChip } from '@/src/components/CategoryChip';
import { Field } from '@/src/components/Field';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useBudget } from '@/src/context/BudgetContext';
import { parseAmount } from '@/src/domain/money';
import { verifyEmergencyPin } from '@/src/domain/pin';
import { colors } from '@/src/theme/colors';

export default function GateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ package?: string }>();
  const {
    categories,
    watchedApps,
    addExpense,
    checkWouldExceed,
    settings,
  } = useBudget();

  const [targetPackage, setTargetPackage] = useState<string | null>(
    typeof params.package === 'string' ? params.package : null
  );
  const watched = watchedApps.find((a) => a.androidPackage === targetPackage);
  const [categoryId, setCategoryId] = useState<number | null>(
    watched?.categoryId ??
      categories.find((c) => c.name === 'Movilidad')?.id ??
      categories[0]?.id ??
      null
  );
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (targetPackage) return;
      const pending = await getPendingGatePackage();
      if (pending) setTargetPackage(pending);
    })();
  }, [targetPackage]);

  useEffect(() => {
    if (watched?.categoryId) {
      setCategoryId(watched.categoryId);
    }
  }, [watched?.categoryId]);

  const appLabel = watched?.label ?? targetPackage ?? 'App vigilada';
  const kindLabel = watched?.kind
    ? watched.kind.charAt(0).toUpperCase() + watched.kind.slice(1)
    : null;

  const selected = categoryId ?? categories[0]?.id ?? null;
  const value = parseAmount(amount);
  const exceeds =
    selected != null && value != null ? checkWouldExceed(selected, value) : false;

  const cancel = async () => {
    await denyAndGoHome();
    await clearPendingGatePackage();
    router.replace('/');
  };

  const allow = async () => {
    if (!targetPackage) {
      Alert.alert('No hay app pendiente');
      return;
    }
    if (!selected || value == null || !reason.trim()) {
      Alert.alert('Completa categoría, monto y motivo');
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
      const ok = await verifyEmergencyPin(pin);
      if (!ok) {
        Alert.alert('Código incorrecto');
        return;
      }
    }

    setBusy(true);
    try {
      await addExpense({
        categoryId: selected,
        amount: value,
        reason,
        source: exceeds ? 'emergency' : 'gate',
        appPackage: targetPackage,
      });
      await grantAccess(targetPackage, 120);
      router.replace('/');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo autorizar'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.brand}>WifeApp</Text>
      <Text style={styles.title}>¿Qué vas a hacer en {appLabel}?</Text>
      <Text style={styles.subtitle}>
        {kindLabel
          ? `Clasificada como ${kindLabel}. `
          : ''}
        Antes de entrar, di el motivo y el monto estimado. Si la categoría ya
        está gastada, necesitarás el código de emergencia.
      </Text>

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
        label="Monto estimado"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <Field
        label="Motivo"
        value={reason}
        onChangeText={setReason}
        placeholder="Ej. Uber al trabajo"
      />

      {exceeds ? (
        <View style={styles.warn}>
          <Text style={styles.warnTitle}>Categoría sin presupuesto</Text>
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
        label={busy ? 'Autorizando…' : exceeds ? 'Usar emergencia y entrar' : 'Registrar y entrar'}
        onPress={allow}
        disabled={busy}
        style={{ marginBottom: 10 }}
      />
      <PrimaryButton label="Cancelar y no entrar" variant="ghost" onPress={cancel} />
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
    paddingTop: 64,
    paddingBottom: 32,
  },
  brand: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 25,
    letterSpacing: -0.7,
    color: colors.primary,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 25,
    letterSpacing: -0.7,
    color: colors.ink,
    marginBottom: 9,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: '#8B977E',
    lineHeight: 20,
    marginBottom: 24,
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
    padding: 12,
    marginBottom: 12,
  },
  warnTitle: {
    fontFamily: 'DMSans_700Bold',
    color: colors.danger,
    marginBottom: 8,
  },
});
