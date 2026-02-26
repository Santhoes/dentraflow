/**
 * Demo chat: appointment booking flow (English only).
 * Flow: greeting → need_day → need_time → confirm → booked
 */

export type DemoStep = "greeting" | "need_day" | "need_time" | "confirm" | "booked";

export interface DemoState {
  step: DemoStep;
  day?: string;
  time?: string;
}

// ——— English phrases (keywords to detect intent) ———
const BOOK_PHRASES = ["book", "schedule", "appointment", "booking", "need a slot", "want to come", "cleaning", "checkup", "exam", "reserve"];
const DAY_PHRASES = ["tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "next week", "this week", "today"];
const TIME_PHRASES = ["morning", "afternoon", "9", "10", "11", "2", "3", "4", "5", "9am", "10am", "11am", "2pm", "3pm", "4pm", "noon"];
const YES_PHRASES = ["yes", "yeah", "sure", "ok", "okay", "confirm", "correct", "yep", "please", "do it"];
const NO_PHRASES = ["no", "never mind", "nope", "wrong"];
const CANCEL_APPT = ["cancel appointment", "cancel booking", "cancel my appointment", "cancel the appointment", "cancel it", "cancel"];
const CHANGE_DATE = ["change date", "change day", "different day", "new date", "other day", "change the date"];
const CHANGE_TIME = ["change time", "change the time", "different time", "new time", "other time"];
const RESCHEDULE = ["reschedule", "change appointment", "move appointment", "rebook", "change my appointment"];
const INSURANCE_PHRASES = ["insurance", "accept insurance", "take insurance", "covered", "plan", "in-network", "out-of-network"];

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function matchesAny(text: string, phrases: string[]): boolean {
  const n = normalize(text);
  return phrases.some((p) => n.includes(normalize(p)) || normalize(p).includes(n));
}

const DAY_MAP: Record<string, string> = {
  tomorrow: "Tomorrow", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", today: "Today", "next week": "Next week",
};

function matchDay(text: string): string | null {
  const n = normalize(text);
  for (const [key, label] of Object.entries(DAY_MAP)) {
    if (n.includes(normalize(key))) return label;
  }
  if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|tomorrow|today|next week)\b/i.test(text)) return text.trim();
  return null;
}

const TIME_MAP: Record<string, string> = {
  morning: "9:00 AM", afternoon: "2:00 PM", "9": "9:00 AM", "10": "10:00 AM", "11": "11:00 AM",
  "2": "2:00 PM", "3": "3:00 PM", "4": "4:00 PM", "5": "5:00 PM", noon: "12:00 PM",
  "9am": "9:00 AM", "2pm": "2:00 PM", "3pm": "3:00 PM", "4pm": "4:00 PM",
};

function matchTime(text: string): string | null {
  const n = normalize(text);
  for (const [key, label] of Object.entries(TIME_MAP)) {
    if (n.includes(normalize(key))) return label;
  }
  return null;
}

// ——— English replies ———
const R = {
  greeting: "Hi! I'm the DentraFlow AI receptionist. Would you like to book an appointment, check our hours, or something else?",
  ask_day: "Sure. What day works for you? We're open Mon–Sat.",
  ask_time: "We have 9 AM, 11 AM, 2 PM, and 4 PM. Which time do you prefer?",
  confirm: (day: string, time: string) => `Got it — ${day} at ${time}. Reply "yes" to confirm and I'll book it.`,
  booked: (day: string, time: string) => `Done! You're booked for ${day} at ${time}. We'll send a reminder before your visit. You can say "change date", "change time", or "cancel appointment" if you need to.`,
  ask_again_day: "Which day would work? For example: tomorrow, Monday, or next week.",
  ask_again_time: "Which time? Morning (9 AM), 11 AM, 2 PM, or 4 PM?",
  not_book: "No problem. You can ask about our hours or say you'd like to book when you're ready.",
  cancel: "No problem. Say when you'd like to book or ask about our hours.",
  cancelled: "Your appointment has been cancelled. Would you like to book a new one?",
  change_day_ask: "What's the new date you'd like?",
  change_time_ask: "What time would work better?",
  reschedule_ask: "No problem. What's the new day you'd like? Then we'll pick a time.",
  hours: "We're open Mon–Sat, 8am–6pm. Would you like to book an appointment?",
};

const INSURANCE_REPLY_YES = "Yes, we accept insurance. You can ask us which plans we work with when you visit or call.";
const INSURANCE_REPLY_NO = "We don't accept insurance at this time. We can discuss payment options when you book.";

export const INITIAL_DEMO_STATE: DemoState = { step: "greeting" };

export interface ClinicContext {
  accepts_insurance: boolean;
  insurance_notes?: string | null;
}

export interface DemoReplyResult {
  reply: string;
  nextState: DemoState;
  booked: boolean;
}

export function getDemoReply(
  userText: string,
  state: DemoState,
  clinicContext?: ClinicContext | null
): DemoReplyResult {
  const text = userText.trim();

  const wantsInsurance =
    matchesAny(text, INSURANCE_PHRASES) || /insurance|accept.*insurance/i.test(normalize(text));
  if (wantsInsurance) {
    const reply = clinicContext?.accepts_insurance
      ? (clinicContext.insurance_notes?.trim() ? `Yes, we accept insurance. ${clinicContext.insurance_notes.trim()}` : INSURANCE_REPLY_YES)
      : INSURANCE_REPLY_NO;
    return { reply, nextState: { ...state }, booked: false };
  }

  if (!text) {
    if (state.step === "greeting") return { reply: R.greeting, nextState: state, booked: false };
    if (state.step === "need_day") return { reply: R.ask_again_day, nextState: state, booked: false };
    if (state.step === "need_time") return { reply: R.ask_again_time, nextState: state, booked: false };
    if (state.step === "confirm") return { reply: R.confirm(state.day!, state.time!), nextState: state, booked: false };
    return { reply: R.greeting, nextState: INITIAL_DEMO_STATE, booked: false };
  }

  const nextState: DemoState = { ...state };

  if (state.step === "confirm" || state.step === "booked") {
    if (matchesAny(text, CANCEL_APPT)) {
      return { reply: R.cancelled, nextState: INITIAL_DEMO_STATE, booked: false };
    }
    if (matchesAny(text, CHANGE_DATE)) {
      nextState.step = "need_day";
      nextState.day = undefined;
      nextState.time = state.time;
      return { reply: R.change_day_ask, nextState, booked: false };
    }
    if (matchesAny(text, CHANGE_TIME)) {
      nextState.step = "need_time";
      nextState.day = state.day;
      nextState.time = undefined;
      return { reply: R.change_time_ask, nextState, booked: false };
    }
    if (matchesAny(text, RESCHEDULE)) {
      nextState.step = "need_day";
      nextState.day = undefined;
      nextState.time = undefined;
      return { reply: R.reschedule_ask, nextState, booked: false };
    }
  }

  if (state.step === "booked") {
    const wantsRestart = matchesAny(text, YES_PHRASES) || /again|restart|new|reset/i.test(normalize(text));
    if (wantsRestart) return { reply: R.greeting, nextState: INITIAL_DEMO_STATE, booked: false };
    return { reply: R.booked(state.day!, state.time!), nextState, booked: true };
  }

  if (matchesAny(text, NO_PHRASES)) {
    if (state.step === "confirm") return { reply: R.cancel, nextState: INITIAL_DEMO_STATE, booked: false };
    return { reply: R.not_book, nextState: INITIAL_DEMO_STATE, booked: false };
  }

  switch (state.step) {
    case "greeting": {
      const wantsBook =
        matchesAny(text, BOOK_PHRASES) ||
        /appointment|book|schedule|cleaning|checkup|consultation/i.test(normalize(text));
      if (wantsBook || matchesAny(text, YES_PHRASES)) {
        nextState.step = "need_day";
        return { reply: R.ask_day, nextState, booked: false };
      }
      if (/hour|open|when|hours|timing/i.test(normalize(text))) {
        return { reply: R.hours, nextState, booked: false };
      }
      return { reply: R.greeting, nextState, booked: false };
    }
    case "need_day": {
      const day = matchDay(text) || (text.length <= 25 ? text.trim() : null);
      if (day) {
        nextState.step = "need_time";
        nextState.day = day;
        return { reply: R.ask_time, nextState, booked: false };
      }
      return { reply: R.ask_again_day, nextState, booked: false };
    }
    case "need_time": {
      const time = matchTime(text) || (/\d|morning|afternoon|noon/i.test(normalize(text)) ? text.trim() : null);
      if (time) {
        nextState.step = "confirm";
        nextState.time = time;
        return { reply: R.confirm(nextState.day!, time), nextState, booked: false };
      }
      return { reply: R.ask_again_time, nextState, booked: false };
    }
    case "confirm": {
      if (matchesAny(text, YES_PHRASES)) {
        nextState.step = "booked";
        return { reply: R.booked(nextState.day!, nextState.time!), nextState, booked: true };
      }
      return { reply: R.confirm(state.day!, state.time!), nextState, booked: false };
    }
    default:
      return { reply: R.greeting, nextState: INITIAL_DEMO_STATE, booked: false };
  }
}
