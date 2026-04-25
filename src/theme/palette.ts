export const accents = {
  magenta: '#E63E80',
  cyan:    '#3EBFE6',
  lime:    '#A0E63E',
  yellow:  '#F5C12E',
  orange:  '#F58A2E',
  purple:  '#A85EE6',
} as const;

export type AccentKey = keyof typeof accents;

// Deterministic accent assignment for merchants, contacts, categories.
// Same string always gets the same color — stable across re-renders.
export function accentForKey(key: string): AccentKey {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const keys = Object.keys(accents) as AccentKey[];
  return keys[hash % keys.length];
}

// 15% opacity tints — used as card backgrounds on pure black
export const accentTints = {
  magenta: 'rgba(230, 62, 128, 0.15)',
  cyan:    'rgba(62, 191, 230, 0.15)',
  lime:    'rgba(160, 230, 62, 0.15)',
  yellow:  'rgba(245, 193, 46, 0.15)',
  orange:  'rgba(245, 138, 46, 0.15)',
  purple:  'rgba(168, 94, 230, 0.15)',
} as const;

// Light accents (lime/yellow) need dark text; dark accents need white text
export const accentNeedsInverseText: Record<AccentKey, boolean> = {
  magenta: false,
  cyan:    false,
  lime:    true,
  yellow:  true,
  orange:  false,
  purple:  false,
};
