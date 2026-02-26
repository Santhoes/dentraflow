const DEFAULT_ADMIN_EMAIL = "admin@dentraflow.com";

function getAdminEmails(): Set<string> {
  const env = process.env.ADMIN_EMAILS?.trim();
  if (env) {
    const list = env.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (list.length > 0) return new Set(list);
  }
  return new Set([DEFAULT_ADMIN_EMAIL.toLowerCase()]);
}

export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().has(email.toLowerCase());
}
