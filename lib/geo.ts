/**
 * Map ISO 3166-1 alpha-2 country codes to our country names (used for tax and COUNTRIES list).
 * Used with Vercel's x-vercel-ip-country header for auto-detecting payer country.
 */
const ISO_TO_COUNTRY: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  UK: "United Kingdom",
  AU: "Australia",
  IN: "India",
  DE: "Germany",
  FR: "France",
  ES: "Spain",
  IT: "Italy",
  NL: "Netherlands",
  IE: "Ireland",
  NZ: "New Zealand",
  SG: "Singapore",
  AE: "United Arab Emirates",
  ZA: "South Africa",
  BR: "Brazil",
  MX: "Mexico",
  JP: "Japan",
  KR: "South Korea",
};

/** Country names we support (must match COUNTRIES in supabase/types and tax-by-country). */
export const SUPPORTED_COUNTRY_NAMES = [
  "United States", "Canada", "United Kingdom", "Australia", "India", "Germany", "France", "Spain",
  "Italy", "Netherlands", "Ireland", "New Zealand", "Singapore", "United Arab Emirates", "South Africa",
  "Brazil", "Mexico", "Japan", "South Korea", "Other",
] as const;

export function isoToCountryName(isoCode: string | null | undefined): string | null {
  if (!isoCode || typeof isoCode !== "string") return null;
  const code = isoCode.toUpperCase().trim();
  if (code.length !== 2) return null;
  return ISO_TO_COUNTRY[code] ?? "Other";
}
