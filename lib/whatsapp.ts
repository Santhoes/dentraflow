/**
 * Send WhatsApp messages via Twilio API (https://www.twilio.com/docs/whatsapp).
 * Supports either:
 *   - TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN, or
 *   - TWILIO_ACCOUNT_SID + TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET (API Key auth).
 * TWILIO_WHATSAPP_FROM = WhatsApp-enabled number (e.g. +14155238886) or sandbox number.
 * To/From must be E.164; we prefix with "whatsapp:" for the API.
 */

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length ? `+${digits}` : "";
}

export async function sendWhatsApp(params: {
  to: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim();
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();

  if (!accountSid?.length || !from?.length) {
    return { ok: false, error: "WhatsApp not configured (TWILIO_ACCOUNT_SID, TWILIO_WHATSAPP_FROM)" };
  }

  const useApiKey = apiKeySid?.length && apiKeySecret?.length;
  if (!useApiKey && !authToken?.length) {
    return { ok: false, error: "WhatsApp not configured (set TWILIO_AUTH_TOKEN or TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET)" };
  }

  const to = toE164(params.to);
  const fromWhatsApp = from.startsWith("whatsapp:") ? from : `whatsapp:${toE164(from)}`;
  const toWhatsApp = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    To: toWhatsApp,
    From: fromWhatsApp,
    Body: params.body,
  });

  const basicUser = useApiKey ? apiKeySid! : accountSid;
  const basicPass = useApiKey ? apiKeySecret! : authToken!;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${basicUser}:${basicPass}`).toString("base64"),
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text || `HTTP ${res.status}` };
  }
  return { ok: true };
}
