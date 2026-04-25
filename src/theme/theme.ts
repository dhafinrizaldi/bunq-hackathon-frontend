import { accents, accentTints } from './palette';

// ─── Colors ───────────────────────────────────────────────────────
const colors = {
  // === New bunq-style backgrounds ===
  bgBase:      '#000000',   // pure black — main screens
  bgRaised:    '#0E0E12',   // cards on pure black
  bgElevated:  '#1A1A20',   // modals, sheets, elevated surfaces
  bgPressed:   '#262630',   // pressed state fill

  // === Text hierarchy ===
  textPrimary:   '#FFFFFF',
  textSecondary: '#A8A8B0',
  textTertiary:  '#6E6E78',
  textInverse:   '#000000',  // on saturated/light backgrounds

  // === Semantic ===
  positive:     '#5FE3A0',
  positiveSoft: 'rgba(95, 227, 160, 0.12)',
  negative:     '#F25555',
  negativeSoft: 'rgba(242, 85, 85, 0.12)',
  recording:    '#FF3B30',   // mic active state

  // === Multi-accent palette ===
  accents,
  accentTints,

  // ─── Backward-compat aliases — screens still reference these until phase 2 migration ───
  background:      '#000000',
  surface:         '#0E0E12',
  surfaceElevated: '#1A1A20',
  bgElevated_OLD:  '#1A1A20',  // ← remove after full migration
  accentPrimary:   '#3EBFE6',  // temporarily maps to cyan; removed in phase 2
  accentSubtle:    'rgba(62, 191, 230, 0.15)',
  onAccent:        '#000000',
  voiceIndicator:  '#FF3B30',
  border:          '#1A1A20',
  divider:         '#0E0E12',
} as const;

// ─── Typography ───────────────────────────────────────────────────
// Geist font swap: set USE_GEIST = true after adding .ttf files to /assets/fonts/
// and uncommenting the useFonts() block in App.tsx.
const USE_GEIST = false;
const sans = USE_GEIST ? 'Geist' : undefined;        // undefined = system font
const mono = USE_GEIST ? 'GeistMono' : undefined;    // undefined = system mono

const fontWeights = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
  black:    '800' as const,
};

const fontSize = {
  hero:    40,
  display: 32,
  title:   26,
  heading: 19,
  body:    15,
  label:   13,
  micro:   11,
};

const typography = {
  // === New variants for UI components ===
  hero:        { fontFamily: sans, fontSize: fontSize.hero,    fontWeight: fontWeights.black,   letterSpacing: -0.6, lineHeight: 44 },
  title:       { fontFamily: sans, fontSize: fontSize.title,   fontWeight: fontWeights.bold,    letterSpacing: -0.2, lineHeight: 32 },
  heading:     { fontFamily: sans, fontSize: fontSize.heading,  fontWeight: fontWeights.bold,    letterSpacing: -0.2, lineHeight: 24 },
  body:        { fontFamily: sans, fontSize: fontSize.body,     fontWeight: fontWeights.regular, letterSpacing:  0,   lineHeight: 22 },
  bodyMedium:  { fontFamily: sans, fontSize: fontSize.body,     fontWeight: fontWeights.medium,  letterSpacing:  0,   lineHeight: 22 },
  bodyStrong:  { fontFamily: sans, fontSize: fontSize.body,     fontWeight: fontWeights.semibold,letterSpacing:  0,   lineHeight: 22 },
  label:       { fontFamily: sans, fontSize: fontSize.label,    fontWeight: fontWeights.medium,  letterSpacing:  0,   lineHeight: 18 },
  labelStrong: { fontFamily: sans, fontSize: fontSize.label,    fontWeight: fontWeights.semibold,letterSpacing:  0,   lineHeight: 18 },
  labelUpper:  { fontFamily: sans, fontSize: fontSize.label,    fontWeight: fontWeights.semibold,letterSpacing: 0.6,  lineHeight: 18, textTransform: 'uppercase' as const },
  micro:       { fontFamily: sans, fontSize: fontSize.micro,    fontWeight: fontWeights.semibold,letterSpacing: 0.6,  lineHeight: 14, textTransform: 'uppercase' as const },
  // Money variants — monospace for tabular figures
  money:       { fontFamily: mono, fontSize: fontSize.display,  fontWeight: fontWeights.bold,    letterSpacing: -0.6, lineHeight: 40 },
  moneyHero:   { fontFamily: mono, fontSize: fontSize.hero,     fontWeight: fontWeights.black,   letterSpacing: -0.6, lineHeight: 48 },
  moneyMedium: { fontFamily: mono, fontSize: fontSize.heading,  fontWeight: fontWeights.bold,    letterSpacing: -0.2, lineHeight: 24 },
  // backward-compat alias used by existing screens (remove in phase 2)
  moneySmall:  { fontFamily: mono, fontSize: fontSize.body,     fontWeight: fontWeights.bold,    letterSpacing: -0.2, lineHeight: 20 },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────
const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 40,
} as const;

// ─── Radius ───────────────────────────────────────────────────────
const radii = {
  sm:   8,
  md:   14,
  lg:   20,
  xl:   28,
  full: 9999,
  // backward-compat aliases
  button: 14,
  card:   20,
  fab:    28,
} as const;

// ─── Fonts (backward compat) ──────────────────────────────────────
const fonts = {
  weights: fontWeights,
};

// ─── Main export ──────────────────────────────────────────────────
export const theme = {
  colors,
  typography,
  fonts,
  radii,
  spacing,
} as const;

export type { AccentKey } from './palette';
export { accentForKey, accentNeedsInverseText } from './palette';
