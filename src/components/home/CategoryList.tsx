import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import type { CategoryBudgetStatus } from '@/src/db/types';
import { formatMoneyShort } from '@/src/domain/money';
import { categoryLook, home, homeFonts } from '@/src/theme/home';

type Props = {
  statuses: CategoryBudgetStatus[];
  currency: string;
  onSeeAll: () => void;
  /** Two or more columns (inside the month card on wide screens). */
  columns?: boolean;
  /** Draw its own card (phone) or sit inside another one (wide). */
  framed?: boolean;
};

/** All categories, tightest first, each saying how much is left. */
export function CategoryList({ statuses, currency, onSeeAll, columns = false, framed = true }: Props) {
  const sorted = [...statuses].sort((a, b) => b.percent - a.percent);

  return (
    <View style={framed ? styles.card : null}>
      <View style={styles.heading}>
        <Text style={styles.title}>Dónde va el dinero</Text>
        <Pressable onPress={onSeeAll} hitSlop={10} accessibilityRole="link">
          <Text style={styles.link}>Presupuesto ›</Text>
        </Pressable>
      </View>

      {sorted.length === 0 ? (
        <Text style={styles.empty}>Todavía no hay categorías. Crea tu presupuesto para verlas aquí.</Text>
      ) : (
        <View style={columns ? styles.grid : styles.list}>
          {sorted.map((status) => {
            const look = categoryLook(status.name, status.id);
            const over = status.overBudget || status.remaining < 0;
            const tight = !over && status.percent >= 80;
            const width = `${Math.min(100, Math.max(0, Math.round(status.percent)))}%` as const;
            return (
              <View key={status.id} style={[styles.item, columns && styles.itemColumn]}>
                <View style={[styles.icon, { backgroundColor: look.tint }]}>
                  <SymbolView name={look.icon} tintColor={look.ink} size={20} />
                </View>
                <View style={styles.main}>
                  <View style={styles.line}>
                    <Text style={styles.name} numberOfLines={1}>
                      {status.name}
                    </Text>
                    {over ? (
                      <Text style={[styles.note, styles.noteBad]}>
                        Te pasaste {formatMoneyShort(Math.abs(status.remaining), currency)}
                      </Text>
                    ) : (
                      <Text style={[styles.note, tight && styles.noteWarn]}>
                        quedan{' '}
                        <Text style={tight ? null : styles.noteStrong}>
                          {formatMoneyShort(status.remaining, currency)}
                        </Text>
                      </Text>
                    )}
                  </View>
                  <View style={styles.track}>
                    <View
                      style={[styles.fill, { width, backgroundColor: over ? home.bad : look.bar }]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: home.surface,
    borderWidth: 1,
    borderColor: home.line,
    borderRadius: 24,
    padding: 18,
  },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: homeFonts.heading,
    fontSize: 18,
    color: home.ink,
  },
  link: {
    fontFamily: homeFonts.semibold,
    fontSize: 13,
    color: home.orangeInk,
  },
  empty: {
    fontFamily: homeFonts.body,
    fontSize: 14,
    color: home.muted,
  },
  list: {
    gap: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 24,
    rowGap: 14,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemColumn: {
    flexGrow: 1,
    flexBasis: 220,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontFamily: homeFonts.semibold,
    fontSize: 14,
    color: home.ink,
  },
  note: {
    fontFamily: homeFonts.body,
    fontSize: 14,
    color: home.muted,
  },
  noteStrong: {
    fontFamily: homeFonts.numberBold,
    color: home.ink,
  },
  noteWarn: {
    fontFamily: homeFonts.numberBold,
    color: home.warnInk,
  },
  noteBad: {
    fontFamily: homeFonts.numberBold,
    color: home.bad,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: home.track,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});
