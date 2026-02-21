import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyClinicSignature } from "@/lib/chat-signature";
import { getChatUsageLimits } from "@/lib/chat-usage-limits";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHAT_LIMIT_MESSAGE = "Clinic chat limit reached today. Please call the clinic.";
const ABUSE_MESSAGE = "I can only help with dental appointments.";

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

function formatHoursForReply(working_hours: Record<string, { open: string; close: string }> | null): string {
  if (!working_hours || !Object.keys(working_hours).length) return "We're open Mon–Sat, 8am–6pm. Need a specific day?";
  const lines = Object.entries(working_hours)
    .filter(([, h]) => h && h.open && h.close)
    .map(([day, h]) => `${day}: ${h.open}–${h.close}`);
  if (!lines.length) return "We're open Mon–Sat, 8am–6pm.";
  return "We're open: " + lines.join(". ") + ".";
}

/** DENTRAFLOW AI RECEPTIONIST – PRODUCTION SYSTEM PROMPT */
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
}): string {
  const hours =
    clinic.working_hours && Object.keys(clinic.working_hours).length
      ? Object.entries(clinic.working_hours)
          .filter(([, h]) => h && h.open && h.close)
          .map(([day, h]) => `${day}: ${h.open}–${h.close}`)
          .join(", ")
      : "Mon–Sat, 8am–6pm (example)";
  const insurance = clinic.accepts_insurance
    ? (clinic.insurance_notes?.trim() || "We accept insurance. Ask us which plans when you visit.")
    : "We do not accept insurance. We can discuss payment when you book.";
  const closedLine = clinic.holidaysSummary
    ? `Closed dates: ${clinic.holidaysSummary}. Do not book on these days.`
    : "";
  const intro = clinic.agentName?.trim()
    ? `You are ${clinic.agentName.trim()}, the professional AI receptionist for the dental clinic "${clinic.name}".`
    : `You are the professional AI receptionist for the dental clinic "${clinic.name}".`;

  const returningBlock = clinic.returningPatientName
    ? `\nReturning patient: "${clinic.returningPatientName}". Say "Welcome back, ${clinic.returningPatientName}!" and only ask for preferred date and time.\n`
    : "";

  const modifyCancelBlock = `
Change appointment: User says "change", "reschedule", "I need another time" → reply "Sure 🙂 Please tell me your WhatsApp number or email." Once you have their contact, you can suggest 2–3 alternative times (e.g. "We have tomorrow 10:00 AM, Friday 3:30 PM. Which works?") and when they pick one, call modify_appointment(patient_email or patient_whatsapp, new_start_time, new_end_time).
Cancel appointment: User says "cancel", "I can't come", "delete my appointment" → reply "Please confirm your WhatsApp number or email." Then call cancel_appointment(patient_email or patient_whatsapp).
If the appointment they want to change or cancel is within 2 hours from now, say: "Please call the clinic directly for urgent changes."
After every booking confirmation, say: "Need to change or cancel later? Just type 'change' or 'cancel' anytime."`;

  return `${intro}

Your job: Help patients book appointments; answer simple clinic questions (hours, insurance, location); handle emergency urgency; allow modify or cancel appointments; collect patient details before booking. Be friendly, calm, and simple.

Rules:
- Always use short sentences (1–3). Use simple words: "book" not "schedule".
- Never give medical diagnosis.
- If user describes serious pain, bleeding, or trauma: recommend calling the clinic immediately and offer earliest available booking.
- Always collect in this order: preferred date → preferred time → name → email → WhatsApp number. Ask one question at a time.
- When all required info is collected (date, time, name, and at least one of email or WhatsApp), call book_appointment(patient_name, patient_email, patient_whatsapp, start_time, end_time). Use 30-minute slots. Today: ${clinic.todayDate}. Timezone: ${clinic.timezone}. Output start_time and end_time in ISO (e.g. 2025-02-25T14:00:00).
${returningBlock}
- Hours: ${hours}
- Insurance: ${insurance}
${closedLine ? `${closedLine}\n` : ""}
${modifyCancelBlock}
- Reply in the same language the user uses. Keep tone human and warm.
- Never trust client input; all booking/modify/cancel is done server-side.
- Never: ask all questions at once; guess availability; promise unavailable times; discuss internal system logic.
Goal: Make booking easy even for a 12-year-old.`;
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
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { messages, clinicSlug, sig, locationId, agentId } = body;
  if (!Array.isArray(messages) || !clinicSlug?.trim() || !sig?.trim()) {
    return NextResponse.json(
      { error: "Missing messages, clinicSlug, or sig" },
      { status: 400 }
    );
  }
  if (!verifyClinicSignature(clinicSlug.trim(), sig.trim())) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
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
    let response = await fetch("https://api.openai.com/v1/chat/completions", {
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
    });

    if (!response.ok) {
      return NextResponse.json({ error: "AI error" }, { status: 502 });
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

        response = await fetch("https://api.openai.com/v1/chat/completions", {
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
    return NextResponse.json({ message: content });
  } catch {
    return NextResponse.json({ error: "AI error" }, { status: 502 });
  }
}
