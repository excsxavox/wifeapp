import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/Screen';
import { colors } from '@/src/theme/colors';

type LinkItem = { href: Href; title: string; subtitle: string; icon: string };

const SECTIONS: { title: string; items: LinkItem[] }[] = [
  {
    title: 'Tu progreso',
    items: [
      {
        href: '/metas' as Href,
        title: 'Metas de ahorro',
        subtitle: 'Viaje, fondo… y su progreso',
        icon: '⚑',
      },
      {
        href: '/constancia',
        title: 'Constancia y rangos',
        subtitle: 'Racha, niveles y cómo subir',
        icon: '✦',
      },
      {
        href: '/metricas',
        title: 'Métricas KDA',
        subtitle: 'Aciertos, deslices y detalle',
        icon: '▦',
      },
    ],
  },
  {
    title: 'Dinero',
    items: [
      {
        href: '/historial',
        title: 'Historial',
        subtitle: 'Todo lo registrado este período',
        icon: '☰',
      },
      {
        href: '/apps-vigiladas',
        title: 'Apps vigiladas',
        subtitle: 'Qué apps cuida el portero',
        icon: '🛡',
      },
    ],
  },
  {
    title: 'Cuenta',
    items: [
      {
        href: '/perfil',
        title: 'Mi perfil',
        subtitle: 'Avatar animado y compañero/a',
        icon: '☺',
      },
      {
        href: '/ajustes',
        title: 'Ajustes',
        subtitle: 'PIN, moneda, permisos y cerrar sesión',
        icon: '⚙',
      },
    ],
  },
];

export default function MasScreen() {
  const router = useRouter();

  return (
    <Screen
      title="Más"
      subtitle="Todo lo que necesitas, en su lugar."
      brandMinimal>
      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menu}>
            {section.items.map((link) => (
              <Pressable
                key={link.title}
                style={styles.item}
                onPress={() => router.push(link.href)}>
                <View style={styles.iconWrap}>
                  <Text style={styles.icon}>{link.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{link.title}</Text>
                  <Text style={styles.itemSub}>{link.subtitle}</Text>
                </View>
                <Text style={styles.chev}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    color: colors.ink,
    marginBottom: 10,
  },
  menu: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E7F0D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
    color: colors.primary,
  },
  itemTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: colors.ink,
  },
  itemSub: {
    marginTop: 3,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
  },
  chev: {
    fontSize: 22,
    color: '#A3AD97',
  },
});
