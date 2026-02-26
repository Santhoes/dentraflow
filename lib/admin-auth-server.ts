import { NextResponse } from "next/server";
import { getAuthContextFromRequest } from "@/lib/auth/app-auth";
import { isAdminEmail } from "@/lib/admin-auth";

export async function getAuthUserFromRequest(request: Request) {
  const ctx = await getAuthContextFromRequest(request);
  if (!ctx) return null;
  return { id: ctx.user.id, email: ctx.user.email, is_admin: ctx.user.is_admin };
}

export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isAdmin = (user as { is_admin?: boolean }).is_admin === true || (user.email && isAdminEmail(user.email));
  if (!isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

