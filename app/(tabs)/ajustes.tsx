import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  getGatePermissions,
  isAppGateAvailable,
  openAccessibilitySettings,
  openOverlaySettings,
  type GatePermissions,
} from '@/modules/app-gate';
import { Field } from '@/src/components/Field';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { useBudget } from '@/src/context/BudgetContext';
import { setSetting } from '@/src/db/queries';
import { ensureNotificationPermissions } from '@/src/domain/notifications';
import { setEmergencyPin } from '@/src/domain/pin';
import { colors } from '@/src/theme/colors';

export default function AjustesScreen() {
  const router = useRouter();
  const { settings, reloadSettings, refresh } = useBudget();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [currency, setCurrency] = useState(settings.currency);
  const [resetDay, setResetDay] = useState(String(settings.monthlyResetDay));
  const [perms, setPerms] = useState<GatePermissions>({
    accessibilityEnabled: false,
    overlayAllowed: false,
  });

  const loadPerms = useCallback(async () => {
    if (!isAppGateAvailable()) return;
    setPerms(await getGatePermissions());
  }, []);

  useEffect(() => {
    setCurrency(settings.currency);
    setResetDay(String(settings.monthlyResetDay));
  }, [settings]);

  useEffect(() => {
    loadPerms();
  }, [loadPerms]);

  const savePin = async () => {
    if (pin !== confirm) {
      Alert.alert('No coinciden', 'Los códigos deben ser iguales.');
      return;
    }
    try {
      await setEmergencyPin(pin);
      setPin('');
      setConfirm('');
      await reloadSettings();
      Alert.alert('Código guardado', 'Úsalo cuando una categoría esté agotada.');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo guardar el código'
      );
    }
  };

  const saveGeneral = async () => {
    const day = Number(resetDay);
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      Alert.alert('Día inválido', 'Usa un día entre 1 y 28.');
      return;
    }
    await setSetting('monthlyResetDay', String(day));
    await setSetting('currency', currency.trim().toUpperCase() || 'USD');
    await reloadSettings();
    await refresh();
    Alert.alert('Guardado', 'Ajustes generales actualizados.');
  };

  const enableNotifications = async () => {
    const ok = await ensureNotificationPermissions();
    Alert.alert(
      ok ? 'Notificaciones activas' : 'Permiso denegado',
      ok
        ? 'Te avisaremos al 80% y al 100% de cada categoría.'
        : 'Actívalas en Ajustes del sistema si cambias de opinión.'
    );
  };

  return (
    <Screen title="Ajustes" subtitle="Código de emergencia, permisos y período.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Código de emergencia</Text>
        <Text style={styles.cardBody}>
          {settings.emergencyPinSet
            ? 'Ya hay un código configurado. Puedes cambiarlo abajo.'
            : 'Aún no hay código. Sin él no podrás gastar de más en categorías agotadas.'}
        </Text>
        <Field
          label="Nuevo código (4-6 dígitos)"
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          placeholder="••••"
        />
        <Field
          label="Confirmar código"
          value={confirm}
          onChangeText={setConfirm}
          keyboardType="number-pad"
          secureTextEntry
          placeholder="••••"
        />
        <PrimaryButton label="Guardar código" onPress={savePin} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Período y moneda</Text>
        <Field
          label="Día de reinicio mensual"
          value={resetDay}
          onChangeText={setResetDay}
          keyboardType="number-pad"
          hint="Entre 1 y 28"
        />
        <Field
          label="Moneda"
          value={currency}
          onChangeText={setCurrency}
          autoCapitalize="characters"
          placeholder="USD"
        />
        <PrimaryButton label="Guardar" variant="secondary" onPress={saveGeneral} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Avisos</Text>
        <Text style={styles.cardBody}>
          En iPhone (y también en Android) te avisamos cuando una categoría llega
          al 80% o se agota.
        </Text>
        <PrimaryButton
          label="Activar notificaciones"
          variant="secondary"
          onPress={enableNotifications}
        />
      </View>

      {Platform.OS === 'android' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Portero (obligatorio)</Text>
          <Text style={styles.cardBody}>
            Sin Accesibilidad, WifeApp no puede preguntarte al abrir el banco u
            otras apps.
            {'\n\n'}
            1. Accesibilidad:{' '}
            {perms.accessibilityEnabled ? '✓ activa' : '✗ falta activar'}
            {'\n'}
            2. Overlay:{' '}
            {perms.overlayAllowed ? '✓ permitido' : 'recomendado'}
            {'\n\n'}
            Cómo activar Accesibilidad:{'\n'}
            Ajustes del celular → Accesibilidad → WifeApp → Activar
          </Text>
          <PrimaryButton
            label="1. Activar Accesibilidad"
            onPress={openAccessibilitySettings}
            style={{ marginBottom: 8 }}
          />
          <PrimaryButton
            label="2. Permiso de overlay"
            variant="secondary"
            onPress={openOverlaySettings}
            style={{ marginBottom: 8 }}
          />
          <PrimaryButton
            label="Comprobar permisos"
            variant="ghost"
            onPress={async () => {
              await loadPerms();
              const latest = await getGatePermissions();
              Alert.alert(
                latest.accessibilityEnabled ? 'Portero listo' : 'Falta Accesibilidad',
                latest.accessibilityEnabled
                  ? 'Ya puedes abrir una app vigilada para probar el modal.'
                  : 'Activa WifeApp en Accesibilidad y vuelve a comprobar.'
              );
            }}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>iPhone</Text>
          <Text style={styles.cardBody}>
            Apple no permite bloquear Uber o la banca desde otra app. Aquí
            registras gastos y recibes avisos cuando te pasas del presupuesto.
          </Text>
        </View>
      )}

      <PrimaryButton
        label="Apps vigiladas / clasificar"
        variant="ghost"
        onPress={() => router.push('/apps-vigiladas')}
        style={{ marginBottom: 8 }}
      />
      <PrimaryButton
        label="Repetir configuración inicial"
        variant="ghost"
        onPress={() => router.push('/onboarding')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 6,
  },
  cardBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
});
