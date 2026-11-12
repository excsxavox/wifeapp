import { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLockup } from '@/src/components/BrandMark';
import { colors } from '@/src/theme/colors';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
  right?: ReactNode;
  showBrand?: boolean;
};

export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  refreshing,
  onRefresh,
  style,
  right,
  showBrand = true,
}: Props) {
  const header = (
    <View style={styles.header}>
      {showBrand ? (
        <View style={styles.brandRow}>
          <BrandLockup />
          <Text style={styles.caption}>Tu dinero, con intención.</Text>
        </View>
      ) : null}
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );

  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={[styles.body, style]}>
          {header}
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.body, style]}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
          ) : undefined
        }>
        {header}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  header: {
    marginTop: 4,
    marginBottom: 22,
  },
  brandRow: {
    marginBottom: 18,
  },
  caption: {
    marginTop: 6,
    marginLeft: 46,
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: colors.inkMuted,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headingText: {
    flex: 1,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    letterSpacing: -1,
    color: colors.ink,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 7,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
  },
});
