import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContextFromRequest } from "@/lib/auth/app-auth";
import { PLANS, slugFromName } from "@/lib/supabase/types";
import { computePriceWithTax } from "@/lib/tax-by-country";
import { getCapturedAmountUsd, verifyCaptureAmountForPlan } from "@/lib/payment-verify";

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
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const ctx = await getAuthContextFromRequest(request);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const paypalOrderId = captureData.id || orderId;
    const capturedUsd = getCapturedAmountUsd(captureData);
    if (capturedUsd == null) {
      return NextResponse.json({ error: "Could not read capture amount" }, { status: 402 });
    }
    const verify = verifyCaptureAmountForPlan(capturedUsd, plan, country?.trim() || "Other");
    if (!verify.ok) {
      return NextResponse.json({ error: verify.error || "Amount mismatch" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existingPayment } = await admin
      .from("payments")
      .select("clinic_id")
      .eq("paypal_order_id", paypalOrderId)
      .maybeSingle();
    if (existingPayment?.clinic_id) {
      const { data: existingClinic } = await admin
        .from("clinics")
        .select("slug")
        .eq("id", (existingPayment as { clinic_id: string }).clinic_id)
        .single();
      const slug = (existingClinic as { slug?: string } | null)?.slug;
      return NextResponse.json({
        success: true,
        clinicId: (existingPayment as { clinic_id: string }).clinic_id,
        slug: slug ?? null,
      });
    }

    const slug = slugFromName(clinicName);
    const slugExists = await admin.from("clinics").select("id").eq("slug", slug).maybeSingle();
    let finalSlug = slug;
    if (slugExists.data?.id) {
      finalSlug = `${slug}-${Date.now().toString(36)}`;
    }

    const planInfo = PLANS.find((p) => p.id === plan)!;
    const planExpiresAt = planInfo.priceCents > 0
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
      app_user_id: ctx.user.id,
      role: "owner",
    });
    if (memberError) {
      console.error("clinic_member insert", memberError);
      return NextResponse.json({ error: "Failed to add you to clinic" }, { status: 500 });
    }

    const { taxCents: taxCentsComputed } = computePriceWithTax(
      PLANS.find((p) => p.id === plan)!.priceCents,
      country?.trim() || "Other"
    );
    const taxAmount = taxCentsComputed > 0 ? taxCentsComputed / 100 : null;
    await admin.from("payments").insert({
      clinic_id: clinic.id,
      paypal_order_id: paypalOrderId,
      plan,
      amount: capturedUsd,
      tax_amount: taxAmount,
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
