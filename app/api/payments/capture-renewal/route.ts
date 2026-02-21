import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, type PlanId } from "@/lib/supabase/types";

const PAYPAL_API = "https://api-m.paypal.com";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("Missing PayPal credentials");
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("PayPal token failed");
  const data = await res.json();
  return data.access_token;
}

/**
 * POST /api/payments/capture-renewal
 * Body: { orderId, plan }. Captures PayPal order and updates existing clinic plan/expiry.
 */
export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnon);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    let body: { orderId?: string; plan?: string; country?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { orderId, plan: planId, country: payerCountryFromBody } = body;
    if (!orderId || !planId) {
      return NextResponse.json({ error: "orderId and plan required" }, { status: 400 });
    }
    const plan = planId as PlanId;
    if (!PLANS.some((p) => p.id === plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const planInfo = PLANS.find((p) => p.id === plan);
    if (!planInfo || planInfo.priceCents === 0) {
      return NextResponse.json({ error: "Enterprise renewal: contact support" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: member } = await admin
      .from("clinic_members")
      .select("clinic_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!member?.clinic_id) {
      return NextResponse.json({ error: "No clinic found" }, { status: 404 });
    }

    const clinicId = (member as { clinic_id: string }).clinic_id;
    const { data: clinicRow } = await admin.from("clinics").select("country").eq("id", clinicId).single();
    const clinicCountry = (clinicRow as { country?: string } | null)?.country ?? null;
    const payerCountry = typeof payerCountryFromBody === "string" && payerCountryFromBody.trim() ? payerCountryFromBody.trim() : clinicCountry;

    const accessToken = await getAccessToken();
    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!captureRes.ok) {
      const t = await captureRes.text();
      return NextResponse.json({ error: `PayPal capture failed: ${t}` }, { status: 402 });
    }
    const captureData = await captureRes.json();
    if (captureData.status !== "COMPLETED") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }

    const planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: updateError } = await admin
      .from("clinics")
      .update({ plan, plan_expires_at: planExpiresAt })
      .eq("id", clinicId);
    if (updateError) {
      console.error("clinic update", updateError);
      return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
    }

    const paypalOrderId = captureData.id || orderId;
    const captureAmount = (captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount as { value?: string } | undefined)?.value;
    const amount = captureAmount ? parseFloat(captureAmount) : planInfo.priceCents / 100;
    const { computePriceWithTax } = await import("@/lib/tax-by-country");
    const { taxCents: taxCentsComputed } = computePriceWithTax(planInfo.priceCents, payerCountry ?? "");
    const taxAmount = taxCentsComputed > 0 ? taxCentsComputed / 100 : null;
    await admin.from("payments").insert({
      clinic_id: clinicId,
      paypal_order_id: paypalOrderId,
      plan,
      amount: typeof amount === "number" ? amount : parseFloat((planInfo.priceCents / 100).toFixed(2)),
      tax_amount: taxAmount,
      country: payerCountry,
      currency: "USD",
      status: "completed",
    });

    return NextResponse.json({ success: true, clinicId });
  } catch (e) {
    console.error("capture-renewal", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
