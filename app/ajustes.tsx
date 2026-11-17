import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import {
  isAppGateAvailable,
  openAccessibilitySettings,
  openOverlaySettings,
  waitForGatePermissions,
  type GatePermissions,
} from '@/modules/app-gate';
import { AvatarFace } from '@/src/components/AvatarFace';
import { Field } from '@/src/components/Field';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ProfileAvatar } from '@/src/components/ProfileAvatar';
import { Screen } from '@/src/components/Screen';
import { useBudget } from '@/src/context/BudgetContext';
import { setSetting } from '@/src/db/queries';
import type { CompanionRole } from '@/src/db/types';
import { saveCompanionPhoto } from '@/src/domain/avatar';
import { clearAuthSession } from '@/src/domain/auth';
import { ensureNotificationPermissions } from '@/src/domain/notifications';
import { setEmergencyPin } from '@/src/domain/pin';
import {
  COMPANION_MOODS,
  companionPhotoUri,
  moodFromRatio,
  moodLabel,
  worstSpentRatio,
} from '@/src/theme/companions';
import { colors } from '@/src/theme/colors';

export default function AjustesScreen() {
  const router = useRouter();
  const { settings, statuses, reloadSettings, refresh } = useBudget();
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
    setPerms(await waitForGatePermissions());
  }, []);

  useEffect(() => {
    setCurrency(settings.currency);
    setResetDay(String(settings.monthlyResetDay));
  }, [settings]);

  useEffect(() => {
    loadPerms();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadPerms();
    });
    return () => sub.remove();
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

  const signOut = () => {
    Alert.alert(
      'Cerrar sesión',
      'Volverás a la pantalla de inicio. Tus datos locales se conservan.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await clearAuthSession();
            await reloadSettings();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const pickAvatar = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permiso necesario',
        fromCamera
          ? 'Sin la cámara no puedo tomar la foto del avatar.'
          : 'Sin acceso a las fotos no puedo usar esa imagen.'
      );
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
    if (result.canceled || !result.assets[0]) return;
    try {
      const uri = await saveCompanionPhoto(result.assets[0].uri);
      await setSetting('avatarPhotoUri', uri);
      await setSetting('avatarSource', 'photo');
      await reloadSettings();
    } catch (error) {
      Alert.alert(
        'No se pudo guardar la foto',
        error instanceof Error ? error.message : 'Prueba con otra imagen.'
      );
    }
  };

  const saveCompanion = async (role: CompanionRole) => {
    await setSetting('companionRole', role);
    await reloadSettings();
  };

  const saveAvatarSource = async (source: 'pixel' | 'adult') => {
    await setSetting('avatarSource', source);
    await reloadSettings();
  };

  const usePixelAvatar = async () => {
    await saveAvatarSource('pixel');
  };

  const useSavedPhoto = async () => {
    await setSetting('avatarSource', 'photo');
    await reloadSettings();
  };

  const photoUri = companionPhotoUri(settings.avatarSource, settings.avatarPhotoUri);
  const ratio = worstSpentRatio(statuses);
  const mood = moodFromRatio(ratio);
  const percent = Math.round(ratio * 100);

  return (
    <Screen
      title="Ajustes"
      subtitle="Código de emergencia, permisos y período."
      showBrand={false}>
      <Link href="/perfil" asChild>
        <Pressable style={styles.profileCard}>
          <ProfileAvatar size={42} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Mi perfil</Text>
            <Text style={styles.cardBodyCompact}>
              Avatar animado y compañero/a del portero.
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </Link>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Avatar</Text>
        <Text style={styles.cardBody}>
          La burbuja usa este rostro. Chica o chico cambia el dibujo y cómo te
          habla. Puedes elegir el dibujo pixelado, la versión adulta o una
          foto. El dibujo cambia de cara según lo gastado: tranquilo hasta 45%,
          atento hasta 70%, molesto hasta 85%, enojado hasta 100% y furioso si
          te pasas. Si pones una foto, esa misma imagen sale en toda la app y
          el emoji marca el enojo.
        </Text>
        <View style={styles.preview}>
          <AvatarFace
            role={settings.companionRole}
            mood={mood}
            photoUri={photoUri}
            size={92}
          />
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>
              {moodLabel(settings.companionRole, mood)}
            </Text>
            <Text style={styles.previewBody}>
              {statuses.length === 0
                ? 'Todavía no hay presupuesto para medir el enojo.'
                : `La categoría más gastada va al ${percent}%.`}
            </Text>
          </View>
        </View>
        <View style={styles.moodRow}>
          {COMPANION_MOODS.map((item) => (
            <View key={item} style={styles.moodItem}>
              <AvatarFace
                role={settings.companionRole}
                mood={item}
                photoUri={photoUri}
                size={44}
              />
              <Text style={styles.moodLabel}>
                {moodLabel(settings.companionRole, item)}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.companionRow}>
          {(
            [
              { source: 'pixel' as const, label: 'Pixelado' },
              { source: 'adult' as const, label: 'Adulto' },
            ] as const
          ).map((option) => (
            <Pressable
              key={option.source}
              onPress={() => saveAvatarSource(option.source)}
              style={[
                styles.companionCard,
                settings.avatarSource === option.source &&
                  styles.companionCardActive,
              ]}>
              <AvatarFace
                role={settings.companionRole}
                mood="happy"
                variant={option.source}
                size={72}
              />
              <Text style={styles.companionLabel}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.companionRow}>
          {(
            [
              { role: 'esposa' as const, label: 'Chica' },
              { role: 'esposo' as const, label: 'Chico' },
            ] as const
          ).map((option) => (
            <Pressable
              key={option.role}
              onPress={() => saveCompanion(option.role)}
              style={[
                styles.companionCard,
                settings.companionRole === option.role &&
                  styles.companionCardActive,
              ]}>
              <AvatarFace
                role={option.role}
                mood={settings.companionRole === option.role ? mood : 'happy'}
                photoUri={settings.companionRole === option.role ? photoUri : null}
                size={72}
              />
              <Text style={styles.companionLabel}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <PrimaryButton
          label="Elegir foto"
          onPress={() => pickAvatar(false)}
          style={{ marginBottom: 8 }}
        />
        <PrimaryButton
          label="Tomar foto"
          variant="secondary"
          onPress={() => pickAvatar(true)}
          style={{ marginBottom: 8 }}
        />
        {settings.avatarSource === 'photo' ? (
          <PrimaryButton
            label="Volver al avatar pixelado"
            variant="ghost"
            onPress={usePixelAvatar}
          />
        ) : settings.avatarPhotoUri ? (
          <PrimaryButton
            label="Volver a usar mi foto"
            variant="ghost"
            onPress={useSavedPhoto}
          />
        ) : null}
      </View>

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
            otras apps. Si el celular dice que no funciona correctamente, entra
            otra vez y vuelve a activarla.
            {'\n\n'}
            1. Accesibilidad:{' '}
            {perms.accessibilityEnabled ? '✓ activa' : '✗ falta activar'}
            {'\n'}
            2. Overlay:{' '}
            {perms.overlayAllowed ? '✓ permitido' : 'recomendado'}
            {'\n\n'}
            Cómo activar Accesibilidad:{'\n'}
            Ajustes del celular → Accesibilidad → WifeApp → Activar
            {'\n\n'}
            Si Android muestra “el servicio no funciona correctamente” o el
            portero se apaga solo, vuelve a activar WifeApp en Accesibilidad.
            Tras actualizar la app también hay que reactivarla.
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
              const latest = await waitForGatePermissions();
              setPerms(latest);
              Alert.alert(
                latest.accessibilityEnabled ? 'Portero listo' : 'Falta Accesibilidad',
                latest.accessibilityEnabled
                  ? 'Ya puedes abrir una app vigilada para probar el modal.'
                  : 'Activa WifeApp en Accesibilidad y vuelve a comprobar. Si el sistema la desactivó, actívala otra vez.'
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
        label="Cerrar sesión"
        variant="danger"
        onPress={signOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: 'Manrope_800ExtraBold',
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
  cardBodyCompact: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 17,
    marginBottom: 0,
  },
  companionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  companionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
  },
  companionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  companionLabel: {
    marginTop: 8,
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  chevron: {
    fontSize: 22,
    color: '#A3AD97',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  previewCopy: {
    flex: 1,
  },
  previewTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: colors.ink,
  },
  previewBody: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  moodItem: {
    flex: 1,
    alignItems: 'center',
  },
  moodLabel: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 9,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});
