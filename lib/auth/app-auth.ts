import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const SESSION_COOKIE_NAME = "df_session";
const SESSION_TTL_DAYS = 30;

export interface AppUser {
  id: string;
  email: string;
  is_admin: boolean;
}

export interface AuthContext {
  user: AppUser;
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string) {
  const admin = createAdminClient();
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await admin.from("app_sessions").insert({
    user_id: userId,
    token,
    expires_at: expiresAt.toISOString(),
  });

  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const admin = createAdminClient();
    await admin
      .from("app_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token", token);
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: sessionRow, error } = await admin
    .from("app_sessions")
    .select("id, user_id, expires_at, revoked_at, app_users ( id, email, is_admin )")
    .eq("token", token)
    .gt("expires_at", nowIso)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !sessionRow) return null;

  const appUsers = (sessionRow as { app_users: { id: string; email: string; is_admin: boolean }[] | { id: string; email: string; is_admin: boolean } | null }).app_users;
  const user = Array.isArray(appUsers) ? appUsers[0] ?? null : appUsers;
  if (!user) return null;

  return {
    user: {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
    },
  };
}

export async function requireUser(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new Error("UNAUTHORIZED");
  }
  return ctx;
}

/** Validate a session token (e.g. from Authorization: Bearer) and return auth context. */
export async function getAuthContextFromToken(token: string): Promise<AuthContext | null> {
  if (!token?.trim()) return null;
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: sessionRow, error } = await admin
    .from("app_sessions")
    .select("id, user_id, expires_at, revoked_at, app_users ( id, email, is_admin )")
    .eq("token", token.trim())
    .gt("expires_at", nowIso)
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !sessionRow) return null;
  const appUsers = (sessionRow as { app_users: { id: string; email: string; is_admin: boolean }[] | null }).app_users;
  const user = Array.isArray(appUsers) ? appUsers[0] ?? null : appUsers;
  if (!user) return null;
  return {
    user: { id: user.id, email: user.email, is_admin: user.is_admin },
  };
}

/** Get auth from request: cookie (df_session) or Authorization Bearer token (app_sessions token). */
export async function getAuthContextFromRequest(request: Request): Promise<AuthContext | null> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (bearerToken) {
    const ctx = await getAuthContextFromToken(bearerToken);
    if (ctx) return ctx;
  }
  return getAuthContext();
}

