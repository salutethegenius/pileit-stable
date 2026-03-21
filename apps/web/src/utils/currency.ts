/** ISO 4217 — all in-app money is Bahamian dollars. */
export const APP_CURRENCY_CODE = "BSD" as const;

const BSD_LOCALE = "en-BS";

/**
 * Format a number as Bahamian dollars (Intl, falls back to `B$` + fixed decimals).
 */
export function formatBsd(
  amount: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const min = options?.minimumFractionDigits ?? 0;
  const max = options?.maximumFractionDigits ?? 2;
  try {
    return new Intl.NumberFormat(BSD_LOCALE, {
      style: "currency",
      currency: APP_CURRENCY_CODE,
      currencyDisplay: "code",
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    }).format(amount);
  } catch {
    const n = amount.toFixed(max);
    return `B$${n}`;
  }
}
