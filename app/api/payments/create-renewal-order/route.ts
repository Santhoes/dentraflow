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
 * POST /api/payments/create-renewal-order
 * Body: { plan: PlanId }. Creates PayPal order for renewal; return URL goes to /app/plan.
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

    let body: { plan?: string; amountCents?: number; country?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const plan = (body.plan || "") as PlanId;
    if (!plan || !PLANS.some((p) => p.id === plan)) {
      return NextResponse.json({ error: "Valid plan required" }, { status: 400 });
    }

    const planInfo = PLANS.find((p) => p.id === plan);
    if (!planInfo || planInfo.priceCents === 0) {
      return NextResponse.json(
        { error: "Enterprise plan renewal: please contact support." },
        { status: 400 }
      );
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
    const clinicCountry = (clinicRow as { country?: string } | null)?.country ?? "";
    const payerCountry = typeof body.country === "string" && body.country.trim() ? body.country.trim() : clinicCountry;

    const { computePriceWithTax } = await import("@/lib/tax-by-country");
    const { totalCents } = computePriceWithTax(planInfo.priceCents, payerCountry);
    const amountCents = typeof body.amountCents === "number" && body.amountCents >= 0 ? body.amountCents : totalCents;

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://dentraflow.com").replace(/\/$/, "");
    const returnUrl = `${appUrl}/app/plan?renew=1`;
    const token2 = await getAccessToken();
    const value = (amountCents / 100).toFixed(2);
    const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token2}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "USD", value },
            description: `DentraFlow ${plan} plan renewal`,
          },
        ],
        application_context: {
          return_url: returnUrl,
          cancel_url: returnUrl,
          brand_name: "DentraFlow",
        },
      }),
    });
    const order = await res.json();
    if (!res.ok) {
      const msg = order?.message || order?.details?.[0]?.description || (await res.text());
      return NextResponse.json(
        { error: `PayPal error: ${msg || res.statusText}` },
        { status: 502 }
      );
    }
    const approveLink = order.links?.find((l: { rel: string }) => l.rel === "approve");
    const approvalUrl = approveLink?.href;
    if (!approvalUrl) {
      return NextResponse.json(
        { error: "PayPal did not return a checkout link." },
        { status: 502 }
      );
    }
    return NextResponse.json({
      orderId: order.id,
      approvalUrl,
    });
  } catch (e) {
    console.error("create-renewal-order", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
