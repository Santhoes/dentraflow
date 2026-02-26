/**
 * Verify PayPal webhook signature by calling PayPal's verify-webhook-signature API.
 * Requires PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID.
 */

const PAYPAL_API = process.env.NODE_ENV === "development" && process.env.PAYPAL_USE_SANDBOX === "true"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

export interface VerifyParams {
  transmissionId: string;
  transmissionTime: string;
  transmissionSig: string;
  certUrl: string;
  authAlgo: string;
  webhookId: string;
  webhookEvent: Record<string, unknown>;
}

export async function verifyPayPalWebhookSignature(params: VerifyParams): Promise<{ verified: boolean; error?: string }> {
  const { certUrl } = params;
  if (!certUrl || typeof certUrl !== "string") {
    return { verified: false, error: "Missing cert_url" };
  }
  try {
    const u = new URL(certUrl);
    const allowed = u.hostname.endsWith(".paypal.com") || u.hostname.endsWith(".paypalobjects.com");
    if (!allowed) {
      return { verified: false, error: "Invalid cert URL domain" };
    }
  } catch {
    return { verified: false, error: "Invalid cert_url" };
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    return { verified: false, error: "Missing PayPal credentials" };
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const tokenRes = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${auth}` },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) {
    return { verified: false, error: "PayPal token failed" };
  }
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return { verified: false, error: "No access token" };
  }

  const verifyRes = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      auth_algo: params.authAlgo,
      cert_url: params.certUrl,
      transmission_id: params.transmissionId,
      transmission_sig: params.transmissionSig,
      transmission_time: params.transmissionTime,
      webhook_id: params.webhookId,
      webhook_event: params.webhookEvent,
    }),
  });

  const verifyData = await verifyRes.json().catch(() => ({}));
  const verificationStatus = verifyData.verification_status;
  if (verificationStatus === "SUCCESS") {
    return { verified: true };
  }
  return { verified: false, error: verifyData.message || "Verification failed" };
}
