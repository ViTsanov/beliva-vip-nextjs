// Форматира цена за показване: "4325 EUR" -> "4325 €", "1200 USD" -> "1200 $"
// Работи и с вече форматирани стойности ("4325 €" остава непроменена).
export const formatPrice = (price?: string | null): string => {
  if (!price) return '';
  return String(price)
    .replace(/\bEUR\b/gi, '€')
    .replace(/\bUSD\b/gi, '$')
    .replace(/\bGBP\b/gi, '£')
    .replace(/\bBGN\b/gi, 'лв.')
    .replace(/\s{2,}/g, ' ')
    .trim();
};
