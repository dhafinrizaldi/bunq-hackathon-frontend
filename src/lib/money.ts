// "47.80" → 4780  (backend amounts come as decimal strings)
export function decimalStringToCents(str: string): number {
  return Math.round((parseFloat(str) || 0) * 100);
}
// decimalStringToCents("47.80") → 4780 ✓
// decimalStringToCents("0.01") → 1 ✓
// decimalStringToCents("100.00") → 10000 ✓
// decimalStringToCents("") → 0 ✓

// 4780 → "47.80"  (API POST body requires decimal strings)
export function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}
// centsToDecimalString(4780) → "47.80" ✓
// centsToDecimalString(1) → "0.01" ✓

export function splitCentsEvenly(totalCents: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  // First `remainder` slots absorb an extra cent — deterministic, index-ordered
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}
// splitCentsEvenly(1000, 3) → [334, 333, 333]  sum=1000 ✓
// splitCentsEvenly(1001, 3) → [334, 334, 333]  sum=1001 ✓
// splitCentsEvenly(1000, 5) → [200, 200, 200, 200, 200]  ✓

export function formatCents(cents: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : currency;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

export function parseCentsFromString(str: string): number {
  return Math.round(parseFloat(str.replace(/[^0-9.]/g, '')) * 100) || 0;
}
