import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth-server";

/** Only tables with user/operational data: appointments, notifications, rate limits, support, payments. No clinics/members/config. */
const ALLOWED_TABLES = [
  { id: "paypal_webhook_events", label: "PayPal webhook events (idempotency)" },
  { id: "appointment_reminder_sent", label: "Appointment reminder sent (notifications)" },
  { id: "contact_form_ip_rate", label: "Contact form rate limit" },
  { id: "check_email_ip_rate", label: "Check email rate limit" },
  { id: "auth_ip_rate", label: "Auth rate limit (login/signup)" },
  { id: "embed_chat_daily_usage", label: "Embed chat daily usage" },
  { id: "embed_api_ip_rate", label: "Embed API rate limit" },
  { id: "support_replies", label: "Support replies" },
  { id: "support_messages", label: "Support messages" },
  { id: "payments", label: "Payments" },
  { id: "appointments", label: "Appointments" },
  { id: "patients", label: "Patients" },
] as const;

/**
 * GET /api/admin/clear-table — list tables that can be cleared (admin only).
 */
export async function GET(request: Request) {
  const err = await requireAdmin(request);
  if (err) return err;

  return NextResponse.json({ tables: ALLOWED_TABLES });
}

/**
 * POST /api/admin/clear-table — clear (truncate) a whitelisted table (admin only).
 * Body: { table: string }. Uses DB function clear_allowed_table. CASCADE clears dependent tables.
 */
export async function POST(request: Request) {
  const err = await requireAdmin(request);
  if (err) return err;

  let body: { table?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const table = typeof body.table === "string" ? body.table.trim() : "";
  if (!table) {
    return NextResponse.json({ error: "table required" }, { status: 400 });
  }

  const allowed = new Set<string>(ALLOWED_TABLES.map((t) => t.id));
  if (!allowed.has(table)) {
    return NextResponse.json({ error: "Table not allowed" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("clear_allowed_table", { tablename: table });

    if (error) {
      console.error("clear_allowed_table", error);
      const message =
        (error as { message?: string }).message ??
        "Database error. Run Supabase migrations so clear_allowed_table exists and allows this table.";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, table });
  } catch (e) {
    console.error("clear-table POST", e);
    const message = e instanceof Error ? e.message : "Server error while clearing table.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
