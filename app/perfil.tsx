import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ProfileAvatar } from '@/src/components/ProfileAvatar';
import { Screen } from '@/src/components/Screen';
import { useBudget } from '@/src/context/BudgetContext';
import { setSetting } from '@/src/db/queries';
import type { CompanionRole } from '@/src/db/types';
import { clearAuthSession } from '@/src/domain/auth';
import { getCompanionAvatar } from '@/src/theme/companions';
import { colors } from '@/src/theme/colors';

export default function PerfilScreen() {
  const router = useRouter();
  const { settings, reloadSettings } = useBudget();
  const companionRole = settings.companionRole ?? 'esposa';

  const saveCompanion = async (role: CompanionRole) => {
    await setSetting('companionRole', role);
    await reloadSettings();
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

  return (
    <Screen
      title="Mi perfil"
      subtitle="Tu cuenta y quién te acompaña en el portero."
      showBrand={false}>
      <View style={styles.hero}>
        <ProfileAvatar size={96} />
        <Text style={styles.heroTitle}>Tu perfil</Text>
        <Text style={styles.heroSub}>
          Avatar animado de la cabecera. Nunca usa fotos de esposa/esposo.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Compañero / compañera</Text>
        <Text style={styles.cardBody}>
          Solo para el portero y el coach. No cambia el icono de arriba.
        </Text>
        <View style={styles.row}>
          {(
            [
              { role: 'esposa' as const, label: 'Esposa' },
              { role: 'esposo' as const, label: 'Esposo' },
            ] as const
          ).map((option) => (
            <Pressable
              key={option.role}
              onPress={() => saveCompanion(option.role)}
              style={[
                styles.option,
                companionRole === option.role && styles.optionActive,
              ]}>
              <Image
                source={getCompanionAvatar(option.role, 'friendly')}
                style={styles.optionImage}
                resizeMode="cover"
              />
              <Text style={styles.optionLabel}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Link href="/ajustes" asChild>
        <Pressable style={styles.linkCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>Ajustes</Text>
            <Text style={styles.linkSub}>
              Código de emergencia, moneda y permisos
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </Link>

      <PrimaryButton
        label="Cerrar sesión"
        variant="danger"
        onPress={signOut}
        style={{ marginTop: 16 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginBottom: 18,
  },
  heroTitle: {
    marginTop: 14,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    color: colors.ink,
  },
  heroSub: {
    marginTop: 6,
    maxWidth: 280,
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 6,
  },
  cardBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 19,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  option: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionImage: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    backgroundColor: '#111',
  },
  optionLabel: {
    marginTop: 8,
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  linkTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: colors.primary,
  },
  linkSub: {
    marginTop: 3,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
  },
  chevron: {
    fontSize: 22,
    color: '#A3AD97',
  },
});
