import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { home, homeFonts, type SymbolName } from '@/src/theme/home';

export type AttentionItem = {
  key: string;
  title: string;
  meta: string;
  cta: string;
  icon: SymbolName;
  tint: string;
  ink: string;
  onPress: () => void;
};

type Props = {
  items: AttentionItem[];
  /** Companion's line above the list. */
  quote: string;
  /** Second line of the calm state. */
  calmDetail: string;
};

/** Everything that needs an action, in one place. Collapses to one calm line when empty. */
export function AttentionCard({ items, quote, calmDetail }: Props) {
  if (items.length === 0) {
    return (
      <View style={styles.calm}>
        <View style={styles.calmIcon}>
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            tintColor="#FFFFFF"
            size={18}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.calmTitle}>Todo en orden</Text>
          <Text style={styles.calmBody}>{calmDetail}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.title}>Necesita tu atención · {items.length}</Text>
        <Text style={styles.quote}>{quote}</Text>
      </View>
      {items.map((item) => (
        <View key={item.key} style={styles.row}>
          <View style={[styles.icon, { backgroundColor: item.tint }]}>
            <SymbolView name={item.icon} tintColor={item.ink} size={20} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.rowMeta} numberOfLines={2}>
              {item.meta}
            </Text>
          </View>
          <Pressable
            onPress={item.onPress}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel={`${item.cta}: ${item.title}`}>
            <Text style={styles.ctaText}>{item.cta}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  calm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: home.greenSoft,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  calmIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: home.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calmTitle: {
    fontFamily: homeFonts.bold,
    fontSize: 15,
    color: home.greenInk,
  },
  calmBody: {
    marginTop: 1,
    fontFamily: homeFonts.body,
    fontSize: 13,
    color: home.greenInkSoft,
  },
  card: {
    backgroundColor: home.orangeSoft,
    borderRadius: 22,
    padding: 16,
    gap: 10,
  },
  title: {
    fontFamily: homeFonts.heading,
    fontSize: 18,
    color: home.ink,
  },
  quote: {
    marginTop: 2,
    fontFamily: homeFonts.body,
    fontSize: 13,
    color: home.quoteInk,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: home.surface,
    borderRadius: 16,
    padding: 12,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: homeFonts.bold,
    fontSize: 15,
    color: home.ink,
  },
  rowMeta: {
    marginTop: 1,
    fontFamily: homeFonts.body,
    fontSize: 12,
    color: home.muted,
  },
  cta: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: home.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: homeFonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
