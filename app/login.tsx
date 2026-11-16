import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { useBudget } from '@/src/context/BudgetContext';
import { getSettings } from '@/src/db/queries';
import {
  continueAsGuest,
  getLocalAccountEmail,
  hasLocalAccount,
  loginLocalAccount,
  registerLocalAccount,
} from '@/src/domain/auth';
import { colors } from '@/src/theme/colors';

type AuthPanel = 'menu' | 'account' | 'email';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reloadSettings } = useBudget();
  const [panel, setPanel] = useState<AuthPanel>('menu');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const exists = await hasLocalAccount();
      const saved = await getLocalAccountEmail();
      if (!active) return;
      setHasAccount(exists);
      if (saved) setEmail(saved);
    })();
    return () => {
      active = false;
    };
  }, []);

  const finishAuth = async () => {
    await reloadSettings();
    const next = await getSettings();
    if (next.setupComplete) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding');
    }
  };

  const onGuest = async () => {
    setBusy(true);
    try {
      await continueAsGuest();
      await finishAuth();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo continuar'
      );
    } finally {
      setBusy(false);
    }
  };

  const onLogin = async () => {
    setBusy(true);
    try {
      await loginLocalAccount(email, password);
      await finishAuth();
    } catch (error) {
      Alert.alert(
        'No se pudo entrar',
        error instanceof Error ? error.message : 'Revisa tus datos'
      );
    } finally {
      setBusy(false);
    }
  };

  const onRegister = async () => {
    setBusy(true);
    try {
      await registerLocalAccount(email, password);
      await finishAuth();
    } catch (error) {
      Alert.alert(
        'No se pudo crear la cuenta',
        error instanceof Error ? error.message : 'Revisa tus datos'
      );
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = () => {
    Alert.alert(
      'Próximamente',
      'Google llegará pronto. Por ahora usa tu cuenta WifeApp o el correo.'
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A3A2C', '#244D3B', '#2F5E48']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>WifeApp</Text>
          <SymbolView
            name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
            tintColor="#FFFFFF"
            size={16}
            style={styles.brandHeart}
          />
        </View>
        <Text style={styles.heroTitle}>Tu dinero, en buenas manos.</Text>
        <Text style={styles.heroSub}>
          Tu pareja virtual para cuidar tus gastos.
        </Text>
        <View style={styles.coupleWrap}>
          <Image
            source={require('../assets/companions/esposo.png')}
            style={[styles.coupleImg, styles.coupleLeft]}
            resizeMode="cover"
          />
          <Image
            source={require('../assets/companions/esposa.png')}
            style={[styles.coupleImg, styles.coupleRight]}
            resizeMode="cover"
          />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.sheetWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetContent}>
            <Text style={styles.welcome}>Bienvenido a WifeApp</Text>

            {panel === 'menu' ? (
              <>
                <AuthButton
                  variant="dark"
                  label="Continuar con cuenta WifeApp"
                  icon="key"
                  onPress={() => setPanel('account')}
                  disabled={busy}
                />
                <AuthButton
                  variant="outline"
                  label="Continuar con Google"
                  icon="google"
                  onPress={onGoogle}
                  disabled={busy}
                />
                <AuthButton
                  variant="outline"
                  label="Continuar con correo"
                  icon="mail"
                  onPress={() => setPanel('email')}
                  disabled={busy}
                />
                <Pressable
                  onPress={onGuest}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.guestLink,
                    pressed && { opacity: 0.7 },
                  ]}>
                  {busy ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text style={styles.guestText}>Continuar sin cuenta</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <View style={styles.form}>
                <Pressable
                  onPress={() => setPanel('menu')}
                  style={styles.backRow}>
                  <Text style={styles.backText}>← Volver</Text>
                </Pressable>
                <Text style={styles.formTitle}>
                  {panel === 'account'
                    ? hasAccount
                      ? 'Entra con tu cuenta'
                      : 'Crea tu cuenta WifeApp'
                    : 'Continuar con correo'}
                </Text>
                <Text style={styles.fieldLabel}>Correo</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="tu@correo.com"
                  placeholderTextColor="#A5AE9C"
                  style={styles.input}
                />
                <Text style={styles.fieldLabel}>Contraseña</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#A5AE9C"
                  style={styles.input}
                />
                {hasAccount ? (
                  <>
                    <AuthButton
                      variant="dark"
                      label={busy ? 'Entrando…' : 'Entrar'}
                      onPress={onLogin}
                      disabled={busy}
                    />
                    <AuthButton
                      variant="outline"
                      label="Crear otra cuenta"
                      onPress={onRegister}
                      disabled={busy}
                    />
                  </>
                ) : (
                  <AuthButton
                    variant="dark"
                    label={busy ? 'Creando…' : 'Crear cuenta y continuar'}
                    onPress={onRegister}
                    disabled={busy}
                  />
                )}
              </View>
            )}

            <Text style={styles.legal}>
              Al continuar, aceptas los{' '}
              <Text style={styles.legalLink}>Términos</Text> y la{' '}
              <Text style={styles.legalLink}>Privacidad</Text>.
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function AuthButton({
  label,
  onPress,
  variant,
  icon,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant: 'dark' | 'outline';
  icon?: 'key' | 'google' | 'mail';
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.authBtn,
        variant === 'dark' ? styles.authBtnDark : styles.authBtnOutline,
        (pressed || disabled) && { opacity: 0.75 },
      ]}>
      {icon === 'key' ? (
        <SymbolView
          name={{ ios: 'key.fill', android: 'vpn_key', web: 'vpn_key' }}
          tintColor="#FFFFFF"
          size={18}
        />
      ) : null}
      {icon === 'mail' ? (
        <SymbolView
          name={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }}
          tintColor={colors.primary}
          size={18}
        />
      ) : null}
      {icon === 'google' ? <Text style={styles.googleG}>G</Text> : null}
      <Text
        style={[
          styles.authBtnLabel,
          variant === 'outline' && styles.authBtnLabelDark,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  hero: {
    flex: 1.05,
    paddingHorizontal: 24,
    minHeight: 280,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 18,
  },
  brand: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  brandHeart: {
    marginTop: 1,
  },
  heroTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 32,
    lineHeight: 38,
    color: '#FFFFFF',
    letterSpacing: -0.8,
    maxWidth: 280,
  },
  heroSub: {
    marginTop: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.82)',
    maxWidth: 260,
  },
  coupleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 8,
    gap: -28,
  },
  coupleImg: {
    width: 148,
    height: 168,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: '#163328',
  },
  coupleLeft: {
    transform: [{ rotate: '-4deg' }, { translateY: 8 }],
    zIndex: 1,
  },
  coupleRight: {
    transform: [{ rotate: '5deg' }, { translateY: 0 }],
    zIndex: 2,
  },
  sheetWrap: {
    flex: 1.15,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -18,
    paddingTop: 22,
    paddingHorizontal: 22,
  },
  sheetContent: {
    paddingBottom: 8,
  },
  welcome: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    color: colors.primary,
    marginBottom: 18,
    letterSpacing: -0.4,
  },
  authBtn: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  authBtnDark: {
    backgroundColor: '#111111',
  },
  authBtnOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E6DE',
  },
  authBtnLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  authBtnLabelDark: {
    color: colors.ink,
  },
  googleG: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: '#4285F4',
  },
  guestLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  guestText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: colors.primary,
  },
  form: {
    marginBottom: 8,
  },
  backRow: {
    marginBottom: 10,
  },
  backText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.inkMuted,
  },
  formTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.ink,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FCFDF9',
    borderWidth: 1,
    borderColor: '#DFE5D8',
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    marginBottom: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.ink,
  },
  legal: {
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    lineHeight: 16,
    color: colors.inkFaint,
  },
  legalLink: {
    textDecorationLine: 'underline',
    color: colors.inkMuted,
  },
});
