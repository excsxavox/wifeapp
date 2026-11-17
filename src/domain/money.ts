export function formatMoney(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', MXN: '$', COP: '$' };

/**
 * Compact money for the home screen: "$1.080,00". Grouping is done by hand
 * because es-ES Intl leaves 4-digit amounts ungrouped ("1080,00").
 */
export function formatMoneyShort(amount: number, currency = 'USD'): string {
  const { sign, symbol, whole, cents } = moneyParts(amount, currency);
  return `${sign}${symbol}${whole},${cents}`;
}

/** Pieces of an amount so the cents can be drawn smaller. */
export function moneyParts(amount: number, currency = 'USD') {
  const code = currency.toUpperCase();
  const symbol = SYMBOLS[code] ?? `${code} `;
  const sign = amount < 0 ? '−' : '';
  const [int, dec] = Math.abs(amount).toFixed(2).split('.');
  const whole = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return { sign, symbol, whole, cents: dec };
}

export function parseAmount(raw: string): number | null {
  const normalized = raw.replace(',', '.').replace(/[^\d.]/g, '');
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}
