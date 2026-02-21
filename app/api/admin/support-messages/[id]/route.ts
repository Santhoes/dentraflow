import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * PATCH /api/admin/support-messages/[id] — set admin reply (admin only).
 * Body: { admin_reply: string }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin(request);
  if (err) return err;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Message ID required" }, { status: 400 });

  let body: { admin_reply?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("support_messages")
    .update({
      admin_reply: typeof body.admin_reply === "string" ? body.admin_reply.trim() || null : null,
      admin_replied_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") return NextResponse.json({ error: "Message not found" }, { status: 404 });
    console.error("admin support-messages PATCH", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}
