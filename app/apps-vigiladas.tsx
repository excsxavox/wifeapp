import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  getLastDetectedPackage,
  isAppGateAvailable,
  listInstalledApps,
  type InstalledApp,
} from '@/modules/app-gate';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { useBudget } from '@/src/context/BudgetContext';
import {
  KIND_LABELS,
  KIND_TO_CATEGORY_NAME,
  suggestKind,
  type AppKind,
} from '@/src/domain/appCatalog';
import { colors } from '@/src/theme/colors';

export default function AppsVigiladasScreen() {
  const router = useRouter();
  const {
    watchedApps,
    categories,
    setWatchedEnabled,
    addWatched,
    removeWatched,
  } = useBudget();

  const [installed, setInstalled] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingKind, setPendingKind] = useState<Record<string, AppKind>>({});
  const [lastDetected, setLastDetected] = useState<string | null>(null);

  const watchedPackages = useMemo(
    () => new Set(watchedApps.map((a) => a.androidPackage)),
    [watchedApps]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'android' && isAppGateAvailable()) {
        const apps = await listInstalledApps();
        setInstalled(apps);
        const detected = await getLastDetectedPackage();
        setLastDetected(detected.packageName);
      } else {
        setInstalled([]);
      }
    } catch (error) {
      Alert.alert(
        'No se pudieron leer apps',
        error instanceof Error ? error.message : 'Error desconocido'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return installed
      .filter((app) => !watchedPackages.has(app.androidPackage))
      .filter(
        (app) =>
          !q ||
          app.label.toLowerCase().includes(q) ||
          app.androidPackage.toLowerCase().includes(q)
      );
  }, [installed, watchedPackages, search]);

  const register = async (app: InstalledApp) => {
    const kind =
      pendingKind[app.androidPackage] ??
      suggestKind(app.androidPackage, app.label);
    const categoryName = KIND_TO_CATEGORY_NAME[kind];
    const categoryId = categories.find((c) => c.name === categoryName)?.id ?? null;
    await addWatched(app.label, app.androidPackage, categoryId, kind);
  };

  return (
    <Screen
      title="Apps vigiladas"
      subtitle="Se detectan las apps instaladas. Tú eliges con cuáles interactuar.">
      <PrimaryButton
        label="Volver a configurar desde cero"
        variant="secondary"
        onPress={() => router.push('/onboarding')}
        style={{ marginBottom: 10 }}
      />

      {Platform.OS === 'android' ? (
        <View style={styles.detectCard}>
          <Text style={styles.detectTitle}>Última app detectada por Accesibilidad</Text>
          <Text style={styles.detectPkg}>{lastDetected ?? 'Ninguna aún'}</Text>
          <Text style={styles.detectHint}>
            Abre Pichincha u otra app y vuelve aquí. Si el package aparece, ya
            está detectando. Luego agrégala abajo si no está vigilada.
          </Text>
          <PrimaryButton label="Actualizar detección" variant="ghost" onPress={load} />
        </View>
      ) : null}

      <Text style={styles.section}>Ya vigiladas ({watchedApps.length})</Text>
      {watchedApps.map((app) => (
        <View key={app.id} style={styles.row}>
          <View style={styles.meta}>
            <Text style={styles.label}>{app.label}</Text>
            <Text style={styles.pkg}>{app.androidPackage}</Text>
            <Text style={styles.kind}>
              {app.kind
                ? KIND_LABELS[app.kind as AppKind] ?? app.kind
                : 'Sin clasificar'}
            </Text>
          </View>
          <Switch
            value={app.enabled}
            onValueChange={(value) => setWatchedEnabled(app.id, value)}
            trackColor={{ true: colors.primarySoft, false: colors.border }}
            thumbColor={app.enabled ? colors.primary : '#f4f4f4'}
          />
          <Pressable
            onPress={() =>
              Alert.alert('Eliminar', `¿Quitar ${app.label}?`, [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: () => removeWatched(app.id),
                },
              ])
            }
            style={styles.delete}>
            <Text style={styles.deleteText}>✕</Text>
          </Pressable>
        </View>
      ))}

      <Text style={styles.section}>Instaladas en el celular</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar Pichincha, Uber…"
        placeholderTextColor={colors.inkFaint}
        style={styles.search}
        autoCapitalize="none"
      />
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && Platform.OS === 'android' && installed.length === 0 ? (
        <Text style={styles.empty}>
          No se listaron apps. Necesitas el APK nuevo. Vuelve a compilar con EAS.
        </Text>
      ) : null}

      {available.slice(0, 100).map((app) => {
        const kind =
          pendingKind[app.androidPackage] ??
          suggestKind(app.androidPackage, app.label);
        return (
          <View key={app.androidPackage} style={styles.installRow}>
            <View style={styles.meta}>
              <Text style={styles.label}>{app.label}</Text>
              <Text style={styles.pkg}>{app.androidPackage}</Text>
            </View>
            <View style={styles.kindRow}>
              {(
                ['banca', 'comida', 'movilidad', 'entretenimiento', 'otros'] as AppKind[]
              ).map((k) => (
                <Pressable
                  key={k}
                  onPress={() =>
                    setPendingKind((prev) => ({
                      ...prev,
                      [app.androidPackage]: k,
                    }))
                  }
                  style={[styles.kindChip, kind === k && styles.kindChipActive]}>
                  <Text
                    style={[
                      styles.kindChipText,
                      kind === k && styles.kindChipTextActive,
                    ]}>
                    {KIND_LABELS[k]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton
              label="Vigilar"
              onPress={() => register(app)}
              style={{ marginTop: 8 }}
            />
          </View>
        );
      })}

      {Platform.OS !== 'android' && watchedApps[0] ? (
        <PrimaryButton
          label={`Simular apertura: ${watchedApps[0].label}`}
          variant="ghost"
          onPress={() =>
            router.push({
              pathname: '/gate',
              params: { package: watchedApps[0].androidPackage },
            })
          }
          style={{ marginTop: 12 }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  detectCard: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  detectTitle: {
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
    marginBottom: 4,
  },
  detectPkg: {
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
    marginBottom: 6,
  },
  detectHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
    marginBottom: 8,
    lineHeight: 18,
  },
  section: {
    marginTop: 10,
    marginBottom: 8,
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: colors.ink,
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
  empty: {
    fontFamily: 'DMSans_400Regular',
    color: colors.warning,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  installRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  meta: { flex: 1, paddingRight: 8 },
  label: { fontFamily: 'DMSans_700Bold', color: colors.ink },
  pkg: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  kind: {
    marginTop: 4,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.primary,
  },
  delete: { marginLeft: 8, padding: 8 },
  deleteText: { color: colors.danger, fontSize: 16 },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  kindChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  kindChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: colors.ink,
  },
  kindChipTextActive: { color: '#fff' },
});
