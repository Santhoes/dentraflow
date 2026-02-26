/**
 * Password rule for app_users (our own table, not Supabase Auth).
 * Only minimum length; users can use any characters they want.
 */
const MIN_LENGTH = 8;

export function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_LENGTH) {
    return "Password must be at least 8 characters.";
  }
  return null;
}
