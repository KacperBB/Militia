export const MAX_PRICE_CENTS = 2_147_483_647;
export const MAX_PRICE = MAX_PRICE_CENTS / 100;

export function formatMaxPriceLabel(locale: string) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(MAX_PRICE);
}