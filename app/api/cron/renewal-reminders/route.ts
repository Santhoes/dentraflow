import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendResendEmail } from "@/lib/resend";
import { renderEmailHtml, escapeHtml } from "@/lib/email-template";

/**
 * GET or POST /api/cron/renewal-reminders
 * Secured with CRON_SECRET (header: Authorization: Bearer <CRON_SECRET> or x-cron-secret: <CRON_SECRET>).
 * Finds clinics with plan_expires_at within the next 7 days (upcoming).
 * Sends a single type of email: "plan renewal reminder" for upcoming renewals.
 * Does NOT send recurring "plan expired" emails; those can be sent manually from the admin panel if needed.
 */
export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 501 });
  }

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.replace(/^Bearer\s+/i, "").trim();
  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  if (bearer !== secret && headerSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: clinics, error } = await admin
    .from("clinics")
    .select("id, name, plan, plan_expires_at")
    .not("plan_expires_at", "is", null);

  if (error) {
    console.error("cron renewal-reminders", error);
    return NextResponse.json({ error: "Failed to fetch clinics" }, { status: 500 });
  }

  const upcoming: { id: string; name: string; plan: string; plan_expires_at: string }[] = [];

  for (const c of clinics || []) {
    const exp = (c as { plan_expires_at: string | null }).plan_expires_at;
    if (!exp) continue;
    const expDate = new Date(exp);
    if (expDate > now && expDate <= in7Days) {
      upcoming.push(c as (typeof upcoming)[0]);
    }
  }

  const ownerByClinic: Record<string, string> = {};
  const clinicIds = [...new Set(upcoming.map((c) => c.id))];
  if (clinicIds.length > 0) {
    const { data: members } = await admin
      .from("clinic_members")
      .select("clinic_id, app_user_id")
      .eq("role", "owner")
      .in("clinic_id", clinicIds);
    for (const m of members || []) {
      const row = m as { clinic_id: string; app_user_id: string | null };
      if (row.app_user_id) {
        ownerByClinic[row.clinic_id] = row.app_user_id;
      }
    }
  }

  const emailByUserId: Record<string, string> = {};
  const appUserIds = [...new Set(Object.values(ownerByClinic))];
  if (appUserIds.length > 0) {
    const { data: appUsers, error: appUsersError } = await admin
      .from("app_users")
      .select("id, email")
      .in("id", appUserIds);

    if (appUsersError) {
      console.error("cron renewal-reminders app_users lookup", appUsersError);
    } else {
      for (const u of appUsers || []) {
        const row = u as { id: string; email: string | null };
        if (row.email) {
          emailByUserId[row.id] = row.email;
        }
      }
    }
  }

  let sentUpcoming = 0;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://dentraflow.com").replace(/\/$/, "");
  const planUrl = `${appUrl}/app/plan`;

  for (const c of upcoming) {
    const ownerId = ownerByClinic[c.id];
    const to = ownerId ? emailByUserId[ownerId] : null;
    if (!to) continue;
    const expiresAt = new Date(c.plan_expires_at).toLocaleDateString(undefined, {
      dateStyle: "medium",
    });
    const result = await sendResendEmail({
      to,
      subject: `DentraFlow — Plan renewal reminder for ${c.name}`,
      html: renderEmailHtml({
        body: `<p>This is a reminder that your DentraFlow plan for <strong>${escapeHtml(c.name)}</strong> (${escapeHtml(c.plan)}) expires on <strong>${escapeHtml(expiresAt)}</strong>.</p><p>Renew to keep your AI receptionist running without interruption.</p>`,
        button: { text: "Renew plan", url: planUrl },
        link: { text: "View billing", url: planUrl },
      }),
    });
    if (result.ok) sentUpcoming++;
  }

  return NextResponse.json({
    ok: true,
    upcoming: { total: upcoming.length, emailsSent: sentUpcoming },
  });
}
