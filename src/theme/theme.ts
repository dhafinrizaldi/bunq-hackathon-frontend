export const theme = {
  colors: {
    // Backgrounds — three elevation levels
    background:     '#0A0A0A',
    surface:        '#1A1A1A',
    surfaceElevated:'#242424',
    bgRaised:       '#1A1A1A',   // = surface (semantic alias)
    bgElevated:     '#242424',   // = surfaceElevated (semantic alias)

    // Text hierarchy
    textPrimary:   '#FFFFFF',
    textSecondary: '#9A9A9A',
    textTertiary:  '#5A5A5A',   // timestamps, micro labels
    onAccent:      '#0A0A0A',   // text/icons sitting on accentPrimary bg

    // Brand accent
    accentPrimary: '#00DC78',
    accentSubtle:  'rgba(0,220,120,0.15)',

    // Semantic
    positive:       '#00DC78',
    negative:       '#FF5C5C',
    voiceIndicator: '#FF3B3B',

    // Structure
    border:   '#2A2A2A',
    divider:  '#1E1E1E',  // inset 16px from left for mandatory list dividers
  },

  typography: {
    display:     { fontSize: 36, fontWeight: '700' as const, lineHeight: 44 },
    hero:        { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
    heading:     { fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
    bodyMedium:  { fontSize: 15, fontWeight: '400' as const, lineHeight: 20 },
    bodyStrong:  { fontSize: 15, fontWeight: '600' as const, lineHeight: 20 },
    label:       { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
    labelStrong: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
    moneySmall:  { fontSize: 15, fontWeight: '700' as const, lineHeight: 20 },
    micro:       { fontSize: 11, fontWeight: '600' as const, lineHeight: 14, letterSpacing: 0.5 },
  },

  fonts: {
    weights: {
      regular:  '400' as const,
      semibold: '600' as const,
      bold:     '700' as const,
    },
  },

  radii: {
    sm:   8,    // chips, tags, small UI elements
    md:   12,   // default buttons and cards
    lg:   16,   // large cards
    xl:   20,   // hero cards
    full: 9999, // pill shapes (chips, avatars) and FAB
    // backward-compat aliases — existing code still resolves
    button: 12,
    card:   16,
    fab:    28,
  },

  spacing: {
    xs:   4,
    sm:   8,
    md:   12,
    base: 16,
    lg:   20,
    xl:   24,
    xxl:  32,
  },
} as const;
