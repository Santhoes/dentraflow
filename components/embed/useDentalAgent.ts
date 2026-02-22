"use client";

import { useState, useCallback } from "react";
import { isValidChatEmail, isValidChatPhone } from "@/lib/embed-validate";
import { buildGoogleCalendarUrl } from "@/lib/google-calendar-url";

export type DentalAgentState =
  | "GREETING"
  | "BOOKING_REASON"
  | "BOOKING_DATE"
  | "BOOKING_TIME"
  | "PATIENT_DETAILS"
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
  variant?: "default" | "danger";
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
}

const FIXED_SERVICES: SuggestionItem[] = [
  { key: "cleaning", label: "Cleaning" },
  { key: "pain", label: "Pain" },
  { key: "checkup", label: "Checkup" },
  { key: "root_canal", label: "Root canal" },
  { key: "other", label: "Other" },
];

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

const GREETING_MSG = "Hi 👋 How can i help you today?";
const MSG_PATIENT_DETAILS = "Enter your full name.";
const MSG_BOOKING_REASON = "What do you need? Pick a reason.";
const MSG_VERIFY_EMAIL = "Enter the email you used to book.";
const MSG_CHOOSE_SLOT = "Choose a time slot:";
const MSG_NO_APPT = "No booking for this email. Book a new one?";
const MSG_TRY_AGAIN = "Not found. Please try again.";
const MSG_ENTER_EMAIL = "Thanks! Enter your email.";
const MSG_ENTER_WHATSAPP = "Enter your WhatsApp number (with country code, e.g. +1234567890).";
const MSG_NAME_EMAIL_CONTINUE = "Enter your email to continue.";
const MSG_BOOKING_FAILED = "Booking failed. Please try again.";
const MSG_CANCELLED = "Your appointment has been cancelled. We hope to see you soon!";
const MSG_CANNOT_CANCEL = "Could not cancel.";
const MSG_CALL_CLINIC = "Please call the clinic.";
const MSG_RESCHEDULED = "Rescheduled! Confirmation sent. How else can we help?";
const MSG_CANNOT_RESCHEDULE = "Could not reschedule. Please call the clinic.";

export interface UseDentalAgentConfig {
  clinicSlug: string;
  sig: string;
  locationId?: string;
  agentId?: string;
  isElitePlan?: boolean;
  /** Pro or Elite: show Add to Google Calendar after booking. */
  isProOrElite?: boolean;
  clinicInfo: ClinicInfo;
}

export function useDentalAgent(config: UseDentalAgentConfig) {
  const { clinicSlug, sig, locationId, agentId, isElitePlan, isProOrElite, clinicInfo } = config;
  const [currentState, setCurrentState] = useState<DentalAgentState>("GREETING");
  const [message, setMessage] = useState(GREETING_MSG);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "0", role: "ai", text: GREETING_MSG }]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isInputDisabled, setIsInputDisabled] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotSuggestions, setSlotSuggestions] = useState<SuggestionItem[]>([]);

  // Booking flow context
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [patientEmail, setPatientEmail] = useState<string | null>(null);
  const [verifiedAppointments, setVerifiedAppointments] = useState<VerifiedAppointment[]>([]);
  const [verifiedPatientEmail, setVerifiedPatientEmail] = useState<string | null>(null);
  const [patientDetailsStep, setPatientDetailsStep] = useState<"name" | "email" | "whatsapp">("name");
  const [patientWhatsApp, setPatientWhatsApp] = useState<string | null>(null);
  const [verifyAttemptCount, setVerifyAttemptCount] = useState(0);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

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
    { key: "book", label: "Book Appointment" },
    { key: "change_cancel", label: "Change / Cancel" },
    { key: "clinic_info", label: "Clinic Info" },
    { key: "emergency", label: "EMERGENCY", variant: "danger" },
  ];

  // Initialize suggestions for GREETING; BOOKING_TIME shows slots + Back (no duplicate)
  const bookingTimeSuggestions =
    slotSuggestions.some((s) => s.key === "back")
      ? slotSuggestions
      : [...slotSuggestions, { key: "back", label: "Back" }];
  const displaySuggestions =
    currentState === "GREETING" && suggestions.length === 0
      ? greetingSuggestions
      : currentState === "BOOKING_TIME" && slotSuggestions.length > 0
        ? bookingTimeSuggestions
        : suggestions;

  const fetchSlots = useCallback(
    async (
      dateStr: string | null
    ): Promise<{ slots: SuggestionItem[]; hasSlotsToday?: boolean }> => {
      const params = new URLSearchParams({ clinicSlug, sig });
      if (locationId) params.set("location", locationId);
      if (agentId) params.set("agent", agentId);
      if (dateStr) params.set("date", dateStr);
      const res = await fetch(`${baseUrl}/api/embed/slots?${params}`);
      if (!res.ok) return { slots: [] };
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
        const end = new Date(new Date(value).getTime() + 30 * 60 * 1000).toISOString();
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
            setStateWithMessageAndSuggestions("BOOKING_REASON", MSG_BOOKING_REASON, FIXED_SERVICES);
          } else if (key === "change_cancel") {
            setIsInputDisabled(false);
            setStateWithMessageAndSuggestions("VERIFY_ACCOUNT", MSG_VERIFY_EMAIL, []);
          } else if (key === "clinic_info") {
            const hours =
              clinicInfo.working_hours && Object.keys(clinicInfo.working_hours).length
                ? Object.entries(clinicInfo.working_hours)
                    .filter(([, h]) => h?.open && h?.close)
                    .map(([day, h]) => `${day}: ${h.open}–${h.close}`)
                    .join(". ")
                : "Mon–Sat, 8am–6pm";
            const loc = [clinicInfo.address, clinicInfo.landmark].filter(Boolean).join(". ") || "";
            const msg = `We're at ${loc || "our clinic"}. Hours: ${hours}. Book?`;
            setStateWithMessageAndSuggestions("CLINIC_INFO", msg, [
              { key: "book", label: "Book Appointment" },
              { key: "back", label: "Back" },
            ]);
          } else if (key === "emergency") {
            const phone = clinicInfo.whatsapp_phone || clinicInfo.phone || "";
            const phoneStr = typeof phone === "string" && phone ? phone : "the clinic";
            const msg = `Call us now: ${phoneStr}. Tooth out? Keep in milk. Bleeding? Use gauze.`;
            setStateWithMessageAndSuggestions("EMERGENCY", msg, [{ key: "back", label: "Back" }]);
          }
          break;

        case "BOOKING_REASON":
          setSelectedService(label);
          setStateWithMessageAndSuggestions("BOOKING_DATE", "When would you like to come? Pick a day.", []);
          setIsLoadingSlots(true);
          fetchWorkingDays().then((dateChips) => {
            setStateOnlySuggestions("BOOKING_DATE", [...dateChips, { key: "back", label: "Back" }]);
            setSuggestions([...dateChips, { key: "back", label: "Back" }]);
            setIsLoadingSlots(false);
          });
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
          const { slots: slotList } = await fetchSlots(dateStrForSlots);
          setIsLoadingSlots(false);
          if (slotList.length === 0) {
            setMessage("No slots available for this day. Pick another date.");
            appendMessage("ai", "No slots available for this day. Pick another date.");
            const backOnly = [{ key: "back", label: "Back" }];
            setSlotSuggestions(backOnly);
            setStateOnlySuggestions("BOOKING_TIME", backOnly);
          } else {
            setSlotSuggestions(slotList.map((s) => ({ key: s.key, label: s.label, value: s.value })));
            setStateOnlySuggestions("BOOKING_TIME", []);
            setMessage(MSG_CHOOSE_SLOT);
            appendMessage("ai", MSG_CHOOSE_SLOT);
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
          if (key === "back") {
            setCurrentState("GREETING");
            setMessage(GREETING_MSG);
            setSuggestions(greetingSuggestions);
            appendMessage("ai", GREETING_MSG);
          } else if (key === "book") {
            setStateWithMessageAndSuggestions("BOOKING_REASON", MSG_BOOKING_REASON, FIXED_SERVICES);
          }
          break;
      }
    },
    [
      currentState,
      baseUrl,
      clinicSlug,
      sig,
      clinicInfo,
      appendMessage,
      setStateWithMessageAndSuggestions,
      setStateOnlySuggestions,
      fetchSlots,
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
              setStateWithMessageAndSuggestions("VERIFY_ACCOUNT", apiError ?? "No booking found for this email. You can book a new appointment or go back.", [
                { key: "book", label: "Book Appointment" },
                { key: "back", label: "Back" },
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
            setStateWithMessageAndSuggestions("VERIFY_ACCOUNT", "Something went wrong. You can book a new appointment or go back.", [
              { key: "book", label: "Book Appointment" },
              { key: "back", label: "Back" },
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
          const email = emailMatch ? emailMatch[0] : trimmed;
          const emailCheck = isValidChatEmail(email);
          if (!emailCheck.valid) {
            setMessage(emailCheck.error ?? "Please enter a valid email.");
            appendMessage("ai", emailCheck.error ?? "Please enter a valid email.");
            return;
          }
          setPatientEmail(email);
          if (isElitePlan) {
            setPatientDetailsStep("whatsapp");
            setMessage(MSG_ENTER_WHATSAPP);
            appendMessage("ai", MSG_ENTER_WHATSAPP);
            return;
          }
        }
        if (patientDetailsStep === "whatsapp") {
          const phoneCheck = isValidChatPhone(trimmed.replace(/\s/g, ""));
          if (!phoneCheck.valid) {
            setMessage(phoneCheck.error ?? "Please enter a valid WhatsApp number.");
            appendMessage("ai", phoneCheck.error ?? "Please enter a valid WhatsApp number.");
            return;
          }
          setPatientWhatsApp(trimmed.replace(/\s/g, ""));
        }
        const shouldSubmit =
          (patientDetailsStep === "email" && !isElitePlan) || patientDetailsStep === "whatsapp";
        if (!shouldSubmit) return;
        if (!selectedSlot?.start || !selectedSlot?.end || !patientName || !patientEmail) {
          setMessage(MSG_NAME_EMAIL_CONTINUE);
          appendMessage("ai", MSG_NAME_EMAIL_CONTINUE);
          return;
        }
        const phoneForBooking =
          patientDetailsStep === "whatsapp" ? trimmed.replace(/\s/g, "") : undefined;
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
            }),
          });
          const data = (await res.json()) as { ok?: boolean; error?: string };
          if (data.ok) {
            setCurrentState("BOOKING_SUCCESS");
            const startStr = formatInClinicTz(selectedSlot.start, clinicInfo.timezone);
            const msg = `You're booked for ${startStr}. Confirmation sent by email.`;
            setMessage(msg);
            const successChips: SuggestionItem[] = [
              { key: "book_another", label: "Book another" },
              { key: "back", label: "Back" },
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
            setPatientWhatsApp(null);
            setPatientDetailsStep("name");
          } else {
            const errMsg = data.error || MSG_BOOKING_FAILED;
            setMessage(errMsg);
            appendMessage("ai", errMsg);
          }
        } catch {
          setMessage(MSG_BOOKING_FAILED);
          appendMessage("ai", MSG_BOOKING_FAILED);
        }
        return;
      }
    },
    [
      currentState,
      patientDetailsStep,
      patientName,
      patientEmail,
      selectedSlot,
      verifyAttemptCount,
      baseUrl,
      clinicSlug,
      sig,
      isElitePlan,
      isProOrElite,
      clinicInfo,
      appendMessage,
      setStateWithMessageAndSuggestions,
    ]
  );

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
              { key: "book", label: "Book Appointment" },
              { key: "back", label: "Back" },
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
      if (currentState === "BOOKING_SUCCESS" || currentState === "CANCEL_SUCCESS") {
        if (key === "book_another" || key === "back" || key === "book") {
          appendMessage("user", label);
          setCurrentState("GREETING");
          setMessage(GREETING_MSG);
          setSuggestions(greetingSuggestions);
          appendMessage("ai", GREETING_MSG);
        }
        return;
      }
      if (currentState === "MANAGE_BOOKING") {
        if (key === "reschedule") {
          appendMessage("user", label);
          setCurrentState("BOOKING_DATE");
          setMessage("When would you like to come? Pick a day.");
          setSuggestions([]);
          appendMessage("ai", "When would you like to come? Pick a day.");
          fetchWorkingDays().then((dateChips) => {
            setStateOnlySuggestions("BOOKING_DATE", [...dateChips, { key: "back", label: "Back" }]);
            setSuggestions([...dateChips, { key: "back", label: "Back" }]);
          });
          return;
        }
        if (key === "cancel_appointment") {
          appendMessage("user", label);
          handleManageBookingAction("cancel");
          return;
        }
      }
      if (currentState === "BOOKING_DATE" && key === "back") {
        appendMessage("user", label);
        setStateWithMessageAndSuggestions("BOOKING_REASON", MSG_BOOKING_REASON, FIXED_SERVICES);
        return;
      }
      if (currentState === "BOOKING_DATE" && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
        onChipSelect(key, label, value);
        return;
      }
      if (currentState === "BOOKING_TIME" && key === "back") {
        appendMessage("user", label);
        setSelectedDate(null);
        setSlotSuggestions([]);
        setCurrentState("BOOKING_DATE");
        setMessage("When would you like to come? Pick a day.");
        appendMessage("ai", "When would you like to come? Pick a day.");
        fetchWorkingDays().then((dateChips) => {
          setStateOnlySuggestions("BOOKING_DATE", [...dateChips, { key: "back", label: "Back" }]);
          setSuggestions([...dateChips, { key: "back", label: "Back" }]);
        });
        return;
      }
      if (currentState === "BOOKING_TIME" && verifiedAppointments.length > 0 && value) {
        appendMessage("user", label);
        const endIso = new Date(new Date(value).getTime() + 30 * 60 * 1000).toISOString();
        handleManageBookingAction("reschedule", value, endIso);
        setSlotSuggestions([]);
        setSelectedDate(null);
        return;
      }
      onChipSelect(key, label, value);
    },
    [currentState, verifiedAppointments.length, onChipSelect, handleManageBookingAction, appendMessage, fetchWorkingDays, setStateOnlySuggestions]
  );

  return {
    messages,
    message,
    suggestions: currentState === "BOOKING_TIME" ? slotSuggestions : displaySuggestions,
    isInputDisabled,
    isLoadingSlots,
    currentState,
    onChipSelect: effectiveOnChipSelect,
    onSend,
    clinicInfo,
    isRescheduleFlow: verifiedAppointments.length > 0,
  };
}
