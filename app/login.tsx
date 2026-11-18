import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { showAlert } from '@/src/domain/feedback';
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
  const { height: windowHeight } = useWindowDimensions();
  const { reloadSettings } = useBudget();
  const [panel, setPanel] = useState<AuthPanel>('menu');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);

  // En pantallas altas el flex libre dejaba un hueco verde enorme; limitamos el hero.
  const heroHeight = Math.min(Math.max(windowHeight * 0.38, 250), 320);

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
      showAlert('Error', error instanceof Error ? error.message : 'No se pudo continuar');
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
      showAlert('No se pudo entrar', error instanceof Error ? error.message : 'Revisa tus datos');
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
      showAlert('No se pudo crear la cuenta', error instanceof Error ? error.message : 'Revisa tus datos');
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = () => {
    showAlert('Próximamente', 'Google llegará pronto. Por ahora usa tu cuenta WifeApp o el correo.');
  };

  const heroBlockHeight = heroHeight + insets.top;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#FFC49A', '#FFB27A', '#F0A06A']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[
          styles.hero,
          {
            height: heroBlockHeight,
            paddingTop: insets.top + 10,
          },
        ]}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>WifeApp</Text>
          <SymbolView
            name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
            tintColor={colors.ink}
            size={16}
            style={styles.brandHeart}
          />
        </View>
        <Text style={styles.heroTitle}>Tu dinero, en buenas manos.</Text>
        <Text style={styles.heroSub}>
          Tu pareja virtual para cuidar tus gastos.
        </Text>
      </LinearGradient>

      {/* Fuera del gradient: en Android overflow:hidden recorta si van dentro. */}
      <View
        pointerEvents="none"
        style={[styles.coupleWrap, { top: heroBlockHeight - 118 }]}>
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

      <KeyboardAvoidingView
        style={[styles.sheetWrap, { marginTop: -28 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
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
                    <ActivityIndicator color={colors.primaryMid} />
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
          tintColor={colors.primaryMid}
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
    width: '100%',
    paddingHorizontal: 24,
    zIndex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  brand: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  brandHeart: {
    marginTop: 1,
  },
  heroTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    lineHeight: 34,
    color: colors.ink,
    letterSpacing: -0.8,
    maxWidth: 280,
  },
  heroSub: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(58, 42, 31, 0.72)',
    maxWidth: 260,
  },
  coupleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 150,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: -24,
    zIndex: 2,
  },
  coupleImg: {
    width: 128,
    height: 146,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: '#E89555',
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
    flex: 1,
    zIndex: 3,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 22,
    paddingHorizontal: 22,
  },
  sheetContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  welcome: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    color: colors.ink,
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
    color: colors.primaryMid,
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
