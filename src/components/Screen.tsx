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

import { AppTopBar } from '@/src/components/AppTopBar';
import { colors } from '@/src/theme/colors';

type Props = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
  right?: ReactNode;
  showBrand?: boolean;
  brandMinimal?: boolean;
  showHeading?: boolean;
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
  brandMinimal = false,
  showHeading = true,
}: Props) {
  const brand = showBrand ? (
    <View style={styles.brandWrap}>
      <AppTopBar minimal={brandMinimal} showCaption={!brandMinimal} />
    </View>
  ) : null;

  const heading =
    showHeading && title ? (
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    ) : null;

  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={[styles.body, style]}>
          {brand}
          {heading}
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {brand}
      <ScrollView
        contentContainerStyle={[styles.body, style]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
          ) : undefined
        }>
        {heading}
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
  brandWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    zIndex: 10,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
    marginBottom: 22,
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
