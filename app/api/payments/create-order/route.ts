import { NextResponse } from "next/server";
import { PLANS } from "@/lib/supabase/types";

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
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal token failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan, amountCents } = body as { plan: string; amountCents: number };
    if (!plan || typeof amountCents !== "number") {
      return NextResponse.json({ error: "plan and amountCents required" }, { status: 400 });
    }
    const planInfo = PLANS.find((p) => p.id === plan);
    if (!planInfo) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    // Allow amountCents from base price up to 2x (covers tax + rounding). Prevents underpayment.
    const minCents = planInfo.priceCents;
    const maxCents = Math.min(100000, planInfo.priceCents * 2);
    if (amountCents < minCents || amountCents > maxCents) {
      return NextResponse.json({ error: "Invalid amount for plan" }, { status: 400 });
    }
    const value = (amountCents / 100).toFixed(2);
    const token = await getAccessToken();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://dentraflow.com").replace(/\/$/, "");
    const returnUrl = `${appUrl}/signup`;
    const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "USD", value },
            description: `DentraFlow ${plan} plan`,
          },
        ],
        application_context: {
          return_url: `${returnUrl}?success=1`,
          cancel_url: `${returnUrl}?cancelled=1`,
          brand_name: "DentraFlow",
        },
      }),
    });
    const order = await res.json();
    if (!res.ok) {
      const msg = order?.message || order?.details?.[0]?.description || await res.text();
      return NextResponse.json(
        { error: `PayPal error: ${msg || res.statusText}` },
        { status: 502 }
      );
    }
    const approveLink = order.links?.find((l: { rel: string }) => l.rel === "approve");
    const approvalUrl = approveLink?.href;
    if (!approvalUrl) {
      return NextResponse.json(
        { error: "PayPal did not return a checkout link. Check your PayPal app return URL settings." },
        { status: 502 }
      );
    }
    return NextResponse.json({
      orderId: order.id,
      approvalUrl,
    });
  } catch (e) {
    console.error("create-order", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
