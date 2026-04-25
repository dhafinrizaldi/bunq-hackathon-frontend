// DESIGN PREVIEW — dev only. Remove from navigator before shipping.
// Mount via: AppNavigator dev tab or temporarily replace App.tsx return value.
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import { accents } from '../theme/palette';
import type { AccentKey } from '../theme/palette';
import { Text } from '../components/ui/Text';
import { Money } from '../components/ui/Money';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RainbowStripe } from '../components/ui/RainbowStripe';
import { CategoryIcon } from '../components/ui/CategoryIcon';

const ACCENT_KEYS = Object.keys(accents) as AccentKey[];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="labelUpper" color="tertiary" style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

export default function DesignPreviewScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Typography */}
        <Section title="Typography">
          <Text variant="hero">Hero 40 Black</Text>
          <Text variant="title">Title 26 Bold</Text>
          <Text variant="heading">Heading 19 Bold</Text>
          <Text variant="body">Body 15 Regular — the quick brown fox</Text>
          <Text variant="bodyMedium">Body Medium 15</Text>
          <Text variant="bodyStrong">Body Strong 15 Semibold</Text>
          <Text variant="label">Label 13 Medium</Text>
          <Text variant="labelStrong">Label Strong 13</Text>
          <Text variant="labelUpper">Label Upper 13</Text>
          <Text variant="micro">Micro 11</Text>
          <Text variant="money">€47.80</Text>
          <Text variant="moneyHero">€1,204.50</Text>
          <Text variant="moneyMedium">€89.00</Text>
        </Section>

        {/* Palette swatches */}
        <Section title="Accent Palette">
          <View style={styles.row}>
            {ACCENT_KEYS.map(k => (
              <View key={k} style={[styles.swatch, { backgroundColor: theme.colors.accents[k] }]}>
                <Text variant="micro" color="inverse">{k}</Text>
              </View>
            ))}
          </View>
          <View style={styles.row}>
            {ACCENT_KEYS.map(k => (
              <View key={k} style={[styles.swatch, { backgroundColor: theme.colors.accentTints[k] }]}>
                <Text variant="micro" color="secondary">{k}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* Money */}
        <Section title="Money Component">
          <View style={styles.moneyRow}>
            <Money amountCents={4780}  currency="EUR" size="small" />
            <Money amountCents={4780}  currency="EUR" size="medium" />
            <Money amountCents={4780}  currency="EUR" size="large" />
          </View>
          <Money amountCents={120450} currency="EUR" size="hero" />
          <Money amountCents={-3200}  currency="EUR" size="medium" color="negative" />
          <Money amountCents={4780}   currency="EUR" size="medium" color="cyan" />
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <Button label="Primary — White Pill" onPress={() => {}} variant="primary" />
          <View style={styles.gap} />
          <Button label="Accent — Cyan" onPress={() => {}} variant="accent" accent="cyan" />
          <View style={styles.gap} />
          <Button label="Accent — Magenta" onPress={() => {}} variant="accent" accent="magenta" />
          <View style={styles.gap} />
          <Button label="Secondary" onPress={() => {}} variant="secondary" />
          <View style={styles.gap} />
          <Button label="Ghost" onPress={() => {}} variant="ghost" />
          <View style={styles.gap} />
          <Button label="Destructive" onPress={() => {}} variant="destructive" />
          <View style={styles.gap} />
          <Button label="Loading…" onPress={() => {}} variant="primary" loading />
          <View style={styles.gap} />
          <Button label="Disabled" onPress={() => {}} variant="primary" disabled />
        </Section>

        {/* Cards */}
        <Section title="Cards">
          <Card variant="default" style={styles.cardDemo}>
            <Text variant="heading">Default card</Text>
            <Text variant="body" color="secondary">bgRaised background, no border</Text>
          </Card>
          <View style={styles.gap} />
          {(['magenta', 'cyan', 'lime', 'yellow'] as AccentKey[]).map(a => (
            <View key={a} style={styles.gap}>
              <Card variant="accent" accent={a} style={styles.cardDemo}>
                <Text variant="heading">{a} tint</Text>
                <Money amountCents={4780} currency="EUR" size="medium" />
              </Card>
            </View>
          ))}
          <View style={styles.gap} />
          {(['magenta', 'cyan', 'lime', 'yellow'] as AccentKey[]).map(a => (
            <View key={a} style={styles.gap}>
              <Card variant="solid" accent={a} style={styles.cardDemo}>
                <Text variant="heading" color="inverse">{a} solid</Text>
                <Money amountCents={4780} currency="EUR" size="medium" color="inverse" />
              </Card>
            </View>
          ))}
        </Section>

        {/* Category icons */}
        <Section title="Category Icons">
          <View style={styles.row}>
            {ACCENT_KEYS.map((k, i) => (
              <CategoryIcon
                key={k}
                initials={['Café', 'Tom', 'AB', 'FX', 'GH', 'ZZ'][i]}
                accent={k}
                size={48}
              />
            ))}
          </View>
          <View style={styles.row}>
            {ACCENT_KEYS.map(k => (
              <CategoryIcon
                key={k}
                icon="restaurant-outline"
                accent={k}
                size={44}
              />
            ))}
          </View>
        </Section>

        {/* Rainbow stripe */}
        <Section title="Rainbow Stripe">
          <RainbowStripe height={8} />
          <View style={styles.gap} />
          <RainbowStripe height={4} />
        </Section>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  container: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
    gap: 0,
  },
  section: {
    marginTop: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  sectionLabel: {
    marginBottom: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.xl,
    flexWrap: 'wrap',
  },
  swatch: {
    width: 52,
    height: 52,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDemo: {
    gap: theme.spacing.xs,
  },
  gap: {
    height: theme.spacing.sm,
  },
});
