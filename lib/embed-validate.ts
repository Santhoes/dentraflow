/**
 * Lightweight validation for chat widget: email and phone.
 * Rejects obviously fake, invalid, or spam-like values.
 */

/** Common disposable/temporary email domains (subset). */
const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com", "throwaway.email", "guerrillamail.com", "10minutemail.com",
  "mailinator.com", "fakeinbox.com", "trashmail.com", "yopmail.com",
  "temp-mail.org", "getnada.com", "maildrop.cc", "sharklasers.com",
  "grr.la", "guerrillamail.info", "discard.email", "tempail.com",
  "emailondeck.com", "mohmal.com", "dispostable.com", "mailnesia.com",
]);

export function isValidChatEmail(value: string): { valid: boolean; error?: string } {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return { valid: false, error: "Email is required." };
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) return { valid: false, error: "Please enter a valid email address." };
  const domain = trimmed.split("@")[1];
  if (domain && DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, error: "Please use a permanent email address." };
  }
  if (trimmed.length > 254) return { valid: false, error: "Email is too long." };
  return { valid: true };
}

/** E.164-ish: optional +, digits, spaces/dashes allowed but we strip. Min length for a real number. */
export function isValidChatPhone(value: string): { valid: boolean; error?: string } {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10) return { valid: false, error: "Please enter a valid phone number with country code." };
  if (digits.length > 15) return { valid: false, error: "Phone number is too long." };
  if (/^(\d)\1{9,}$/.test(digits)) return { valid: false, error: "Please enter a valid phone number." };
  if (/^0+$/.test(digits)) return { valid: false, error: "Please enter a valid phone number." };
  return { valid: true };
}
