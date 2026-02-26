import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ user: null, clinic: null }, { status: 200 });
  }
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("clinic_members")
    .select("clinic_id")
    .eq("app_user_id", ctx.user.id)
    .limit(1)
    .maybeSingle();
  if (!member?.clinic_id) {
    return NextResponse.json({ user: ctx.user, clinic: null });
  }
  const { data: clinic, error } = await admin
    .from("clinics")
    .select("*")
    .eq("id", (member as { clinic_id: string }).clinic_id)
    .single();
  if (error || !clinic) {
    return NextResponse.json({ user: ctx.user, clinic: null });
  }
  return NextResponse.json({ user: ctx.user, clinic });
}

