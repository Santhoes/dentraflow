/**
 * Tax rate by country (percentage, 0–100). Used for subscription payments.
 * Aligned with typical VAT/GST rules; PayPal does not provide a single tax-by-country API,
 * so we apply these rates when creating the order total. Payer country is auto-detected (geo)
 * or selected by the user.
 */
const TAX_RATE_BY_COUNTRY: Record<string, number> = {
  "United States": 0,
  Canada: 13,
  "United Kingdom": 20,
  Australia: 10,
  India: 18,
  Germany: 19,
  France: 20,
  Spain: 21,
  Italy: 22,
  Netherlands: 21,
  Ireland: 23,
  "New Zealand": 15,
  Singapore: 8,
  "United Arab Emirates": 0,
  "South Africa": 15,
  Brazil: 17,
  Mexico: 16,
  Japan: 10,
  "South Korea": 10,
  Other: 0,
};

export function getTaxRateForCountry(country: string): number {
  if (!country || typeof country !== "string") return 0;
  const rate = TAX_RATE_BY_COUNTRY[country.trim()];
  return typeof rate === "number" ? rate : 0;
}

export interface PriceWithTax {
  subtotalCents: number;
  taxRatePercent: number;
  taxCents: number;
  totalCents: number;
}

/** Compute subtotal + tax for a given country. totalCents is rounded to integer. */
export function computePriceWithTax(subtotalCents: number, country: string): PriceWithTax {
  const taxRatePercent = getTaxRateForCountry(country);
  const taxCents = Math.round((subtotalCents * taxRatePercent) / 100);
  const totalCents = subtotalCents + taxCents;
  return {
    subtotalCents,
    taxRatePercent,
    taxCents,
    totalCents,
  };
}
