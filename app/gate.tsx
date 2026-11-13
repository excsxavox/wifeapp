import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  clearGateSession,
  clearPendingGatePackage,
  denyAndGoHome,
  getGateSession,
  getPendingGate,
  startGateSession,
  type GateMode,
} from '@/modules/app-gate';
import { CategoryChip } from '@/src/components/CategoryChip';
import { CompanionPrompt } from '@/src/components/CompanionPrompt';
import { Field } from '@/src/components/Field';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useBudget } from '@/src/context/BudgetContext';
import { parseAmount } from '@/src/domain/money';
import { verifyEmergencyPin } from '@/src/domain/pin';
import { colors } from '@/src/theme/colors';

export default function GateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ package?: string; mode?: string }>();
  const {
    categories,
    watchedApps,
    addExpense,
    checkWouldExceed,
    settings,
  } = useBudget();
  const companionRole = settings.companionRole;

  const [targetPackage, setTargetPackage] = useState<string | null>(
    typeof params.package === 'string' ? params.package : null
  );
  const [mode, setMode] = useState<GateMode>(
    params.mode === 'settle' ? 'settle' : 'intent'
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
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    (async () => {
      const pending = await getPendingGate();
      if (!targetPackage && pending.packageName) {
        setTargetPackage(pending.packageName);
      }
      if (params.mode !== 'intent' && params.mode !== 'settle') {
        if (pending.mode === 'settle') setMode('settle');
      }

      const session = await getGateSession();
      if (session) {
        if (!targetPackage) setTargetPackage(session.packageName);
        if (session.categoryId > 0) setCategoryId(session.categoryId);
        if (session.reason) setReason(session.reason);
        if (session.needsSettle) setMode('settle');
      }
    })();
  }, [targetPackage, params.mode]);

  useEffect(() => {
    if (mode === 'intent' && watched?.categoryId) {
      setCategoryId(watched.categoryId);
    }
  }, [watched?.categoryId, mode]);

  const appLabel = watched?.label ?? targetPackage ?? 'App vigilada';
  const kindLabel = watched?.kind
    ? watched.kind.charAt(0).toUpperCase() + watched.kind.slice(1)
    : null;
  const selected = categoryId ?? categories[0]?.id ?? null;
  const selectedCategory = categories.find((c) => c.id === selected);
  const value = parseAmount(amount);
  const exceeds =
    selected != null && value != null && value > 0
      ? checkWouldExceed(selected, value)
      : false;

  const cancelIntent = async () => {
    await denyAndGoHome();
    await clearPendingGatePackage();
    router.replace('/');
  };

  const enterWithIntent = async (browseOnly: boolean) => {
    if (!targetPackage) {
      Alert.alert('No hay app pendiente');
      return;
    }
    if (!selected) {
      Alert.alert('Elige una categoría');
      return;
    }
    if (!browseOnly && !reason.trim()) {
      Alert.alert('Motivo', 'Di en una frase qué vas a hacer.');
      return;
    }

    setBusy(true);
    try {
      if (Platform.OS === 'android') {
        await startGateSession({
          packageName: targetPackage,
          categoryId: selected,
          reason: browseOnly ? 'Solo ver' : reason.trim(),
          browseOnly,
        });
        router.replace('/');
      } else {
        // Simulación web/iOS: si no es solo ver, pasa a preguntar el monto.
        setSimulating(true);
        if (browseOnly) {
          await clearPendingGatePackage();
          router.replace('/');
        } else {
          setMode('settle');
        }
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo continuar'
      );
    } finally {
      setBusy(false);
    }
  };

  const settle = async (spentNothing: boolean) => {
    if (!targetPackage || selected == null) {
      Alert.alert('Sesión incompleta');
      return;
    }

    if (spentNothing) {
      setBusy(true);
      try {
        await clearGateSession();
        await clearPendingGatePackage();
        router.replace('/');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (value == null || value <= 0) {
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
        reason: reason.trim() || `Gasto en ${appLabel}`,
        source: exceeds ? 'emergency' : 'gate',
        appPackage: targetPackage,
      });
      await clearGateSession();
      await clearPendingGatePackage();
      router.replace('/');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo registrar'
      );
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'settle') {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>WifeApp</Text>
        <CompanionPrompt role={companionRole} mood="annoyed" />
        <Text style={styles.eyebrow}>AL SALIR DE LA APP</Text>
        <Text style={styles.title}>¿Cuánto gastaste en {appLabel}?</Text>
        <Text style={styles.subtitle}>
          {simulating
            ? 'Simulación: aquí preguntamos el monto al cerrar o cambiar de app.'
            : 'Detectamos que saliste de la app. Registra el gasto real, o indica que no hubo transacción.'}
        </Text>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Categoría</Text>
          <Text style={styles.summaryValue}>
            {selectedCategory?.name ?? '—'}
          </Text>
          {reason ? (
            <>
              <Text style={[styles.summaryLabel, { marginTop: 10 }]}>Motivo</Text>
              <Text style={styles.summaryValue}>{reason}</Text>
            </>
          ) : null}
        </View>

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
          label={busy ? 'Guardando…' : exceeds ? 'Registrar con emergencia' : 'Registrar gasto'}
          onPress={() => settle(false)}
          disabled={busy}
          style={{ marginBottom: 10 }}
        />
        <PrimaryButton
          label="No gasté nada"
          variant="lime"
          onPress={() => settle(true)}
          disabled={busy}
          style={{ marginBottom: 10 }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.brand}>WifeApp</Text>
      <CompanionPrompt role={companionRole} mood="friendly" />
      <Text style={styles.eyebrow}>ANTES DE ENTRAR</Text>
      <Text style={styles.title}>¿Qué vas a hacer en {appLabel}?</Text>
      <Text style={styles.subtitle}>
        {kindLabel ? `Clasificada como ${kindLabel}. ` : ''}
        Elige la categoría. El monto te lo pedimos cuando salgas o cambies de
        app. Si solo vas a mirar, usa «Solo ver».
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
        label="¿Qué vas a hacer?"
        value={reason}
        onChangeText={setReason}
        placeholder="Ej. transferir, pedir Uber, pedir comida…"
      />

      <PrimaryButton
        label={busy ? 'Abriendo…' : 'Continuar a la app'}
        onPress={() => enterWithIntent(false)}
        disabled={busy}
        style={{ marginBottom: 10 }}
      />
      <PrimaryButton
        label="Solo ver (sin transacción)"
        variant="lime"
        onPress={() => enterWithIntent(true)}
        disabled={busy}
        style={{ marginBottom: 10 }}
      />
      <PrimaryButton
        label="Cancelar y no entrar"
        variant="ghost"
        onPress={cancelIntent}
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
  eyebrow: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: '#92A17F',
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
  summary: {
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 18,
  },
  summaryLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: colors.inkMuted,
  },
  summaryValue: {
    marginTop: 4,
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: colors.ink,
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
    marginBottom: 8,
  },
});
