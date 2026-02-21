import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = "admin@dentraflow.com";

export function isAdminEmail(email: string | undefined): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL;
}

/**
 * Get the authenticated user from the request. Returns null if not authenticated.
 * Use in API routes with createClient and the Bearer token from Authorization header.
 */
export async function getAuthUserFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/**
 * Require admin auth for API routes. Returns NextResponse error if not admin, else returns null (proceed).
 * Usage: const err = await requireAdmin(request); if (err) return err;
 */
export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}
