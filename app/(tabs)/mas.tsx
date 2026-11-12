import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/Screen';
import { colors } from '@/src/theme/colors';

const LINKS: Array<{ href: Href; title: string; subtitle: string }> = [
  {
    href: '/metas' as Href,
    title: 'Metas de ahorro',
    subtitle: 'Viaje, fondo… y su progreso visual',
  },
  {
    href: '/historial',
    title: 'Historial de movimientos',
    subtitle: 'Todo lo que registraste este período',
  },
  {
    href: '/apps-vigiladas',
    title: 'Apps vigiladas',
    subtitle: 'Elige con qué apps interactúa el portero',
  },
  {
    href: '/ajustes',
    title: 'Ajustes',
    subtitle: 'Permisos, moneda y código de emergencia',
  },
  {
    href: '/onboarding',
    title: 'Configuración inicial',
    subtitle: 'Repite el setup del portero',
  },
];

export default function MasScreen() {
  const router = useRouter();

  return (
    <Screen title="Todo en su lugar." subtitle="Sigue explorando tu espacio.">
      <View style={styles.menu}>
        {LINKS.map((link) => (
          <Pressable
            key={link.title}
            style={styles.item}
            onPress={() => router.push(link.href)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{link.title}</Text>
              <Text style={styles.itemSub}>{link.subtitle}</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  menu: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    padding: 17,
  },
  itemTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: colors.primary,
  },
  itemSub: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
  },
  chev: {
    fontSize: 22,
    color: colors.inkFaint,
    marginLeft: 8,
  },
});
