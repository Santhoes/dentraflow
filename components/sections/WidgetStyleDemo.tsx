"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, RotateCcw } from "lucide-react";
import { SuggestionChips, type SuggestionChipItem } from "@/components/embed/SuggestionChips";

const DEMO_CLINIC = "Demo Dental";
const GREETING_MSG = "Hi 👋 How can I help you today?";
const MSG_REASON = "What do you need? Pick a reason.";
const MSG_DATE = "When would you like to come? Pick a day.";
const MSG_PERIOD = "Morning, afternoon, or evening?";
const MSG_SLOT = "Choose a time:";
const MSG_NAME = "Enter your full name.";
const MSG_EMAIL = "Thanks! Enter your email.";
const MSG_CONFIRM = "Confirm your booking below.";
const MSG_SUCCESS = "You're booked! Confirmation sent by email. This is a demo — no real appointment was created.";

type DemoStep =
  | "GREETING"
  | "BOOKING_REASON"
  | "BOOKING_DATE"
  | "BOOKING_PERIOD"
  | "BOOKING_TIME"
  | "PATIENT_DETAILS"
  | "CONFIRM"
  | "BOOKING_SUCCESS"
  | "CLINIC_INFO"
  | "EMERGENCY";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
}

// Demo dates: Today, Tomorrow, + next 5 weekdays
function getDemoDateChips(): SuggestionChipItem[] {
  const out: SuggestionChipItem[] = [];
  const now = new Date();
  const add = (label: string, dateStr: string) => out.push({ key: dateStr, label, value: dateStr });
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  add("Today", fmt(now));
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  add("Tomorrow", fmt(tomorrow));
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 2; i <= 6; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dayName = dayNames[d.getDay() === 0 ? 6 : d.getDay() - 1];
    add(`${dayName} ${d.getDate()}/${d.getMonth() + 1}`, fmt(d));
  }
  return out;
}

const DEMO_DATE_CHIPS: SuggestionChipItem[] = getDemoDateChips();

const REASON_CHIPS: SuggestionChipItem[] = [
  { key: "cleaning", label: "Cleaning" },
  { key: "pain", label: "Pain" },
  { key: "checkup", label: "Checkup" },
  { key: "root_canal", label: "Root canal" },
  { key: "other", label: "Other" },
];

const PERIOD_CHIPS: SuggestionChipItem[] = [
  { key: "Morning", label: "Morning", variant: "primary" },
  { key: "Afternoon", label: "Afternoon", variant: "primary" },
  { key: "Evening", label: "Evening", variant: "primary" },
];

// Demo slots for any chosen date (same every day for demo)
const DEMO_SLOTS: SuggestionChipItem[] = [
  { key: "09:00", label: "9:00 AM", value: "09:00", variant: "primary" },
  { key: "11:00", label: "11:00 AM", value: "11:00", variant: "primary" },
  { key: "14:00", label: "2:00 PM", value: "14:00", variant: "primary" },
  { key: "16:00", label: "4:00 PM", value: "16:00", variant: "primary" },
];

const BACK_CHIP: SuggestionChipItem = { key: "back", label: "Back", variant: "secondary" };

const GREETING_CHIPS: SuggestionChipItem[] = [
  { key: "book", label: "Book Appointment", variant: "primary" },
  { key: "change_cancel", label: "Change / Cancel" },
  { key: "clinic_info", label: "Clinic Info" },
  { key: "emergency", label: "EMERGENCY", variant: "danger" },
];

const ACCENT = "#0d9488";

export function WidgetStyleDemo() {
  const [step, setStep] = useState<DemoStep>("GREETING");
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "0", role: "ai", text: GREETING_MSG }]);
  const [suggestions, setSuggestions] = useState<SuggestionChipItem[]>(GREETING_CHIPS);
  const [input, setInput] = useState("");
  const [detailsStep, setDetailsStep] = useState<"name" | "email">("name");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [patientEmail, setPatientEmail] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const append = useCallback((role: "user" | "ai", text: string) => {
    setMessages((m) => [...m, { id: String(Date.now()), role, text }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, suggestions]);

  const setState = useCallback(
    (s: DemoStep, msg: string, chips: SuggestionChipItem[]) => {
      setStep(s);
      append("ai", msg);
      setSuggestions(chips);
    },
    [append]
  );

  const onChipSelect = useCallback(
    (key: string, label: string) => {
      append("user", label);

      if (step === "GREETING") {
        if (key === "book") {
          setState("BOOKING_REASON", MSG_REASON, [...REASON_CHIPS, BACK_CHIP]);
        } else if (key === "clinic_info") {
          setState(
            "CLINIC_INFO",
            `We're at 123 Demo Street. Hours: Mon–Sat 9am–5pm. Book an appointment?`,
            [{ key: "book", label: "Book Appointment", variant: "primary" }, BACK_CHIP]
          );
        } else if (key === "emergency") {
          setState("EMERGENCY", "Call us now: (555) 123-4567. This is a demo.", [BACK_CHIP]);
        }
        return;
      }

      if (step === "CLINIC_INFO" || step === "EMERGENCY") {
        if (key === "back" || key === "book") {
          setStep("GREETING");
          append("ai", GREETING_MSG);
          setSuggestions(GREETING_CHIPS);
        }
        return;
      }

      if (step === "BOOKING_REASON") {
        if (key === "back") {
          setStep("GREETING");
          append("ai", GREETING_MSG);
          setSuggestions(GREETING_CHIPS);
          return;
        }
        setState("BOOKING_DATE", MSG_DATE, [...DEMO_DATE_CHIPS.map((c) => ({ ...c, variant: "primary" as const })), BACK_CHIP]);
        return;
      }

      if (step === "BOOKING_DATE") {
        if (key === "back") {
          setState("BOOKING_REASON", MSG_REASON, [...REASON_CHIPS, BACK_CHIP]);
          return;
        }
        setSelectedDate(key);
        setState("BOOKING_PERIOD", MSG_PERIOD, [...PERIOD_CHIPS, BACK_CHIP]);
        return;
      }

      if (step === "BOOKING_PERIOD") {
        if (key === "back") {
          setSelectedDate(null);
          setState("BOOKING_DATE", MSG_DATE, [...DEMO_DATE_CHIPS.map((c) => ({ ...c, variant: "primary" as const })), BACK_CHIP]);
          return;
        }
        setState("BOOKING_TIME", MSG_SLOT, [...DEMO_SLOTS, BACK_CHIP]);
        return;
      }

      if (step === "BOOKING_TIME") {
        if (key === "back") {
          setState("BOOKING_PERIOD", MSG_PERIOD, [...PERIOD_CHIPS, BACK_CHIP]);
          return;
        }
        setSelectedSlot(label);
        setDetailsStep("name");
        setState("PATIENT_DETAILS", MSG_NAME, []);
        return;
      }
    },
    [step, setState, append]
  );

  const onSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    append("user", trimmed);
    setInput("");

    if (step === "PATIENT_DETAILS") {
      if (detailsStep === "name") {
        setPatientName(trimmed);
        setDetailsStep("email");
        append("ai", MSG_EMAIL);
        setSuggestions([]);
      } else {
        const email = trimmed.toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          append("ai", "Please enter a valid email.");
          return;
        }
        setPatientEmail(email);
        setStep("CONFIRM");
        const dateLabel = DEMO_DATE_CHIPS.find((c) => c.key === selectedDate)?.label ?? selectedDate ?? "";
        append("ai", `${MSG_CONFIRM} ${dateLabel} at ${selectedSlot} — ${patientName}, ${email}`);
        setSuggestions([{ key: "confirm", label: "Confirm booking", variant: "primary" as const }, BACK_CHIP]);
      }
      return;
    }

    if (step === "CONFIRM") {
      if (trimmed.toLowerCase() === "confirm" || /yes|ok|sure/.test(trimmed.toLowerCase())) {
        setStep("BOOKING_SUCCESS");
        append("ai", MSG_SUCCESS);
        setSuggestions([
          { key: "book_another", label: "Book another", variant: "primary" as const },
          BACK_CHIP,
        ]);
      }
    }
  }, [input, step, detailsStep, selectedDate, selectedSlot, patientName, append]);

  const handleChip = useCallback(
    (keyOrLabel: string, label: string) => {
      if (step === "CONFIRM") {
        if (keyOrLabel === "confirm") {
          append("user", label);
          setStep("BOOKING_SUCCESS");
          append("ai", MSG_SUCCESS);
          setSuggestions([
            { key: "book_another", label: "Book another", variant: "primary" as const },
            BACK_CHIP,
          ]);
        } else if (keyOrLabel === "back") {
          setStep("PATIENT_DETAILS");
          setDetailsStep("email");
          setPatientEmail(null);
          append("ai", MSG_EMAIL);
          setSuggestions([]);
        }
        return;
      }
      if (step === "BOOKING_SUCCESS") {
        if (keyOrLabel === "book_another" || keyOrLabel === "back") {
          setStep("GREETING");
          setMessages([{ id: "0", role: "ai", text: GREETING_MSG }]);
          setSuggestions(GREETING_CHIPS);
          setSelectedDate(null);
          setSelectedSlot(null);
          setPatientName(null);
          setPatientEmail(null);
          setDetailsStep("name");
        }
        return;
      }
      onChipSelect(keyOrLabel, label);
    },
    [step, onChipSelect, append]
  );

  const handleStartOver = () => {
    setStep("GREETING");
    setMessages([{ id: "0", role: "ai", text: GREETING_MSG }]);
    setSuggestions(GREETING_CHIPS);
    setInput("");
    setDetailsStep("name");
    setSelectedDate(null);
    setSelectedSlot(null);
    setPatientName(null);
    setPatientEmail(null);
  };

  const isSuccess = step === "BOOKING_SUCCESS";
  const showInput = step === "PATIENT_DETAILS" || (step === "CONFIRM" && suggestions.length === 0);

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-slate-500 sm:text-sm">{DEMO_CLINIC} • Demo</span>
        </div>
        {isSuccess && (
          <button
            type="button"
            onClick={handleStartOver}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Start over
          </button>
        )}
      </div>
      <div className="flex min-h-[320px] flex-col sm:min-h-[360px]">
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[85%] ${
                    msg.role === "ai"
                      ? "rounded-bl-md bg-primary/10 text-slate-800"
                      : "rounded-br-md bg-primary text-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div ref={bottomRef} />
        </div>
        <SuggestionChips
          items={suggestions}
          visible={suggestions.length > 0}
          onSelect={(k, l) => handleChip(k ?? l, l)}
          accentColor={ACCENT}
        />
        {(showInput || (step === "CONFIRM" && suggestions.some((s) => s.key === "confirm"))) && (
          <div className="border-t border-slate-100 p-3 sm:p-4">
            {step === "CONFIRM" && suggestions.some((s) => s.key === "confirm") ? (
              <p className="text-center text-xs text-slate-500">Click &quot;Confirm booking&quot; above to finish.</p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSend();
                }}
                className="flex gap-2"
              >
                <input
                  type={detailsStep === "email" ? "email" : "text"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={detailsStep === "name" ? "Your name" : "your@email.com"}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

