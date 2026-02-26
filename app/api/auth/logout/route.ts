import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/app-auth";

export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}

