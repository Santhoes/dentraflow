import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.CHAT_PROTECTION_SECRET;
const ALGO = "sha256";

export function signClinicSlug(slug: string): string | null {
  if (!SECRET?.length) return null;
  const hmac = createHmac(ALGO, SECRET);
  hmac.update(slug.trim().toLowerCase());
  return hmac.digest("hex");
}

export function verifyClinicSignature(slug: string, sig: string): boolean {
  if (!SECRET?.length || !slug?.trim() || !sig?.trim()) return false;
  const expected = signClinicSlug(slug);
  if (!expected) return false;
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
