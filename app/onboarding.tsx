import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  isAppGateAvailable,
  waitForGatePermissions,
  listInstalledApps,
  openAccessibilitySettings,
  openOverlaySettings,
  type GatePermissions,
  type InstalledApp,
} from '@/modules/app-gate';
import { Field } from '@/src/components/Field';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useBudget } from '@/src/context/BudgetContext';
import { setSetting } from '@/src/db/queries';
import type { CompanionRole } from '@/src/db/types';
import {
  APP_CATALOG,
  KIND_LABELS,
  KIND_TO_CATEGORY_NAME,
  suggestKind,
  type AppKind,
} from '@/src/domain/appCatalog';
import { setEmergencyPin } from '@/src/domain/pin';
import { getCompanionAvatar } from '@/src/theme/companions';
import { colors } from '@/src/theme/colors';

type Step = 'welcome' | 'companion' | 'permissions' | 'classify' | 'pin';

type SelectableApp = InstalledApp & { suggestedKind: AppKind };

const STEPS_ANDROID = [
  'Elegir esposo o esposa',
  'Activar Accesibilidad (obligatorio)',
  'Elegir apps a vigilar (obligatorio)',
  'Código de emergencia (opcional)',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { categories, saveClassifiedApps, completeSetup, ready, reloadSettings } =
    useBudget();
  const [step, setStep] = useState<Step>('welcome');
  const [companionRole, setCompanionRole] = useState<CompanionRole>('esposa');
  const [installed, setInstalled] = useState<SelectableApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, AppKind>>({});
  const [filterKind, setFilterKind] = useState<AppKind | 'todas' | 'elegidas'>('todas');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [perms, setPerms] = useState<GatePermissions>({
    accessibilityEnabled: false,
    overlayAllowed: false,
  });

  const needsAndroidGate = Platform.OS === 'android' && isAppGateAvailable();

  const categoryByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const category of categories) {
      map.set(category.name, category.id);
    }
    return map;
  }, [categories]);

  const refreshPerms = useCallback(async () => {
    if (!needsAndroidGate) return;
    setPerms(await waitForGatePermissions());
  }, [needsAndroidGate]);

  useEffect(() => {
    refreshPerms();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPerms();
    });
    return () => sub.remove();
  }, [refreshPerms]);

  const loadApps = useCallback(async () => {
    setLoadingApps(true);
    setLoadError(null);
    try {
      let apps: InstalledApp[] = [];
      if (needsAndroidGate) {
        apps = await listInstalledApps();
      }

      if (apps.length === 0) {
        apps = APP_CATALOG.map((a) => ({
          label: a.label,
          androidPackage: a.androidPackage,
        }));
        if (needsAndroidGate) {
          setLoadError(
            'No se pudieron leer apps del sistema. Revisa permisos o reinstala el APK nuevo.'
          );
        }
      }

      const mapped: SelectableApp[] = apps.map((app) => ({
        ...app,
        suggestedKind: suggestKind(app.androidPackage, app.label),
      }));

      mapped.sort((a, b) => {
        const score = (app: SelectableApp) =>
          app.suggestedKind === 'otros' ? 1 : 0;
        const byKind = score(a) - score(b);
        if (byKind !== 0) return byKind;
        return a.label.localeCompare(b.label, 'es');
      });

      setInstalled(mapped);

      const pre: Record<string, AppKind> = {};
      for (const app of mapped) {
        const known = APP_CATALOG.find(
          (c) => c.androidPackage === app.androidPackage && c.suggested
        );
        if (known) pre[app.androidPackage] = known.kind;
      }
      setSelected((prev) => ({ ...pre, ...prev }));
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Error al leer apps instaladas'
      );
    } finally {
      setLoadingApps(false);
    }
  }, [needsAndroidGate]);

  useEffect(() => {
    if (step === 'classify') loadApps();
  }, [step, loadApps]);

  const visibleApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return installed.filter((app) => {
      if (filterKind === 'elegidas' && !selected[app.androidPackage]) return false;
      if (
        filterKind !== 'todas' &&
        filterKind !== 'elegidas' &&
        (selected[app.androidPackage] ?? app.suggestedKind) !== filterKind
      ) {
        return false;
      }
      if (!q) return true;
      return (
        app.label.toLowerCase().includes(q) ||
        app.androidPackage.toLowerCase().includes(q)
      );
    });
  }, [installed, search, filterKind, selected]);

  const toggleApp = (app: SelectableApp) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[app.androidPackage]) delete next[app.androidPackage];
      else next[app.androidPackage] = app.suggestedKind;
      return next;
    });
  };

  const changeKind = (pkg: string, kind: AppKind) => {
    setSelected((prev) => ({ ...prev, [pkg]: kind }));
  };

  const goToClassify = async () => {
    await refreshPerms();
    if (needsAndroidGate && !perms.accessibilityEnabled) {
      const latest = await waitForGatePermissions();
      setPerms(latest);
      if (!latest.accessibilityEnabled) {
        Alert.alert(
          'Falta Accesibilidad',
          'Sin este permiso el portero no puede detectar Pichincha, Uber u otras apps.\n\n1. Toca “Activar Accesibilidad”\n2. Busca WifeApp\n3. Actívala\n4. Vuelve aquí y toca “Ya lo activé”'
        );
        return;
      }
    }
    setStep('classify');
  };

  const saveAppsAndContinue = async () => {
    const entries = Object.entries(selected);
    if (entries.length === 0) {
      Alert.alert(
        'Elige al menos una app',
        'El portero solo funciona con las apps que marques aquí.'
      );
      return;
    }

    const byPackage = new Map(installed.map((a) => [a.androidPackage, a]));
    const apps = entries.map(([androidPackage, kind]) => {
      const app = byPackage.get(androidPackage);
      const categoryName = KIND_TO_CATEGORY_NAME[kind];
      return {
        label: app?.label ?? androidPackage,
        androidPackage,
        enabled: true,
        categoryId: categoryByName.get(categoryName) ?? null,
        kind,
      };
    });

    setBusy(true);
    try {
      await saveClassifiedApps(apps);
      setStep('pin');
    } finally {
      setBusy(false);
    }
  };

  const finish = async (withPin: boolean) => {
    if (needsAndroidGate) {
      const latest = await waitForGatePermissions();
      setPerms(latest);
      if (!latest.accessibilityEnabled) {
        Alert.alert(
          'Accesibilidad obligatoria',
          'No puedes terminar sin activar Accesibilidad para WifeApp. Sin eso el portero no funciona.'
        );
        setStep('permissions');
        return;
      }
    }
    if (Object.keys(selected).length === 0) {
      Alert.alert('Faltan apps', 'Debes elegir al menos una app para vigilar.');
      setStep('classify');
      return;
    }

    setBusy(true);
    try {
      if (withPin) {
        if (pin !== confirm) {
          Alert.alert('Los códigos no coinciden');
          return;
        }
        await setEmergencyPin(pin);
      }
      await completeSetup();
      router.replace('/');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo terminar la configuración'
      );
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.body}>Preparando configuración…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>WifeApp</Text>
        <Text style={styles.requiredNote}>Configuración obligatoria para el portero</Text>

        {step === 'welcome' ? (
          <View>
            <Text style={styles.title}>Vamos a activar el portero</Text>
            <Text style={styles.body}>
              En 3 pasos cortos. Sin esto, al abrir el banco u otras apps no
              aparecerá la pregunta de “¿qué vas a hacer?”.
            </Text>
            {STEPS_ANDROID.map((label, index) => (
              <View key={label} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepLabel}>{label}</Text>
              </View>
            ))}
            <PrimaryButton
              label="Empezar"
              onPress={() => setStep('companion')}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : null}

        {step === 'companion' ? (
          <View>
            <Text style={styles.title}>¿Quién te acompaña?</Text>
            <Text style={styles.body}>
              Aparecerá al abrir una app vigilada (amigable) y al registrar el
              gasto (un poco molesto). Puedes cambiarlo después en Ajustes.
            </Text>
            <View style={styles.companionRow}>
              {(
                [
                  { role: 'esposa' as const, label: 'Esposa' },
                  { role: 'esposo' as const, label: 'Esposo' },
                ] as const
              ).map((option) => (
                <Pressable
                  key={option.role}
                  onPress={() => setCompanionRole(option.role)}
                  style={[
                    styles.companionCard,
                    companionRole === option.role && styles.companionCardActive,
                  ]}>
                  <Image
                    source={getCompanionAvatar(option.role, 'friendly')}
                    style={styles.companionImage}
                  />
                  <Text style={styles.companionLabel}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton
              label="Continuar"
              onPress={async () => {
                await setSetting('companionRole', companionRole);
                await setSetting(
                  'userRole',
                  companionRole === 'esposa' ? 'esposo' : 'esposa'
                );
                await reloadSettings();
                setStep(needsAndroidGate ? 'permissions' : 'classify');
              }}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : null}

        {step === 'permissions' ? (
          <View>
            <Text style={styles.title}>Paso 1 · Permisos</Text>
            <Text style={styles.body}>
              Solo necesitas esto. Es como decirle al celular: “avísale a WifeApp
              cuando abra ciertas apps”.
            </Text>

            {needsAndroidGate ? (
              <>
                <View
                  style={[
                    styles.permCard,
                    perms.accessibilityEnabled
                      ? styles.permCardOk
                      : styles.permCardPending,
                  ]}>
                  <Text style={styles.permTitle}>
                    1. Accesibilidad {perms.accessibilityEnabled ? '✓' : '(obligatorio)'}
                  </Text>
                  <Text style={styles.permBody}>
                    Para detectar cuando abres Pichincha, Uber, etc.
                    {'\n\n'}
                    Cómo hacerlo:{'\n'}
                    • Toca el botón de abajo{'\n'}
                    • Busca <Text style={styles.bold}>WifeApp</Text>
                    {'\n'}
                    • Activa el interruptor{'\n'}
                    • Vuelve a esta pantalla
                  </Text>
                  <PrimaryButton
                    label="Activar Accesibilidad"
                    onPress={openAccessibilitySettings}
                    style={{ marginTop: 10 }}
                  />
                  <PrimaryButton
                    label="Ya lo activé · comprobar"
                    variant="secondary"
                    onPress={async () => {
                      const latest = await waitForGatePermissions();
                      setPerms(latest);
                      Alert.alert(
                        latest.accessibilityEnabled
                          ? 'Listo'
                          : 'Aún no está activo',
                        latest.accessibilityEnabled
                          ? 'Accesibilidad OK. Puedes continuar.'
                          : 'No encontramos WifeApp activa. Revisa Ajustes → Accesibilidad → WifeApp.'
                      );
                    }}
                    style={{ marginTop: 8 }}
                  />
                </View>

                <View style={styles.permCard}>
                  <Text style={styles.permTitle}>
                    2. Mostrar sobre otras apps{' '}
                    {perms.overlayAllowed ? '✓' : '(recomendado)'}
                  </Text>
                  <Text style={styles.permBody}>
                    Ayuda a que WifeApp pueda aparecer encima. Si tu celular lo
                    pide, actívalo.
                  </Text>
                  <PrimaryButton
                    label="Abrir permiso de overlay"
                    variant="ghost"
                    onPress={openOverlaySettings}
                    style={{ marginTop: 10 }}
                  />
                </View>

                <PrimaryButton
                  label={
                    perms.accessibilityEnabled
                      ? 'Continuar a elegir apps'
                      : 'Activa Accesibilidad para continuar'
                  }
                  onPress={goToClassify}
                  disabled={!perms.accessibilityEnabled}
                  style={{ marginTop: 8 }}
                />
              </>
            ) : (
              <>
                <Text style={styles.body}>
                  En este dispositivo no se puede interceptar otras apps (iPhone
                  o web). Igual puedes clasificar apps y registrar gastos.
                </Text>
                <PrimaryButton label="Continuar" onPress={() => setStep('classify')} />
              </>
            )}
          </View>
        ) : null}

        {step === 'classify' ? (
          <View>
            <Text style={styles.title}>Paso 2 · Elige apps</Text>
            <Text style={styles.body}>
              Marca las apps con las que quieres que WifeApp interactúe. Sin
              marcar ninguna, el portero no tiene qué vigilar.
            </Text>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar Pichincha, Uber…"
              placeholderTextColor={colors.inkFaint}
              style={styles.search}
              autoCapitalize="none"
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
              {(
                [
                  'todas',
                  'elegidas',
                  'banca',
                  'comida',
                  'movilidad',
                  'entretenimiento',
                ] as const
              ).map((kind) => (
                <Pressable
                  key={kind}
                  onPress={() => setFilterKind(kind)}
                  style={[
                    styles.filterChip,
                    filterKind === kind && styles.filterChipActive,
                  ]}>
                  <Text
                    style={[
                      styles.filterText,
                      filterKind === kind && styles.filterTextActive,
                    ]}>
                    {kind === 'todas'
                      ? 'Todas'
                      : kind === 'elegidas'
                        ? 'Elegidas'
                        : KIND_LABELS[kind]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.metaRow}>
              <Text style={styles.meta}>
                {Object.keys(selected).length} elegidas · {installed.length} detectadas
              </Text>
              <Pressable onPress={loadApps}>
                <Text style={styles.reload}>Actualizar</Text>
              </Pressable>
            </View>

            {loadingApps ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : null}
            {loadError ? <Text style={styles.warn}>{loadError}</Text> : null}

            {visibleApps.map((app) => {
              const isOn = Boolean(selected[app.androidPackage]);
              const kind = selected[app.androidPackage] ?? app.suggestedKind;
              return (
                <View key={app.androidPackage} style={styles.appRow}>
                  <Pressable onPress={() => toggleApp(app)} style={styles.appMain}>
                    <View
                      style={[
                        styles.check,
                        isOn && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appLabel}>{app.label}</Text>
                      <Text style={styles.appPkg}>{app.androidPackage}</Text>
                    </View>
                  </Pressable>
                  {isOn ? (
                    <View style={styles.kindRow}>
                      {(
                        [
                          'banca',
                          'comida',
                          'movilidad',
                          'entretenimiento',
                          'otros',
                        ] as AppKind[]
                      ).map((k) => (
                        <Pressable
                          key={k}
                          onPress={() => changeKind(app.androidPackage, k)}
                          style={[
                            styles.kindChip,
                            kind === k && styles.kindChipActive,
                          ]}>
                          <Text
                            style={[
                              styles.kindText,
                              kind === k && styles.kindTextActive,
                            ]}>
                            {KIND_LABELS[k]}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}

            <PrimaryButton
              label={
                busy
                  ? 'Guardando…'
                  : Object.keys(selected).length === 0
                    ? 'Elige al menos 1 app'
                    : `Continuar con ${Object.keys(selected).length} app(s)`
              }
              onPress={saveAppsAndContinue}
              disabled={busy || loadingApps || Object.keys(selected).length === 0}
              style={{ marginTop: 12 }}
            />
          </View>
        ) : null}

        {step === 'pin' ? (
          <View>
            <Text style={styles.title}>Paso 3 · Código de emergencia</Text>
            <Text style={styles.body}>
              Opcional. Si una categoría se agota, este código permite gastar de
              todas formas.
            </Text>
            <Field
              label="Código (4-6 dígitos)"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              placeholder="••••"
            />
            <Field
              label="Confirmar"
              value={confirm}
              onChangeText={setConfirm}
              keyboardType="number-pad"
              secureTextEntry
              placeholder="••••"
            />
            <PrimaryButton
              label={busy ? 'Guardando…' : 'Guardar código y terminar'}
              onPress={() => finish(true)}
              disabled={busy}
              style={{ marginBottom: 8 }}
            />
            <PrimaryButton
              label="Omitir código y terminar"
              variant="ghost"
              onPress={() => finish(false)}
              disabled={busy}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48 },
  brand: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    letterSpacing: -1,
    color: colors.primary,
    marginBottom: 4,
  },
  requiredNote: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.warning,
    marginBottom: 14,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 24,
    letterSpacing: -0.7,
    color: colors.ink,
    marginBottom: 8,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkMuted,
    marginBottom: 18,
  },
  bold: { fontFamily: 'DMSans_700Bold', color: colors.ink },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  stepNum: {
    width: 28,
    height: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold',
  },
  stepLabel: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
  },
  permCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  permCardOk: {
    borderColor: colors.success,
    backgroundColor: colors.primarySoft,
  },
  permCardPending: {
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  permTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 6,
  },
  permBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
  },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 10,
  },
  filters: { marginBottom: 10 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
    fontSize: 13,
  },
  filterTextActive: { color: '#fff' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  meta: { fontFamily: 'DMSans_500Medium', color: colors.inkMuted },
  reload: { fontFamily: 'DMSans_700Bold', color: colors.primary },
  warn: {
    fontFamily: 'DMSans_400Regular',
    color: colors.warning,
    marginBottom: 10,
  },
  appRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  appMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
  },
  appLabel: { fontFamily: 'DMSans_700Bold', color: colors.ink },
  appPkg: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.inkFaint,
  },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  kindChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  kindText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.inkMuted,
  },
  kindTextActive: {
    color: colors.primary,
    fontFamily: 'DMSans_700Bold',
  },
  companionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  companionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
  },
  companionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  companionImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: '#111',
  },
  companionLabel: {
    marginTop: 10,
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: colors.ink,
  },
});
