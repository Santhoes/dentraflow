import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyClinicSignature } from "@/lib/chat-signature";
import { getChatUsageLimits } from "@/lib/chat-usage-limits";
import { checkSpam } from "@/lib/chat-spam";
import { checkIpRateLimit, getClientIp } from "@/lib/chat-rate-limit";
import { sendResendEmail } from "@/lib/resend";
import { renderEmailHtml, escapeHtml } from "@/lib/email-template";
import { getNextSlots, getSlotsForDate } from "@/lib/embed-slots";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHAT_LIMIT_MESSAGE = "Chat limit reached. Please call the clinic.";
const ABUSE_MESSAGE = "I can only help with dental appointments.";
const RATE_LIMIT_MESSAGE = "Too many messages. Please wait a minute and try again.";
const OPENAI_TIMEOUT_MS = 55_000;

function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number }): Promise<Response> {
  const { timeout = OPENAI_TIMEOUT_MS, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...rest, signal: controller.signal }).finally(() => clearTimeout(id));
}

/** Simple email regex to detect likely email in user text */
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_REGEX = /https?:\/\/[^\s]+/i;

function extractEmailsFromMessages(messages: { role: string; content: string }[]): string[] {
  const emails = new Set<string>();
  for (const m of messages) {
    if (m?.role !== "user" || !m?.content) continue;
    const matches = String(m.content).match(EMAIL_REGEX);
    if (matches) matches.forEach((e) => emails.add(e.trim().toLowerCase()));
  }
  return Array.from(emails);
}

/** Abuse detection: block if over 500 chars, contains URL, or same user message repeated 3 times */
function isAbuse(messages: { role: string; content: string }[]): boolean {
  const userMessages = messages.filter((m) => m?.role === "user").map((m) => String(m?.content ?? "").trim());
  const last = userMessages[userMessages.length - 1];
  if (!last) return false;
  if (last.length > 500) return true;
  if (URL_REGEX.test(last)) return true;
  const same = userMessages.filter((t) => t === last).length;
  if (same >= 3) return true;
  return false;
}

/** Check if the last user message is only asking for hours (short-circuit, no OpenAI) */
function isHoursOnlyQuestion(messages: { role: string; content: string }[]): boolean {
  const lastUser = [...messages].reverse().find((m) => m?.role === "user");
  const text = String(lastUser?.content ?? "").trim().toLowerCase();
  if (text.length > 80) return false;
  const hoursPhrases = [
    "what are your hours",
    "what are the hours",
    "when are you open",
    "opening hours",
    "hours?",
    "horario",
    "horarios",
    "öffnungszeiten",
  ];
  return hoursPhrases.some((p) => text.includes(p) || text === p.replace("?", ""));
}

/** Check if the last user message is only asking about insurance (short-circuit, no OpenAI) */
function isInsuranceOnlyQuestion(messages: { role: string; content: string }[]): boolean {
  const lastUser = [...messages].reverse().find((m) => m?.role === "user");
  const text = String(lastUser?.content ?? "").trim().toLowerCase();
  if (text.length > 80) return false;
  const insurancePhrases = [
    "do you take insurance",
    "accept insurance",
    "insurance",
    "do you accept",
    "seguro",
    "versicherung",
  ];
  return insurancePhrases.some((p) => text.includes(p));
}

const BOOKING_KEYWORDS = /book|cleaning|checkup|check-up|appointment|schedule|reserve|slot|visit|exam|pain|emergency/i;
const ISO_DATE_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function hasBookingIntent(messages: { role: string; content: string }[]): boolean {
  const lastUser = [...messages].reverse().find((m) => m?.role === "user");
  const text = String(lastUser?.content ?? "").trim();
  return text.length > 0 && text.length < 200 && BOOKING_KEYWORDS.test(text);
}

function hasDateOrTimeInRecentMessages(messages: { role: string; content: string }[]): boolean {
  const recent = messages.slice(-6);
  for (const m of recent) {
    if (m?.content && ISO_DATE_RE.test(String(m.content))) return true;
    const c = String(m?.content ?? "").toLowerCase();
    if (c.includes("today") || c.includes("tomorrow") || c.includes(" at ") || /\d{1,2}(:\d{2})?\s*(am|pm)/i.test(c)) return true;
  }
  return false;
}

function formatInsuranceReply(accepts: boolean, notes: string | null): string {
  if (accepts) {
    return "Yes, we accept most major insurance plans. Please tell me your provider name and we'll confirm. Would you like to book a visit?";
  }
  return "We do not accept insurance. We can discuss payment when you book. Would you like to book a visit?";
}

function formatHoursForReply(working_hours: Record<string, { open: string; close: string }> | null): string {
  if (!working_hours || !Object.keys(working_hours).length) return "We're open Monday to Saturday, 8am–6pm. Would you like to book a visit?";
  const lines = Object.entries(working_hours)
    .filter(([, h]) => h && h.open && h.close)
    .map(([day, h]) => `${day}: ${h.open}–${h.close}`);
  if (!lines.length) return "We're open Monday to Saturday, 8am–6pm. Would you like to book a visit?";
  return "We're open: " + lines.join(". ") + ". Would you like to book a visit?";
}

/** DENTRAFLOW AI RECEPTIONIST – MASTER SYSTEM PROMPT */
function buildSystemPrompt(clinic: {
  name: string;
  accepts_insurance: boolean;
  insurance_notes: string | null;
  working_hours: Record<string, { open: string; close: string }> | null;
  holidaysSummary?: string;
  agentName?: string | null;
  timezone: string;
  returningPatientName?: string | null;
  todayDate: string;
  availableSlots?: { label: string; start: string; end: string }[];
}): string {
  const hours =
    clinic.working_hours && Object.keys(clinic.working_hours).length
      ? Object.entries(clinic.working_hours)
          .filter(([, h]) => h && h.open && h.close)
          .map(([day, h]) => `${day}: ${h.open}–${h.close}`)
          .join(", ")
      : "Mon–Sat, 8am–6pm (example)";
  const insurance = clinic.accepts_insurance
    ? (clinic.insurance_notes?.trim() || "Yes, we accept major providers. Ask which insurance they have.")
    : "We do not accept insurance. We can discuss payment when you book.";
  const closedLine = clinic.holidaysSummary
    ? `Closed dates: ${clinic.holidaysSummary}. Do not book on these days.`
    : "";
  const intro = clinic.agentName?.trim()
    ? `You are ${clinic.agentName.trim()}, the professional dental clinic AI receptionist for "${clinic.name}".`
    : `You are the professional dental clinic AI receptionist for "${clinic.name}".`;

  const returningBlock = clinic.returningPatientName
    ? `\nReturning patient: "${clinic.returningPatientName}". Say "Welcome back!" and ask only for preferred date and time.\n`
    : "";

  const modifyCancelBlock = `
Change/cancel: User says "change", "reschedule", "cancel" → ask for WhatsApp or email once, then suggest 2–3 times or call cancel_appointment/modify_appointment. If appointment is within 2 hours, say: "Please call the clinic for urgent changes." After every booking: "Need to change or cancel? Just type 'change' or 'cancel'."`;

  return `${intro}

Your job: Help patients quickly. Ask only necessary questions. Move conversation forward in 1–2 lines. Complete booking in 4–6 messages.

Rules:
- Responses under 2 sentences. Never repeat the same sentence twice. If user confirms, proceed immediately.
- Offer action buttons whenever possible (e.g. time slots, Yes/No, Morning/Afternoon).
- Tone: professional, warm, direct. Calm and human-like. Do not sound robotic.
- Only suggest calling the clinic for severe emergency (see below). For normal pain, proceed to booking.
- Collect in order: preferred date → time → name → email or WhatsApp. One question at a time.
- When you have date, time, name, and at least one contact, call book_appointment(patient_name, patient_email, patient_whatsapp, start_time, end_time). Today: ${clinic.todayDate}. Timezone: ${clinic.timezone}. Use 30-min slots; output start_time and end_time in ISO (e.g. 2025-02-25T14:00:00).
${returningBlock}
- Hours: ${hours}
- Insurance: ${insurance}
${closedLine ? `${closedLine}\n` : ""}
${modifyCancelBlock}
- Never: apologize twice; restart the flow; ask the same question again; repeat emergency advice after they chose "manageable" or booked.
- Conversation structure: Acknowledge → Clarify → Offer action + buttons → Confirm → Done.

Emergency triggers (reply with this only if they describe these): severe swelling, bleeding, accident, knocked-out tooth, fever + pain.
Response: "This may need urgent attention. Please call the clinic immediately." Suggest they call; also offer "Book earliest slot" if they want.
For normal pain (manageable): "Let's get you seen quickly. Would tomorrow work?" Then offer times. Do not repeat emergency advice.

Flows:
- Pain: Ask "Severe (swelling/bleeding) or manageable?" If manageable → offer tomorrow/times. If severe → urgent, call clinic + optional earliest slot.
- Cleaning: "Routine or deep cleaning?" Then "Morning or afternoon?" or "See all times."
- Checkup: "When was your last visit?" If new patient: "We'll need 45 minutes for your first visit. What day works?" Offer Tomorrow / This week / Pick date.

Smart answers (keep to 1–2 sentences, then offer to book):
- Cost (e.g. cleaning): "Routine cleaning starts at [clinic can set]. Would you like to book?" Or use general wording if no price set.
- Insurance: "Yes, we accept major providers. Which do you have?" Then book.
- "I'm scared of dentists": "That's okay. We focus on gentle care. Would you like a consultation first?"
- "Do you treat kids?": "Yes, we see children 5+. Would you like to book for your child?"

When user mentions pain (manageable), you may say "Same-day slots available" when true. After booking confirmation, you may ask "Would you like WhatsApp reminders?" (Yes/No). For treatments (e.g. root canal): one sentence only—e.g. "Root canal saves the tooth and relieves pain. Would you like a consultation?"

${(clinic.availableSlots?.length ?? 0) > 0 ? `When asking for time, suggest ONLY these slots (patient can tap): ${clinic.availableSlots!.map((s) => s.label).join(", ")}. Use exact start time ISO when they pick one.` : ""}
Never give medical diagnosis. Never ask all questions at once. Never promise unavailable times.`;
}

const BOOK_APPOINTMENT_TOOL = {
  type: "function" as const,
  function: {
    name: "book_appointment",
    description:
      "Call when you have preferred date, time, name, and at least one of email or WhatsApp. Creates the appointment. At least one contact (email or WhatsApp) required.",
    parameters: {
      type: "object",
      properties: {
        patient_name: { type: "string", description: "Full name" },
        patient_email: { type: "string", description: "Email (optional if patient_whatsapp provided)" },
        patient_whatsapp: { type: "string", description: "WhatsApp/phone (optional if patient_email provided)" },
        start_time: { type: "string", description: "ISO 8601 e.g. 2025-02-25T14:00:00" },
        end_time: { type: "string", description: "ISO 8601, 30 min after start" },
      },
      required: ["patient_name", "start_time", "end_time"],
    },
  },
};

const MODIFY_APPOINTMENT_TOOL = {
  type: "function" as const,
  function: {
    name: "modify_appointment",
    description: "Reschedule an existing appointment. Need patient_email or patient_whatsapp, and new_start_time, new_end_time (ISO).",
    parameters: {
      type: "object",
      properties: {
        patient_email: { type: "string", description: "Patient email (or use patient_whatsapp)" },
        patient_whatsapp: { type: "string", description: "Patient WhatsApp/phone (or use patient_email)" },
        new_start_time: { type: "string", description: "New start ISO" },
        new_end_time: { type: "string", description: "New end ISO" },
      },
      required: ["new_start_time", "new_end_time"],
    },
  },
};

const CANCEL_APPOINTMENT_TOOL = {
  type: "function" as const,
  function: {
    name: "cancel_appointment",
    description: "Cancel patient's upcoming appointment. Need patient_email or patient_whatsapp.",
    parameters: {
      type: "object",
      properties: {
        patient_email: { type: "string", description: "Patient email (or use patient_whatsapp)" },
        patient_whatsapp: { type: "string", description: "Patient WhatsApp/phone (or use patient_email)" },
      },
      required: [],
    },
  },
};

async function executeBooking(params: {
  clinicSlug: string;
  sig: string;
  patient_name: string;
  patient_email?: string;
  patient_whatsapp?: string;
  start_time: string;
  end_time: string;
  baseUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${params.baseUrl}/api/embed/confirm-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicSlug: params.clinicSlug,
      sig: params.sig,
      patient_name: params.patient_name.trim(),
      patient_email: params.patient_email?.trim() || undefined,
      patient_phone: params.patient_whatsapp?.trim() || undefined,
      start_time: params.start_time,
      end_time: params.end_time,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && (data as { ok?: boolean }).ok) return { ok: true };
  return { ok: false, error: (data as { error?: string }).error || "Booking failed" };
}

async function executeModifyCancel(params: {
  clinicSlug: string;
  sig: string;
  action: "modify" | "cancel";
  patient_email?: string;
  patient_whatsapp?: string;
  new_start_time?: string;
  new_end_time?: string;
  baseUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${params.baseUrl}/api/embed/modify-cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicSlug: params.clinicSlug,
      sig: params.sig,
      action: params.action,
      patient_email: params.patient_email?.trim() || undefined,
      patient_whatsapp: params.patient_whatsapp?.trim() || undefined,
      new_start_time: params.new_start_time?.trim(),
      new_end_time: params.new_end_time?.trim(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && (data as { ok?: boolean }).ok) return { ok: true };
  return { ok: false, error: (data as { error?: string }).error || "Failed" };
}

export async function POST(request: Request) {
  if (!OPENAI_API_KEY?.length) {
    return NextResponse.json({ error: "Chat not configured" }, { status: 503 });
  }
  let body: {
    messages?: { role: string; content: string }[];
    clinicSlug?: string;
    sig?: string;
    locationId?: string;
    agentId?: string;
    failed_attempts?: number;
    selectedDate?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { messages, clinicSlug, sig, locationId, agentId, failed_attempts, selectedDate } = body;
  if (!Array.isArray(messages) || !clinicSlug?.trim() || !sig?.trim()) {
    return NextResponse.json(
      { error: "Missing messages, clinicSlug, or sig" },
      { status: 400 }
    );
  }
  if (!verifyClinicSignature(clinicSlug.trim(), sig.trim())) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const { allowed: ipAllowed } = await checkIpRateLimit(ip);
  if (!ipAllowed) {
    return NextResponse.json({ message: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const spamResult = checkSpam({
    messages,
    failedUnclearAttempts: typeof failed_attempts === "number" ? failed_attempts : 0,
  });
  if (spamResult.reject && spamResult.message) {
    if (spamResult.humanTakeover) {
      const supabaseForTakeover = createAdminClient();
      const { data: clinicRow } = await supabaseForTakeover
        .from("clinics")
        .select("id, name")
        .eq("slug", clinicSlug.trim())
        .maybeSingle();
      if (clinicRow) {
        const { data: ownerRow } = await supabaseForTakeover
          .from("clinic_members")
          .select("user_id")
          .eq("clinic_id", (clinicRow as { id: string }).id)
          .eq("role", "owner")
          .limit(1)
          .maybeSingle();
        if (ownerRow) {
          try {
            const { data: { user } } = await supabaseForTakeover.auth.admin.getUserById((ownerRow as { user_id: string }).user_id);
            const to = user?.email;
            if (to) {
              await sendResendEmail({
                to,
                subject: "Chat: patient requested human assistance",
                html: renderEmailHtml({
                  greeting: "Hi,",
                  body: `<p>A visitor on your chat widget asked for human assistance (e.g. complaint, refund, or similar).</p><p><strong>Clinic:</strong> ${escapeHtml((clinicRow as { name: string }).name)}</p><p>Please follow up with them directly.</p>`,
                  link: { text: "Open DentraFlow", url: (process.env.NEXT_PUBLIC_APP_URL || "https://www.dentraflow.com").replace(/\/$/, "") + "/app" },
                }),
              });
            }
          } catch { /* noop */ }
        }
      }
    }
    const payload: { message: string; reset_conversation?: boolean; failed_attempts?: number } = {
      message: spamResult.message,
    };
    if (spamResult.resetConversation) payload.reset_conversation = true;
    if (typeof spamResult.failedAttempts === "number") payload.failed_attempts = spamResult.failedAttempts;
    return NextResponse.json(payload);
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (request.headers.get("host")
      ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host")}`
      : "");

  const supabase = createAdminClient();
  const { data: clinic, error: clinicErr } = await supabase
    .from("clinics")
    .select(
      "id, name, accepts_insurance, insurance_notes, working_hours, plan_expires_at, timezone, plan"
    )
    .eq("slug", clinicSlug.trim())
    .limit(1)
    .maybeSingle();
  if (clinicErr || !clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }
  const planExpiresAt = clinic.plan_expires_at
    ? new Date(clinic.plan_expires_at)
    : null;
  if (planExpiresAt && planExpiresAt <= new Date()) {
    return NextResponse.json({ error: "Chat unavailable" }, { status: 403 });
  }

  const plan = (clinic as { plan?: string }).plan;
  const limits = getChatUsageLimits(plan);
  const filteredMessages = messages.filter(
    (m) => m?.role && m?.content && ["user", "assistant"].includes(m.role)
  );
  const messageCount = filteredMessages.length;

  if (messageCount >= limits.perSession) {
    return NextResponse.json({ message: CHAT_LIMIT_MESSAGE });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: usageRow } = await supabase
    .from("embed_chat_daily_usage")
    .select("message_count")
    .eq("clinic_id", clinic.id)
    .eq("usage_date", today)
    .maybeSingle();
  const dailyCount = (usageRow as { message_count?: number } | null)?.message_count ?? 0;
  if (dailyCount >= limits.perDay) {
    return NextResponse.json({ message: CHAT_LIMIT_MESSAGE });
  }
  await supabase.from("embed_chat_daily_usage").upsert(
    {
      clinic_id: clinic.id,
      usage_date: today,
      message_count: dailyCount + 1,
    },
    { onConflict: "clinic_id,usage_date" }
  );

  if (isAbuse(messages)) {
    return NextResponse.json({ message: ABUSE_MESSAGE });
  }

  if (isHoursOnlyQuestion(messages)) {
    let workingHours = clinic.working_hours as Record<string, { open: string; close: string }> | null;
    let effectiveLocationId: string | null = locationId?.trim() || null;
    if (agentId?.trim()) {
      const { data: agent } = await supabase
        .from("ai_agents")
        .select("location_id")
        .eq("id", agentId.trim())
        .eq("clinic_id", clinic.id)
        .maybeSingle();
      if (agent && (agent as { location_id?: string }).location_id) effectiveLocationId = (agent as { location_id: string }).location_id;
    }
    if (effectiveLocationId) {
      const { data: loc } = await supabase
        .from("clinic_locations")
        .select("working_hours")
        .eq("id", effectiveLocationId)
        .eq("clinic_id", clinic.id)
        .maybeSingle();
      if (loc?.working_hours) workingHours = loc.working_hours as Record<string, { open: string; close: string }>;
    }
    const hoursReply = formatHoursForReply(workingHours);
    return NextResponse.json({ message: hoursReply });
  }

  if (isInsuranceOnlyQuestion(messages)) {
    let accepts = clinic.accepts_insurance ?? true;
    let notes: string | null = clinic.insurance_notes ?? null;
    if (agentId?.trim()) {
      const { data: agent } = await supabase
        .from("ai_agents")
        .select("location_id")
        .eq("id", agentId.trim())
        .eq("clinic_id", clinic.id)
        .maybeSingle();
      if (agent && (agent as { location_id?: string }).location_id) {
        const { data: loc } = await supabase
          .from("clinic_locations")
          .select("accepts_insurance, insurance_notes")
          .eq("id", (agent as { location_id: string }).location_id)
          .eq("clinic_id", clinic.id)
          .maybeSingle();
        if (loc) {
          if (loc.accepts_insurance !== undefined && loc.accepts_insurance !== null) accepts = loc.accepts_insurance;
          if (loc.insurance_notes != null) notes = loc.insurance_notes;
        }
      }
    }
    const insuranceReply = formatInsuranceReply(accepts, notes);
    return NextResponse.json({ message: insuranceReply });
  }

  let name = clinic.name;
  let accepts_insurance = clinic.accepts_insurance ?? true;
  let insurance_notes: string | null = clinic.insurance_notes ?? null;
  let working_hours: Record<string, { open: string; close: string }> | null =
    clinic.working_hours ?? null;
  let agentName: string | null = null;
  let effectiveLocationId: string | null = locationId?.trim() || null;
  const clinicTimezone =
    (clinic as { timezone?: string }).timezone?.trim() || "America/New_York";

  if (agentId?.trim()) {
    const { data: agent } = await supabase
      .from("ai_agents")
      .select("name, location_id")
      .eq("id", agentId.trim())
      .eq("clinic_id", clinic.id)
      .maybeSingle();
    if (agent) {
      agentName = (agent as { name: string }).name;
      const locId = (agent as { location_id?: string | null }).location_id;
      if (locId) effectiveLocationId = locId;
    }
  }

  if (effectiveLocationId) {
    const { data: loc } = await supabase
      .from("clinic_locations")
      .select("name, working_hours, accepts_insurance, insurance_notes")
      .eq("id", effectiveLocationId)
      .eq("clinic_id", clinic.id)
      .maybeSingle();
    if (loc) {
      name = loc.name ? `${clinic.name} — ${loc.name}` : clinic.name;
      if (
        loc.accepts_insurance !== undefined &&
        loc.accepts_insurance !== null
      )
        accepts_insurance = loc.accepts_insurance;
      if (
        loc.insurance_notes !== undefined &&
        loc.insurance_notes !== null
      )
        insurance_notes = loc.insurance_notes;
      if (loc.working_hours != null)
        working_hours = loc.working_hours as Record<
          string,
          { open: string; close: string }
        >;
    }
  }

  let holidaysSummary: string | undefined;
  try {
    const { data: holidaysRows } = await supabase
      .from("clinic_holidays")
      .select("holiday_date, end_date, label")
      .eq("clinic_id", clinic.id)
      .is("location_id", null)
      .gte("holiday_date", new Date().toISOString().slice(0, 10));
    holidaysSummary =
      Array.isArray(holidaysRows) && holidaysRows.length
        ? holidaysRows
            .map(
              (h: {
                holiday_date: string;
                end_date?: string | null;
                label?: string | null;
              }) =>
                h.end_date && h.end_date !== h.holiday_date
                  ? `${h.holiday_date}–${h.end_date}${h.label ? ` (${h.label})` : ""}`
                  : `${h.holiday_date}${h.label ? ` (${h.label})` : ""}`
            )
            .join(", ")
        : undefined;
  } catch {
    holidaysSummary = undefined;
  }

  // Returning patient: if any user message looks like an email, look up patient
  let returningPatientName: string | null = null;
  const emails = extractEmailsFromMessages(messages);
  if (emails.length > 0) {
    for (const email of emails) {
      const { data: patient } = await supabase
        .from("patients")
        .select("full_name")
        .eq("clinic_id", clinic.id)
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      if (patient && (patient as { full_name?: string }).full_name) {
        returningPatientName = (patient as { full_name: string }).full_name;
        break;
      }
    }
  }

  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);

  let slotOptions: { label: string; start: string; end: string }[] = [];
  const atDateStep =
    hasBookingIntent(filteredMessages) && !hasDateOrTimeInRecentMessages(filteredMessages);
  const selectedDateStr =
    typeof selectedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate.trim())
      ? selectedDate.trim()
      : null;
  if (selectedDateStr) {
    const fromDate = new Date(selectedDateStr + "T00:00:00.000Z");
    const toDate = new Date(selectedDateStr + "T23:59:59.999Z");
    const { data: appointments } = await supabase
      .from("appointments")
      .select("start_time")
      .eq("clinic_id", clinic.id)
      .in("status", ["pending", "scheduled", "confirmed"])
      .gte("start_time", fromDate.toISOString())
      .lte("start_time", toDate.toISOString());
    const existingStarts = (appointments || []).map(
      (a: { start_time: string }) => (a as { start_time: string }).start_time
    );
    slotOptions = getSlotsForDate(
      working_hours,
      clinicTimezone,
      selectedDateStr,
      existingStarts,
      12,
      true
    );
  } else if (atDateStep) {
    const fromDate = new Date();
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 14);
    const { data: appointments } = await supabase
      .from("appointments")
      .select("start_time")
      .eq("clinic_id", clinic.id)
      .in("status", ["pending", "scheduled", "confirmed"])
      .gte("start_time", fromDate.toISOString())
      .lte("start_time", toDate.toISOString());
    const existingStarts = (appointments || []).map(
      (a: { start_time: string }) => (a as { start_time: string }).start_time
    );
    slotOptions = getNextSlots(working_hours, clinicTimezone, existingStarts, 5);
  }

  const systemPrompt = buildSystemPrompt({
    name,
    accepts_insurance,
    insurance_notes,
    working_hours,
    holidaysSummary,
    agentName: agentName ?? undefined,
    timezone: clinicTimezone,
    returningPatientName: returningPatientName ?? undefined,
    todayDate,
    availableSlots: slotOptions.length > 0 ? slotOptions : undefined,
  });

  let conversationMessages = filteredMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: String(m.content).slice(0, 4000),
  }));

  if (conversationMessages.length > 10) {
    try {
      const summarizerRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "In 2-3 short sentences summarize: what does the patient want (book, change, cancel, hours, insurance) and what info we already have (date, time, name, email, phone). No fluff.",
            },
            ...conversationMessages.slice(0, -4),
          ],
          max_tokens: 150,
          temperature: 0.2,
        }),
      });
      if (summarizerRes.ok) {
        const sumData = (await summarizerRes.json()) as { choices?: { message?: { content?: string } }[] };
        const summary = sumData.choices?.[0]?.message?.content?.trim();
        if (summary) {
          conversationMessages = [
            { role: "user" as const, content: `[Context: ${summary}]` },
            ...conversationMessages.slice(-6),
          ];
        }
      }
    } catch {
      conversationMessages = conversationMessages.slice(-10);
    }
  }

  type OpenAIMessage =
    | { role: "system" | "user" | "assistant"; content?: string; tool_calls?: unknown[]; tool_call_id?: string; name?: string }
    | { role: "tool"; tool_call_id: string; content: string };
  const openaiMessages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationMessages,
  ];

  const tools = [BOOK_APPOINTMENT_TOOL, MODIFY_APPOINTMENT_TOOL, CANCEL_APPOINTMENT_TOOL];

  const defaultFallback =
    "Sorry, I didn't get that. Try: Book • Hours • Insurance? Or call the clinic.";

  try {
    let response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        max_tokens: 300,
        temperature: 0.5,
        tools,
        tool_choice: "auto",
      }),
      timeout: OPENAI_TIMEOUT_MS,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      if (response.status === 401) {
        return NextResponse.json({ error: "Chat not configured" }, { status: 503 });
      }
      return NextResponse.json(
        { error: "AI error", message: "Sorry, the assistant is temporarily unavailable. Try: Cleaning • Checkup • Book • Hours • Insurance?" },
        { status: 502 }
      );
    }

    let data = (await response.json()) as {
      choices?: {
        message?: {
          content?: string;
          tool_calls?: { id: string; function?: { name: string; arguments: string } }[];
        };
      }[];
    };
    let choice = data.choices?.[0];
    let message = choice?.message;
    if (!message) {
      return NextResponse.json({ message: defaultFallback });
    }

    const toolCalls = message.tool_calls;
    if (toolCalls?.length && baseUrl) {
      let toolResultText = "";
      for (const tc of toolCalls) {
        const fnName = tc.function?.name;
        let args: Record<string, string>;
        try {
          args = JSON.parse(tc.function?.arguments || "{}") as Record<string, string>;
        } catch {
          continue;
        }
        if (fnName === "book_appointment") {
          const patient_name = args.patient_name?.trim();
          const start_time = args.start_time?.trim();
          const end_time = args.end_time?.trim();
          const email = args.patient_email?.trim();
          const whatsapp = args.patient_whatsapp?.trim();
          if (!patient_name || !start_time || !end_time) continue;
          if (!email && !whatsapp) {
            toolResultText = "Booking failed: need at least email or WhatsApp. Ask the patient for one.";
            break;
          }
          const result = await executeBooking({
            clinicSlug: clinicSlug.trim(),
            sig: sig.trim(),
            patient_name,
            patient_email: email || undefined,
            patient_whatsapp: whatsapp || undefined,
            start_time,
            end_time,
            baseUrl,
          });
          toolResultText = result.ok
            ? "Booked successfully. Tell the patient they are booked and we sent a confirmation. Then add: Need to change or cancel later? Just type 'change' or 'cancel' anytime."
            : `Booking failed: ${result.error}. Apologize and ask them to try again or call the clinic.`;
        } else if (fnName === "modify_appointment") {
          const new_start = args.new_start_time?.trim();
          const new_end = args.new_end_time?.trim();
          if (!new_start || !new_end) {
            toolResultText = "Modify failed: new_start_time and new_end_time required.";
            break;
          }
          const result = await executeModifyCancel({
            clinicSlug: clinicSlug.trim(),
            sig: sig.trim(),
            action: "modify",
            patient_email: args.patient_email?.trim() || undefined,
            patient_whatsapp: args.patient_whatsapp?.trim() || undefined,
            new_start_time: new_start,
            new_end_time: new_end,
            baseUrl,
          });
          toolResultText = result.ok ? "Appointment rescheduled. Confirm to the patient and send updated confirmation." : `Failed: ${result.error}. Ask them to call the clinic.`;
        } else if (fnName === "cancel_appointment") {
          const result = await executeModifyCancel({
            clinicSlug: clinicSlug.trim(),
            sig: sig.trim(),
            action: "cancel",
            patient_email: args.patient_email?.trim() || undefined,
            patient_whatsapp: args.patient_whatsapp?.trim() || undefined,
            baseUrl,
          });
          toolResultText = result.ok ? "Appointment cancelled. Confirm to the patient." : `Failed: ${result.error}. Ask them to call the clinic.`;
        } else {
          continue;
        }
        openaiMessages.push({
          role: "assistant",
          content: message.content ?? undefined,
          tool_calls: toolCalls.map((t) => ({
            id: t.id,
            type: "function" as const,
            function: { name: t.function?.name, arguments: t.function?.arguments },
          })),
        });
        openaiMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: toolResultText,
        });

        response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: openaiMessages,
            max_tokens: 300,
            temperature: 0.3,
          }),
          timeout: OPENAI_TIMEOUT_MS,
        });
        if (!response.ok) {
          return NextResponse.json({ message: toolResultText });
        }
        data = (await response.json()) as typeof data;
        message = data.choices?.[0]?.message;
        break;
      }
    }

    const content =
      message?.content?.trim() ||
      defaultFallback;
    const payload: { message: string; suggested_slots?: { label: string; value: string }[] } = { message: content };
    if (slotOptions.length > 0) {
      payload.suggested_slots = slotOptions.map((s) => ({ label: s.label, value: s.start }));
    }
    return NextResponse.json(payload);
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      {
        error: "AI error",
        message: isTimeout
          ? "The request took too long. Please try again: Cleaning • Checkup • Book • Hours • Insurance?"
          : "Sorry, something went wrong. Try: Cleaning • Checkup • Book • Hours • Insurance?",
      },
      { status: 502 }
    );
  }
}
