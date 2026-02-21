import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, slugFromName } from "@/lib/supabase/types";

const PAYPAL_API = "https://api-m.paypal.com";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("Missing PayPal credentials");
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${auth}` },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("PayPal token failed");
  const data = await res.json();
  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderId,
      plan,
      amountCents,
      taxCents,
      clinicName,
      country,
      timezone,
      whatsapp_phone,
      workingHours,
    } = body as {
      orderId: string;
      plan: string;
      amountCents: number;
      taxCents?: number;
      clinicName: string;
      country: string;
      timezone: string;
      whatsapp_phone?: string;
      workingHours: Record<string, { open: string; close: string }> | null;
    };
    if (!orderId || !plan || !clinicName || !country) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!PLANS.some((p) => p.id === plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (!whatsapp_phone?.trim()) {
      return NextResponse.json({ error: "WhatsApp number is required" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnon);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const accessToken = await getAccessToken();
    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    });
    if (!captureRes.ok) {
      const t = await captureRes.text();
      return NextResponse.json({ error: `PayPal capture failed: ${t}` }, { status: 402 });
    }
    const captureData = await captureRes.json();
    const status = captureData.status;
    if (status !== "COMPLETED") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }

    const admin = createAdminClient();
    const slug = slugFromName(clinicName);
    const slugExists = await admin.from("clinics").select("id").eq("slug", slug).maybeSingle();
    let finalSlug = slug;
    if (slugExists.data?.id) {
      finalSlug = `${slug}-${Date.now().toString(36)}`;
    }

    const planExpiresAt = amountCents > 0
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: clinic, error: clinicError } = await admin.from("clinics").insert({
      name: clinicName,
      slug: finalSlug,
      country,
      timezone: timezone || "America/New_York",
      plan,
      plan_expires_at: planExpiresAt,
      whatsapp_phone: whatsapp_phone.trim(),
      working_hours: workingHours || null,
    }).select("id").single();

    if (clinicError || !clinic) {
      console.error("clinic insert", clinicError);
      return NextResponse.json({ error: "Failed to create clinic" }, { status: 500 });
    }

    const { error: memberError } = await admin.from("clinic_members").insert({
      clinic_id: clinic.id,
      user_id: user.id,
      role: "owner",
    });
    if (memberError) {
      console.error("clinic_member insert", memberError);
      return NextResponse.json({ error: "Failed to add you to clinic" }, { status: 500 });
    }

    const paypalOrderId = captureData.id || orderId;
    const amount = (amountCents / 100).toFixed(2);
    const taxAmount = typeof taxCents === "number" && taxCents >= 0 ? (taxCents / 100).toFixed(2) : null;
    await admin.from("payments").insert({
      clinic_id: clinic.id,
      paypal_order_id: paypalOrderId,
      plan,
      amount: parseFloat(amount),
      tax_amount: taxAmount != null ? parseFloat(taxAmount) : null,
      country: country?.trim() || null,
      currency: "USD",
      status: "completed",
    });

    return NextResponse.json({
      success: true,
      clinicId: clinic.id,
      slug: finalSlug,
    });
  } catch (e) {
    console.error("capture", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
