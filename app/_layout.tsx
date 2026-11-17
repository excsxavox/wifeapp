import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { BudgetProvider, useBudget } from '@/src/context/BudgetContext';
import { colors } from '@/src/theme/colors';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <BudgetProvider>
      <StatusBar style="dark" />
      <SetupRedirect />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontFamily: 'Manrope_700Bold' },
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false }}
        />

        <Stack.Screen
          name="apps-vigiladas"
          options={{ title: 'Apps vigiladas', presentation: 'card' }}
        />
        <Stack.Screen
          name="metas"
          options={{ title: 'Crear meta', presentation: 'card' }}
        />
        <Stack.Screen
          name="perfil"
          options={{ title: 'Mi perfil', presentation: 'card' }}
        />
        <Stack.Screen
          name="ajustes"
          options={{ title: 'Ajustes', presentation: 'card' }}
        />
        <Stack.Screen
          name="gate"
          options={{
            title: 'Confirmar gasto',
            presentation: 'modal',
          }}
        />
      </Stack>
    </BudgetProvider>
  );
}

function SetupRedirect() {
  const router = useRouter();
  const { ready, settings } = useBudget();

  useEffect(() => {
    if (!ready) return;
    if (settings.authMode === 'none') {
      router.replace('/login');
      return;
    }
    if (!settings.setupComplete) {
      router.replace('/onboarding');
      return;
    }
  }, [ready, settings.authMode, settings.setupComplete, router]);

  return null;
}
