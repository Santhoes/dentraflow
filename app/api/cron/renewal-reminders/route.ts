import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendResendEmail } from "@/lib/resend";
import { renderEmailHtml } from "@/lib/email-template";

/**
 * GET or POST /api/cron/renewal-reminders
 * Secured with CRON_SECRET (header: Authorization: Bearer <CRON_SECRET> or x-cron-secret: <CRON_SECRET>).
 * Finds clinics with plan_expires_at in the past (expired) or within next 7 days (upcoming).
 * Sends "plan expired" email to expired, "renewal reminder" to upcoming.
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

  const expired: { id: string; name: string; plan: string; plan_expires_at: string }[] = [];
  const upcoming: { id: string; name: string; plan: string; plan_expires_at: string }[] = [];

  for (const c of clinics || []) {
    const exp = (c as { plan_expires_at: string | null }).plan_expires_at;
    if (!exp) continue;
    const expDate = new Date(exp);
    if (expDate < now) expired.push(c as typeof expired[0]);
    else if (expDate <= in7Days) upcoming.push(c as typeof upcoming[0]);
  }

  const ownerByClinic: Record<string, string> = {};
  const clinicIds = [...new Set([...expired.map((c) => c.id), ...upcoming.map((c) => c.id)])];
  if (clinicIds.length > 0) {
    const { data: members } = await admin
      .from("clinic_members")
      .select("clinic_id, user_id")
      .eq("role", "owner")
      .in("clinic_id", clinicIds);
    for (const m of members || []) {
      const row = m as { clinic_id: string; user_id: string };
      ownerByClinic[row.clinic_id] = row.user_id;
    }
  }

  const emailByUserId: Record<string, string> = {};
  const userIds = [...new Set(Object.values(ownerByClinic))];
  for (const uid of userIds) {
    try {
      const { data: { user } } = await admin.auth.admin.getUserById(uid);
      if (user?.email) emailByUserId[uid] = user.email;
    } catch {
      // skip
    }
  }

  let sentExpired = 0;
  let sentUpcoming = 0;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://dentraflow.com").replace(/\/$/, "");
  const planUrl = `${appUrl}/app/plan`;

  for (const c of expired) {
    const ownerId = ownerByClinic[c.id];
    const to = ownerId ? emailByUserId[ownerId] : null;
    if (!to) continue;
    const result = await sendResendEmail({
      to,
      subject: `DentraFlow — Your ${c.name} plan has expired`,
      html: renderEmailHtml({
        body: `<p>Your DentraFlow plan for <strong>${c.name}</strong> (${c.plan}) has expired.</p><p>Renew to keep your AI receptionist and chat widget active.</p>`,
        button: { text: "Renew plan", url: planUrl },
        link: { text: "Visit app", url: `${appUrl}/app` },
      }),
    });
    if (result.ok) sentExpired++;
  }

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
        body: `<p>This is a reminder that your DentraFlow plan for <strong>${c.name}</strong> (${c.plan}) expires on <strong>${expiresAt}</strong>.</p><p>Renew to keep your AI receptionist running without interruption.</p>`,
        button: { text: "Renew plan", url: planUrl },
        link: { text: "View billing", url: planUrl },
      }),
    });
    if (result.ok) sentUpcoming++;
  }

  return NextResponse.json({
    ok: true,
    expired: { total: expired.length, emailsSent: sentExpired },
    upcoming: { total: upcoming.length, emailsSent: sentUpcoming },
  });
}
