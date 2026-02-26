"use client";

import { useState, useCallback } from "react";
import { isValidChatEmail } from "@/lib/embed-validate";
import { buildGoogleCalendarUrl } from "@/lib/google-calendar-url";

export type DentalAgentState =
  | "GREETING"
  | "BOOKING_REASON"
  | "BOOKING_DATE"
  | "BOOKING_PERIOD"
  | "BOOKING_TIME"
  | "PATIENT_DETAILS"
  | "POLICY_AGREEMENT"
  | "VERIFY_ACCOUNT"
  | "MANAGE_BOOKING"
  | "CLINIC_INFO"
  | "EMERGENCY"
  | "BOOKING_SUCCESS"
  | "CANCEL_SUCCESS";

export interface SuggestionItem {
  key: string;
  label: string;
  value?: string;
  variant?: "default" | "danger" | "secondary" | "primary";
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
}

export interface VerifiedAppointment {
  id: string;
  start_time: string;
  end_time: string;
  reason?: string;
}

export interface ClinicInfo {
  name: string;
  phone?: string;
  whatsapp_phone?: string;
  working_hours?: Record<string, { open: string; close: string }>;
  address?: string;
  landmark?: string;
  /** IANA timezone (e.g. America/New_York). Used so patients always see times in clinic timezone. */
  timezone?: string;
  /** Shown before payment when deposit required; used for policy agreement step. */
  cancellation_policy_text?: string;
}

const FIXED_SERVICES: SuggestionItem[] = [
  { key: "cleaning", label: "Cleaning" },
  { key: "pain", label: "Pain" },
  { key: "checkup", label: "Checkup" },
  { key: "root_canal", label: "Root canal" },
  { key: "other", label: "Other" },
];

const DEFAULT_SLOT_DURATION_MINUTES = 30;

function toYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Format an ISO date/time string in the clinic's timezone so patients see clinic local time. */
function formatInClinicTz(isoString: string, timezone: string | undefined): string {
  const tz = timezone?.trim() || "America/New_York";
  return new Date(isoString).toLocaleString(undefined, {
    timeZone: tz,
    dateStyle: "long",
    timeStyle: "short",
  });
}

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

/** Format time "09:00" / "17:00" to readable "9:00 AM" / "5:00 PM". */
function formatTimeRange(open: string, close: string): string {
  const toDisplay = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const hour = h ?? 0;
    const min = m ?? 0;
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${min.toString().padStart(2, "0")} ${ampm}`;
  };
  return `${toDisplay(open)}–${toDisplay(close)}`;
}

/** Format working_hours into a readable string (e.g. "Mon–Fri 9:00 AM–5:00 PM, Sat 9:00 AM–1:00 PM"). */
function formatWorkingHours(working_hours: Record<string, { open: string; close: string }> | undefined): string {
  if (!working_hours || Object.keys(working_hours).length === 0) return "Mon–Sat, 8am–6pm";
  const entries = DAY_ORDER.filter((d) => working_hours[d]?.open && working_hours[d]?.close).map((day) => ({
    day,
    label: DAY_LABELS[day] ?? day,
    range: formatTimeRange(working_hours[day].open, working_hours[day].close),
  }));
  if (entries.length === 0) return "Mon–Sat, 8am–6pm";
  const parts: string[] = [];
  let i = 0;
  while (i < entries.length) {
    const start = i;
    const range = entries[i].range;
    while (i + 1 < entries.length && entries[i + 1].range === range) i++;
    const end = i;
    if (start === end) parts.push(`${entries[start].label} ${range}`);
    else parts.push(`${entries[start].label}–${entries[end].label} ${range}`);
    i++;
  }
  return parts.join(", ");
}

const GREETING_MSG = "Hi 👋 How can i help you today?";
const MSG_PATIENT_DETAILS = "Enter your full name.";
const MSG_BOOKING_REASON = "What do you need? Pick a reason.";
const MSG_VERIFY_EMAIL = "Enter the email you used to book.";
const MSG_CHOOSE_PERIOD = "Morning, afternoon, or evening?";
const MSG_CHOOSE_SLOT = "Choose a time:";
const MSG_NO_APPT = "No booking for this email. Book a new one?";
const MSG_TRY_AGAIN = "Not found. Please try again.";
const MSG_ENTER_EMAIL = "Thanks! Enter your email.";
const MSG_BOOKING_FAILED = "Booking failed. Please try again.";
const MSG_BOOKING_FAILED_LAST = "Something went wrong. You can start a new booking or go back.";
const MSG_CANCELLED = "Your appointment has been cancelled. If you paid a deposit, the clinic will contact you about any refund. We hope to see you soon!";
const MSG_CANNOT_CANCEL = "Could not cancel.";
const MSG_CALL_CLINIC = "Please call the clinic.";
const MSG_RESCHEDULED = "Rescheduled! Confirmation sent. How else can we help?";
const MSG_CANNOT_RESCHEDULE = "Could not reschedule. Please call the clinic.";

const MSG_POLICY_AGREEMENT = "Please agree to the clinic's cancellation and refund policy to continue.";
const MSG_POLICY_CHECK_REQUIRED = "Please check the box to agree to the cancellation and refund policy.";

export interface ServiceSuggestion {
  key: string;
  label: string;
  duration_minutes: number;
}

export interface UseDentalAgentConfig {
  clinicSlug: string;
  sig: string;
  locationId?: string;
  agentId?: string;
  isElitePlan?: boolean;
  /** Pro or Elite: show Add to Google Calendar after booking. */
  isProOrElite?: boolean;
  clinicInfo: ClinicInfo;
  /** Appointment types from settings (name + duration). Used as chips (no time in label) and for slot length. */
  serviceSuggestions?: ServiceSuggestion[] | null;
  /** When true, show policy agreement step before confirm. When false (free booking or clinic disabled), skip agreement. */
  requirePolicyAgreement?: boolean;
}

export function useDentalAgent(config: UseDentalAgentConfig) {
  const { clinicSlug, sig, locationId, agentId, isElitePlan, isProOrElite, clinicInfo, serviceSuggestions, requirePolicyAgreement = false } = config;
  const bookingReasonSuggestions: SuggestionItem[] =
    serviceSuggestions && serviceSuggestions.length > 0
      ? serviceSuggestions.map((s) => ({ key: s.key, label: s.label }))
      : FIXED_SERVICES;
  const [currentState, setCurrentState] = useState<DentalAgentState>("GREETING");
  const [message, setMessage] = useState(GREETING_MSG);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "0", role: "ai", text: GREETING_MSG }]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isInputDisabled, setIsInputDisabled] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotSuggestions, setSlotSuggestions] = useState<SuggestionItem[]>([]);
  /** All slots for the selected date (used to filter by period). */
  const [allSlotsForDate, setAllSlotsForDate] = useState<SuggestionItem[]>([]);
  /** Period chips (Morning, Afternoon, Evening) when in BOOKING_PERIOD. */
  const [periodSuggestions, setPeriodSuggestions] = useState<SuggestionItem[]>([]);

  // Booking flow context
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedServiceDuration, setSelectedServiceDuration] = useState<number>(DEFAULT_SLOT_DURATION_MINUTES);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [patientEmail, setPatientEmail] = useState<string | null>(null);
  const [verifiedAppointments, setVerifiedAppointments] = useState<VerifiedAppointment[]>([]);
  const [verifiedPatientEmail, setVerifiedPatientEmail] = useState<string | null>(null);
  const [patientDetailsStep, setPatientDetailsStep] = useState<"name" | "email">("name");
  const [patientPhone, setPatientPhone] = useState<string | null>(null);
  const [verifyAttemptCount, setVerifyAttemptCount] = useState(0);
  const [bookingFailCount, setBookingFailCount] = useState(0);
  const [policyAgreed, setPolicyAgreed] = useState(false);

  const isEmbed =
    typeof window !== "undefined" &&
    typeof (window as { location?: { pathname?: string } }).location?.pathname === "string" &&
    (window as { location: { pathname: string } }).location.pathname.startsWith("/embed");
  const baseUrl = isEmbed
    ? (process.env.NEXT_PUBLIC_APP_URL || "https://www.dentraflow.com").replace(/\/$/, "")
    : ((typeof window !== "undefined" ? window.location.origin : "") ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://www.dentraflow.com").replace(/\/$/, "");

  const appendMessage = useCallback((role: "user" | "ai", text: string) => {
    setMessages((prev) => [...prev, { id: String(Date.now()), role, text }]);
  }, []);

  const setStateWithMessageAndSuggestions = useCallback(
    (state: DentalAgentState, msg: string, sugg: SuggestionItem[]) => {
      setCurrentState(state);
      setMessage(msg);
      setSuggestions(sugg);
      appendMessage("ai", msg);
    },
    [appendMessage]
  );
  const setStateOnlySuggestions = useCallback((state: DentalAgentState, sugg: SuggestionItem[]) => {
    setCurrentState(state);
    setSuggestions(sugg);
  }, []);

  const greetingSuggestions: SuggestionItem[] = [
    { key: "book", label: "Book Appointment", variant: "primary" },
    { key: "change_cancel", label: "Change / Cancel" },
    { key: "clinic_info", label: "Clinic Info" },
    { key: "emergency", label: "EMERGENCY", variant: "danger" },
  ];

  // Initialize suggestions for GREETING; BOOKING_TIME shows slots + Back (no duplicate)
  const backChip: SuggestionItem = { key: "back", label: "Back", variant: "secondary" };
  const lockedSuggestions: SuggestionItem[] = [
    { key: "book", label: "Book Appointment", variant: "primary" },
    backChip,
  ];
  const bookingTimeSuggestions =
    slotSuggestions.some((s) => s.key === "back")
      ? slotSuggestions
      : [...slotSuggestions.map((s) => ({ ...s, variant: "primary" as const })), backChip];
  const displaySuggestions =
    currentState === "GREETING" && suggestions.length === 0
      ? greetingSuggestions
      : currentState === "BOOKING_TIME" && slotSuggestions.length > 0
        ? bookingTimeSuggestions
        : suggestions;

  const fetchSlots = useCallback(
    async (
      dateStr: string | null,
      durationMinutes?: number
    ): Promise<{ slots: SuggestionItem[]; hasSlotsToday?: boolean; fetchFailed?: boolean }> => {
      const params = new URLSearchParams({ clinicSlug, sig });
      if (locationId) params.set("location", locationId);
      if (agentId) params.set("agent", agentId);
      if (dateStr) params.set("date", dateStr);
      if (durationMinutes != null && durationMinutes > 0) params.set("duration", String(durationMinutes));
      try {
        const res = await fetch(`${baseUrl}/api/embed/slots?${params}`);
        if (!res.ok) return { slots: [], fetchFailed: true };
        const data = (await res.json()) as {
          slots?: { label: string; start: string; end: string }[];
          hasSlotsToday?: boolean;
        };
        const slots = (data.slots || []).map((s) => ({
          key: s.start,
          label: s.label,
          value: s.start,
        }));
        return { slots, hasSlotsToday: data.hasSlotsToday };
      } catch {
        return { slots: [], fetchFailed: true };
      }
    },
    [baseUrl, clinicSlug, sig, locationId, agentId]
  );

  const fetchWorkingDays = useCallback(async (): Promise<SuggestionItem[]> => {
    const params = new URLSearchParams({ clinicSlug, sig, days: "1" });
    if (locationId) params.set("location", locationId);
    if (agentId) params.set("agent", agentId);
    const res = await fetch(`${baseUrl}/api/embed/slots?${params}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { workingDays?: { dateStr: string; label: string }[] };
    return (data.workingDays || []).map((d) => ({
      key: d.dateStr,
      label: d.label,
      value: d.dateStr,
    }));
  }, [baseUrl, clinicSlug, sig, locationId, agentId]);

  const onChipSelect = useCallback(
    async (key: string, label: string, value?: string) => {
      if (currentState === "BOOKING_TIME" && value) {
        const durationMs = selectedServiceDuration * 60 * 1000;
        const end = new Date(new Date(value).getTime() + durationMs).toISOString();
        setSelectedSlot({ start: value, end });
        setIsInputDisabled(false);
        setPatientDetailsStep("name");
        appendMessage("user", label);
        setStateWithMessageAndSuggestions("PATIENT_DETAILS", MSG_PATIENT_DETAILS, []);
        setSlotSuggestions([]);
        return;
      }

      appendMessage("user", label);

      switch (currentState) {
        case "GREETING":
          if (key === "book") {
            setBookingFailCount(0);
            setStateWithMessageAndSuggestions("BOOKING_REASON", MSG_BOOKING_REASON, bookingReasonSuggestions);
          } else if (key === "change_cancel") {
            setIsInputDisabled(false);
            setStateWithMessageAndSuggestions("VERIFY_ACCOUNT", MSG_VERIFY_EMAIL, []);
          } else if (key === "clinic_info") {
            const hours = formatWorkingHours(clinicInfo.working_hours);
            const address = [clinicInfo.address, clinicInfo.landmark].filter(Boolean).join(". ").trim() || "our clinic";
            const msg = `We're at ${address}.\n\nHours: ${hours}.\n\nBook an appointment?`;
            setStateWithMessageAndSuggestions("CLINIC_INFO", msg, [
              { key: "book", label: "Book Appointment", variant: "primary" },
              backChip,
            ]);
          } else if (key === "emergency") {
            const phone = clinicInfo.whatsapp_phone || clinicInfo.phone || "";
            const phoneStr = typeof phone === "string" && phone ? phone : "the clinic";
            const msg = `Call us now: ${phoneStr}. Tooth out? Keep in milk. Bleeding? Use gauze.`;
            setStateWithMessageAndSuggestions("EMERGENCY", msg, [backChip]);
          }
          break;

        case "BOOKING_REASON":
          setSelectedService(label);
          const serviceItem = serviceSuggestions?.find((s) => s.key === key || s.label === label);
          setSelectedServiceDuration(serviceItem?.duration_minutes ?? DEFAULT_SLOT_DURATION_MINUTES);
          setStateWithMessageAndSuggestions("BOOKING_DATE", "When would you like to come? Pick a day.", [backChip]);
          setIsLoadingSlots(true);
          fetchWorkingDays().then((dateChips) => {
            setStateOnlySuggestions("BOOKING_DATE", [...dateChips, backChip]);
            setSuggestions([...dateChips, backChip]);
            setIsLoadingSlots(false);
          });
          break;

        case "BOOKING_PERIOD":
          if (key === "back") {
            setAllSlotsForDate([]);
            setPeriodSuggestions([]);
            setCurrentState("BOOKING_DATE");
            setMessage("When would you like to come? Pick a day.");
            setSuggestions([backChip]);
            appendMessage("ai", "When would you like to come? Pick a day.");
            fetchWorkingDays().then((dateChips) => {
              setStateOnlySuggestions("BOOKING_DATE", [...dateChips, backChip]);
              setSuggestions([...dateChips, backChip]);
            });
          } else if (key === "Morning" || key === "Afternoon" || key === "Evening") {
            const filtered = allSlotsForDate.filter((s) => s.label.startsWith(`${key} `));
            const timeOnlySlots = filtered.map((s) => ({
              ...s,
              label: s.label.replace(/^(Morning|Afternoon|Evening) /, ""),
              variant: "primary" as const,
            }));
            setSlotSuggestions([...timeOnlySlots, backChip]);
            setStateOnlySuggestions("BOOKING_TIME", []);
            setMessage(MSG_CHOOSE_SLOT);
            appendMessage("ai", MSG_CHOOSE_SLOT);
          }
          break;

        case "BOOKING_DATE":
          setSelectedDate(key);
          setIsLoadingSlots(true);
          setSlotSuggestions([]);
          const dateStrForSlots = /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
          if (!dateStrForSlots) {
            setIsLoadingSlots(false);
            break;
          }
          const { slots: slotList, fetchFailed } = await fetchSlots(dateStrForSlots, selectedServiceDuration);
          setIsLoadingSlots(false);
          if (slotList.length === 0) {
            const noSlotsMsg = fetchFailed
              ? "Couldn't load slots. Please try again or pick another date."
              : "No slots available for this day. Pick another date.";
            setMessage(noSlotsMsg);
            appendMessage("ai", noSlotsMsg);
            const backOnly: SuggestionItem[] = [backChip];
            setSlotSuggestions(backOnly);
            setStateOnlySuggestions("BOOKING_TIME", backOnly);
          } else {
            const withVariant = slotList.map((s) => ({ ...s, variant: "primary" as const }));
            setAllSlotsForDate(withVariant);
            const periods = [...new Set(withVariant.map((s) => s.label.split(" ")[0]))].filter(
              (p): p is string => p === "Morning" || p === "Afternoon" || p === "Evening"
            );
            const periodChips: SuggestionItem[] = [
              ...periods.map((p) => ({ key: p, label: p, variant: "primary" as const })),
              backChip,
            ];
            setPeriodSuggestions(periodChips);
            setSlotSuggestions([]);
            setStateWithMessageAndSuggestions("BOOKING_PERIOD", MSG_CHOOSE_PERIOD, periodChips);
          }
          break;

        case "CLINIC_INFO":
        case "EMERGENCY":
          if (key === "back") {
            setCurrentState("GREETING");
            setMessage(GREETING_MSG);
            setSuggestions(greetingSuggestions);
            appendMessage("ai", GREETING_MSG);
          }
          break;

        case "VERIFY_ACCOUNT":
          setVerifyAttemptCount(0);
          setIsInputDisabled(false);
          if (key === "back") {
            setCurrentState("GREETING");
            setMessage(GREETING_MSG);
            setSuggestions(greetingSuggestions);
            appendMessage("ai", GREETING_MSG);
          } else if (key === "book") {
            setBookingFailCount(0);
            setStateWithMessageAndSuggestions("BOOKING_REASON", MSG_BOOKING_REASON, bookingReasonSuggestions);
          }
          break;
      }
    },
    [
      currentState,
      selectedServiceDuration,
      baseUrl,
      clinicSlug,
      sig,
      clinicInfo,
      appendMessage,
      setStateWithMessageAndSuggestions,
      setStateOnlySuggestions,
      fetchSlots,
      fetchWorkingDays,
      bookingReasonSuggestions,
      serviceSuggestions,
    ]
  );

  const onSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      appendMessage("user", trimmed);

      if (currentState === "VERIFY_ACCOUNT") {
        const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const email = emailMatch ? emailMatch[0].toLowerCase() : trimmed.toLowerCase();
        try {
          const res = await fetch(`${baseUrl}/api/embed/verify-patient`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clinicSlug, sig, patient_email: email }),
          });
          const data = (await res.json()) as {
            ok?: boolean;
            error?: string;
            patient_name?: string;
            appointments?: VerifiedAppointment[];
          };
          if (data.ok && data.appointments?.length) {
            setVerifyAttemptCount(0);
            setVerifiedAppointments(data.appointments);
            setVerifiedPatientEmail(email);
            const appt = data.appointments[0];
            const startStr = formatInClinicTz(appt.start_time, clinicInfo.timezone);
            const msg = `Welcome back! Your appointment: ${startStr}. What next?`;
            setStateWithMessageAndSuggestions("MANAGE_BOOKING", msg, [
              { key: "reschedule", label: "Reschedule" },
              { key: "cancel_appointment", label: "Cancel Appointment" },
            ]);
            setIsInputDisabled(true);
          } else {
            const apiError = typeof data.error === "string" ? data.error : null;
            const nextAttempt = verifyAttemptCount + 1;
            setVerifyAttemptCount(nextAttempt);
            if (nextAttempt >= 3) {
              setIsInputDisabled(true);
              setStateWithMessageAndSuggestions("VERIFY_ACCOUNT", apiError ?? "No booking found for this email. You can book a new appointment or go back.", [
                { key: "book", label: "Book Appointment", variant: "primary" },
                backChip,
              ]);
            } else {
              const tryAgainMsg = apiError ?? `Email not found. Please try again (${nextAttempt} of 3).`;
              setStateWithMessageAndSuggestions("VERIFY_ACCOUNT", tryAgainMsg, []);
            }
          }
        } catch {
          const nextAttempt = verifyAttemptCount + 1;
          setVerifyAttemptCount(nextAttempt);
          if (nextAttempt >= 3) {
            setIsInputDisabled(true);
            setStateWithMessageAndSuggestions("VERIFY_ACCOUNT", "Something went wrong. You can book a new appointment or go back.", [
              { key: "book", label: "Book Appointment", variant: "primary" },
              backChip,
            ]);
          } else {
            setStateWithMessageAndSuggestions(
              "VERIFY_ACCOUNT",
              `Something went wrong. Please try again (${nextAttempt} of 3).`,
              []
            );
          }
        }
        return;
      }

      if (currentState === "PATIENT_DETAILS") {
        if (patientDetailsStep === "name") {
          setPatientName(trimmed);
          setPatientDetailsStep("email");
          setMessage(MSG_ENTER_EMAIL);
          appendMessage("ai", MSG_ENTER_EMAIL);
          return;
        }
        if (patientDetailsStep === "email") {
          const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          const email = emailMatch ? emailMatch[0].trim().toLowerCase() : trimmed.trim().toLowerCase();
          const emailCheck = isValidChatEmail(email);
          if (!emailCheck.valid) {
            setMessage(emailCheck.error ?? "Please enter a valid email.");
            appendMessage("ai", emailCheck.error ?? "Please enter a valid email.");
            return;
          }
          setPatientEmail(email);
          // Use local email; don't rely on state (async) for same-render transition
          if (selectedSlot?.start && selectedSlot?.end && patientName && email) {
            if (requirePolicyAgreement) {
              setStateWithMessageAndSuggestions("POLICY_AGREEMENT", MSG_POLICY_AGREEMENT, [
                { key: "confirm_booking", label: "Confirm booking", variant: "primary" },
              ]);
              setPolicyAgreed(false);
            } else {
              // No explicit agreement step required: confirm immediately
              doConfirmBooking(new Date().toISOString());
            }
          }
          return;
        }
        return;
      }

      if (currentState === "POLICY_AGREEMENT") {
        return;
      }
    },
    [
      currentState,
      patientDetailsStep,
      patientName,
      patientEmail,
      patientPhone,
      selectedSlot,
      verifyAttemptCount,
      bookingFailCount,
      baseUrl,
      clinicSlug,
      sig,
      isElitePlan,
      isProOrElite,
      clinicInfo,
      requirePolicyAgreement,
      appendMessage,
      setStateWithMessageAndSuggestions,
    ]
  );

  async function doConfirmBooking(policyAcceptedAt: string) {
    if (!selectedSlot?.start || !selectedSlot?.end || !patientName || !patientEmail) return;
    const phoneForBooking = patientPhone?.replace(/\s/g, "") || undefined;
    try {
      const res = await fetch(`${baseUrl}/api/embed/confirm-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicSlug,
          sig,
          patient_name: patientName,
          patient_email: patientEmail,
          patient_phone: phoneForBooking,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          policy_accepted_at: policyAcceptedAt,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        setCurrentState("BOOKING_SUCCESS");
        const startStr = formatInClinicTz(selectedSlot.start, clinicInfo.timezone);
        const msg = `You're booked for ${startStr}. Confirmation sent by email.`;
        setMessage(msg);
        const successChips: SuggestionItem[] = [
          { key: "book_another", label: "Book another", variant: "primary" },
          backChip,
        ];
        if (isProOrElite && selectedSlot?.start && selectedSlot?.end) {
          const gcalUrl = buildGoogleCalendarUrl({
            title: `Appointment at ${clinicInfo.name}`,
            start: selectedSlot.start,
            end: selectedSlot.end,
            details: `${clinicInfo.name}${clinicInfo.address ? ` — ${clinicInfo.address}` : ""}`,
            location: clinicInfo.address,
          });
          successChips.unshift({ key: "gcal", label: "Add to Google Calendar", value: gcalUrl });
        }
        setSuggestions(successChips);
        appendMessage("ai", msg);
        setIsInputDisabled(true);
        setSelectedSlot(null);
        setPatientName(null);
        setPatientEmail(null);
        setPatientPhone(null);
        setPatientDetailsStep("name");
        setPolicyAgreed(false);
      } else {
        const nextFail = bookingFailCount + 1;
        setBookingFailCount(nextFail);
        if (nextFail >= 3) {
          setSelectedSlot(null);
          setPatientName(null);
          setPatientEmail(null);
          setPatientPhone(null);
          setPatientDetailsStep("name");
          setIsInputDisabled(true);
          setStateWithMessageAndSuggestions("GREETING", MSG_BOOKING_FAILED_LAST, [
            { key: "book", label: "Book Appointment", variant: "primary" },
            backChip,
          ]);
        } else {
          const errMsg = data.error || MSG_BOOKING_FAILED;
          setMessage(errMsg);
          appendMessage("ai", errMsg);
        }
      }
    } catch {
      const nextFail = bookingFailCount + 1;
      setBookingFailCount(nextFail);
      if (nextFail >= 3) {
        setSelectedSlot(null);
        setPatientName(null);
        setPatientEmail(null);
        setPatientPhone(null);
        setPatientDetailsStep("name");
        setIsInputDisabled(true);
        setStateWithMessageAndSuggestions("GREETING", MSG_BOOKING_FAILED_LAST, [
          { key: "book", label: "Book Appointment", variant: "primary" },
          backChip,
        ]);
      } else {
        setMessage(MSG_BOOKING_FAILED);
        appendMessage("ai", MSG_BOOKING_FAILED);
      }
    }
  }

  // MANAGE_BOOKING: Reschedule / Cancel
  const handleManageBookingAction = useCallback(
    async (action: "reschedule" | "cancel", newStart?: string, newEnd?: string) => {
      if (action === "cancel") {
        try {
          const res = await fetch(`${baseUrl}/api/embed/modify-cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clinicSlug,
              sig,
              action: "cancel",
              patient_email: verifiedPatientEmail,
            }),
          });
          const data = (await res.json()) as { ok?: boolean; error?: string };
          if (data.ok) {
            setCurrentState("CANCEL_SUCCESS");
            setMessage(MSG_CANCELLED);
            setSuggestions([
              { key: "book", label: "Book Appointment", variant: "primary" },
              backChip,
            ]);
            appendMessage("ai", MSG_CANCELLED);
            setVerifiedAppointments([]);
            setVerifiedPatientEmail(null);
          } else {
            const errMsg = data.error || MSG_CANNOT_CANCEL;
            setMessage(errMsg);
            appendMessage("ai", errMsg);
          }
        } catch {
          setMessage(MSG_CALL_CLINIC);
          appendMessage("ai", MSG_CALL_CLINIC);
        }
        return;
      }
      if (action === "reschedule" && newStart && newEnd) {
        try {
          const res = await fetch(`${baseUrl}/api/embed/modify-cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clinicSlug,
              sig,
              action: "modify",
              patient_email: verifiedPatientEmail,
              new_start_time: newStart,
              new_end_time: newEnd,
            }),
          });
          const data = (await res.json()) as { ok?: boolean; error?: string };
          if (data.ok) {
            setCurrentState("GREETING");
            setMessage(MSG_RESCHEDULED);
            setSuggestions(greetingSuggestions);
            appendMessage("ai", MSG_RESCHEDULED);
            setVerifiedAppointments([]);
            setVerifiedPatientEmail(null);
          } else {
            const errMsg = data.error || MSG_CANNOT_RESCHEDULE;
            setMessage(errMsg);
            appendMessage("ai", errMsg);
          }
        } catch {
          setMessage(MSG_CALL_CLINIC);
          appendMessage("ai", MSG_CALL_CLINIC);
        }
      }
    },
    [baseUrl, clinicSlug, sig, verifiedPatientEmail, appendMessage]
  );

  // When in MANAGE_BOOKING and user taps Reschedule, go to BOOKING_DATE then on slot select call modify
  const effectiveOnChipSelect = useCallback(
    (key: string, label: string, value?: string) => {
      if (key === "gcal" && value && typeof window !== "undefined") {
        window.open(value, "_blank");
        return;
      }
      if (currentState === "POLICY_AGREEMENT" && key === "confirm_booking") {
        appendMessage("user", label);
        if (requirePolicyAgreement && !policyAgreed) {
          setMessage(MSG_POLICY_CHECK_REQUIRED);
          appendMessage("ai", MSG_POLICY_CHECK_REQUIRED);
          return;
        }
        doConfirmBooking(new Date().toISOString());
        return;
      }
      if (currentState === "VERIFY_ACCOUNT" && verifyAttemptCount >= 3 && (key === "book" || key === "back")) {
        appendMessage("user", label);
        setIsInputDisabled(true);
        if (key === "book") {
          setVerifyAttemptCount(0);
          setBookingFailCount(0);
          setStateWithMessageAndSuggestions("BOOKING_REASON", MSG_BOOKING_REASON, bookingReasonSuggestions);
        } else {
          setCurrentState("GREETING");
          setMessage(GREETING_MSG);
          setSuggestions(lockedSuggestions);
          appendMessage("ai", GREETING_MSG);
        }
        return;
      }
      if (currentState === "GREETING" && bookingFailCount >= 3 && (key === "book" || key === "back")) {
        appendMessage("user", label);
        setIsInputDisabled(true);
        if (key === "book") {
          setBookingFailCount(0);
          setStateWithMessageAndSuggestions("BOOKING_REASON", MSG_BOOKING_REASON, bookingReasonSuggestions);
        } else {
          setMessage(GREETING_MSG);
          setSuggestions(lockedSuggestions);
          appendMessage("ai", GREETING_MSG);
        }
        return;
      }
      if (currentState === "BOOKING_SUCCESS" || currentState === "CANCEL_SUCCESS") {
        if (key === "book_another" || key === "back" || key === "book") {
          appendMessage("user", label);
          setCurrentState("GREETING");
          setMessage(GREETING_MSG);
          setSuggestions(greetingSuggestions);
          appendMessage("ai", GREETING_MSG);
          setIsInputDisabled(true);
        }
        return;
      }
      if (currentState === "MANAGE_BOOKING") {
        if (key === "reschedule") {
          appendMessage("user", label);
          setCurrentState("BOOKING_DATE");
          setMessage("When would you like to come? Pick a day.");
          setStateOnlySuggestions("BOOKING_DATE", [backChip]);
          appendMessage("ai", "When would you like to come? Pick a day.");
          fetchWorkingDays().then((dateChips) => {
            setStateOnlySuggestions("BOOKING_DATE", [...dateChips, backChip]);
            setSuggestions([...dateChips, backChip]);
          });
          return;
        }
        if (key === "cancel_appointment") {
          appendMessage("user", label);
          handleManageBookingAction("cancel");
          return;
        }
      }
      if (currentState === "BOOKING_PERIOD" && (key === "back" || key === "Morning" || key === "Afternoon" || key === "Evening")) {
        onChipSelect(key, label, value);
        return;
      }
      if (currentState === "BOOKING_DATE" && key === "back") {
        appendMessage("user", label);
        setStateWithMessageAndSuggestions("BOOKING_REASON", MSG_BOOKING_REASON, bookingReasonSuggestions);
        return;
      }
      if (currentState === "BOOKING_DATE" && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
        onChipSelect(key, label, value);
        return;
      }
      if (currentState === "BOOKING_TIME" && key === "back") {
        appendMessage("user", label);
        setSlotSuggestions([]);
        if (allSlotsForDate.length > 0) {
          setCurrentState("BOOKING_PERIOD");
          setMessage(MSG_CHOOSE_PERIOD);
          setSuggestions(periodSuggestions);
          appendMessage("ai", MSG_CHOOSE_PERIOD);
        } else {
          setSelectedDate(null);
          setCurrentState("BOOKING_DATE");
          setMessage("When would you like to come? Pick a day.");
          setStateOnlySuggestions("BOOKING_DATE", [backChip]);
          appendMessage("ai", "When would you like to come? Pick a day.");
          fetchWorkingDays().then((dateChips) => {
            setStateOnlySuggestions("BOOKING_DATE", [...dateChips, backChip]);
            setSuggestions([...dateChips, backChip]);
          });
        }
        return;
      }
      if (currentState === "BOOKING_TIME" && verifiedAppointments.length > 0 && value) {
        appendMessage("user", label);
        const durationMs = selectedServiceDuration * 60 * 1000;
        const endIso = new Date(new Date(value).getTime() + durationMs).toISOString();
        handleManageBookingAction("reschedule", value, endIso);
        setSlotSuggestions([]);
        setSelectedDate(null);
        return;
      }
      onChipSelect(key, label, value);
    },
    [
      currentState,
      requirePolicyAgreement,
      policyAgreed,
      doConfirmBooking,
      verifyAttemptCount,
      bookingFailCount,
      verifiedAppointments.length,
      allSlotsForDate.length,
      periodSuggestions,
      selectedServiceDuration,
      onChipSelect,
      handleManageBookingAction,
      appendMessage,
      fetchWorkingDays,
      setStateOnlySuggestions,
      setStateWithMessageAndSuggestions,
      bookingReasonSuggestions,
      lockedSuggestions,
    ]
  );

  const verifyLocked = currentState === "VERIFY_ACCOUNT" && verifyAttemptCount >= 3;
  const bookingLocked = currentState === "GREETING" && bookingFailCount >= 3;
  const effectiveInputDisabled =
    currentState === "PATIENT_DETAILS"
      ? false
      : currentState === "POLICY_AGREEMENT"
        ? true
        : isInputDisabled || verifyLocked || bookingLocked;
  const inputPlaceholder =
    currentState === "PATIENT_DETAILS"
      ? patientDetailsStep === "name"
        ? "Enter your full name"
        : "Enter your email"
      : undefined;

  const effectiveSuggestions =
    currentState === "BOOKING_TIME"
      ? slotSuggestions
      : currentState === "BOOKING_PERIOD"
        ? periodSuggestions.length > 0
          ? periodSuggestions
          : suggestions
        : verifyLocked || bookingLocked
          ? lockedSuggestions
          : displaySuggestions;

  return {
    messages,
    message,
    suggestions: effectiveSuggestions,
    isInputDisabled: effectiveInputDisabled,
    inputPlaceholder,
    isLoadingSlots,
    currentState,
    onChipSelect: effectiveOnChipSelect,
    onSend,
    clinicInfo,
    isRescheduleFlow: verifiedAppointments.length > 0,
    showPolicyAgreement: currentState === "POLICY_AGREEMENT" && requirePolicyAgreement,
    policyAgreed,
    setPolicyAgreed,
    cancellationPolicyText: clinicInfo.cancellation_policy_text ?? null,
  };
}
