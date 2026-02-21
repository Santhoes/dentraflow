/**
 * Demo chat: appointment booking flow with multi-language support.
 * Flow: greeting → need_day → need_time → confirm → booked
 */

export type DemoStep = "greeting" | "need_day" | "need_time" | "confirm" | "booked";
export type DemoLang = "en" | "es" | "hi" | "fr";

export interface DemoState {
  step: DemoStep;
  lang: DemoLang;
  day?: string;
  time?: string;
}

// ——— Multi-language phrases (keywords to detect intent / language) ———

const BOOK_PHRASES: Record<DemoLang, string[]> = {
  en: ["book", "schedule", "appointment", "booking", "need a slot", "want to come", "cleaning", "checkup", "exam", "reserve"],
  es: ["cita", "reservar", "reserva", "agendar", "quiero una cita", "limpieza", "revisión", "horario"],
  hi: ["appointment", "booking", "samay", "clean", "checkup", "slot", "aana hai", "fix karna"],
  fr: ["rendez-vous", "réserver", "réservation", "prendre rdv", "nettoyage", "consultation"],
};

const DAY_PHRASES: Record<DemoLang, string[]> = {
  en: ["tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "next week", "this week", "today"],
  es: ["mañana", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "próxima semana", "hoy"],
  hi: ["kal", "somvar", "mangal", "budh", "guru", "shukra", "shanivar", "agla hafta", "aaj"],
  fr: ["demain", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "semaine prochaine", "aujourd'hui"],
};

const TIME_PHRASES: Record<DemoLang, string[]> = {
  en: ["morning", "afternoon", "9", "10", "11", "2", "3", "4", "5", "9am", "10am", "11am", "2pm", "3pm", "4pm", "noon"],
  es: ["mañana", "tarde", "9", "10", "11", "2", "3", "4", "5", "mediodía"],
  hi: ["subah", "shaam", "dopahar", "9", "10", "11", "2", "3", "4", "baje"],
  fr: ["matin", "après-midi", "9h", "10h", "11h", "14h", "15h", "16h", "midi"],
};

const YES_PHRASES: Record<DemoLang, string[]> = {
  en: ["yes", "yeah", "sure", "ok", "okay", "confirm", "correct", "yep", "please", "do it"],
  es: ["sí", "si", "claro", "vale", "ok", "confirmo", "correcto", "por favor"],
  hi: ["haan", "han", "theek", "sahi", "ok", "ji", "kijiye", "confirm"],
  fr: ["oui", "ok", "d'accord", "confirmé", "oui merci", "c'est bon"],
};

const NO_PHRASES: Record<DemoLang, string[]> = {
  en: ["no", "never mind", "nope", "wrong"],
  es: ["no", "olvidar"],
  hi: ["nahi", "na", "galat"],
  fr: ["non"],
};

// Cancel appointment (when confirm or booked)
const CANCEL_APPT: Record<DemoLang, string[]> = {
  en: ["cancel appointment", "cancel booking", "cancel my appointment", "cancel the appointment", "cancel it", "cancel"],
  es: ["cancelar cita", "cancelar reserva", "cancelar la cita", "cancelar"],
  hi: ["appointment cancel", "booking cancel", "cancel karo", "cancel"],
  fr: ["annuler le rendez-vous", "annuler la réservation", "annuler"],
};

// Change date only
const CHANGE_DATE: Record<DemoLang, string[]> = {
  en: ["change date", "change day", "different day", "new date", "other day", "change the date"],
  es: ["cambiar fecha", "cambiar día", "otro día", "otra fecha"],
  hi: ["date badlo", "din badlo", "dusra din", "nayi date"],
  fr: ["changer la date", "autre jour", "nouvelle date"],
};

// Change time only
const CHANGE_TIME: Record<DemoLang, string[]> = {
  en: ["change time", "change the time", "different time", "new time", "other time"],
  es: ["cambiar hora", "cambiar horario", "otra hora"],
  hi: ["time badlo", "dusra time", "naya time"],
  fr: ["changer l'heure", "autre heure", "nouvelle heure"],
};

// Reschedule (change appointment → ask new date)
const RESCHEDULE: Record<DemoLang, string[]> = {
  en: ["reschedule", "change appointment", "move appointment", "rebook", "change my appointment"],
  es: ["reagendar", "reprogramar", "cambiar cita", "cambiar mi cita"],
  hi: ["reschedule", "appointment badlo", "dusri date"],
  fr: ["reporter", "changer le rendez-vous", "déplacer le rdv"],
};

// Insurance (so patients understand while chatting)
const INSURANCE_PHRASES: Record<DemoLang, string[]> = {
  en: ["insurance", "accept insurance", "take insurance", "covered", "plan", "in-network", "out-of-network"],
  es: ["seguro", "aceptan seguro", "seguros", "cobertura", "plan"],
  hi: ["insurance", "bima", "accept karte", "cover"],
  fr: ["assurance", "assurances", "prendre assurance", "couvert"],
};

// ——— Normalize for matching: strip diacritics, lowercase ———
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function matchesAny(text: string, phrases: string[]): boolean {
  const n = normalize(text);
  return phrases.some((p) => n.includes(normalize(p)) || normalize(p).includes(n));
}

function detectLang(text: string): DemoLang {
  const n = normalize(text);
  if (BOOK_PHRASES.es.some((p) => n.includes(normalize(p))) || DAY_PHRASES.es.some((p) => n.includes(normalize(p)))) return "es";
  if (BOOK_PHRASES.fr.some((p) => n.includes(normalize(p))) || DAY_PHRASES.fr.some((p) => n.includes(normalize(p)))) return "fr";
  if (BOOK_PHRASES.hi.some((p) => n.includes(normalize(p))) || DAY_PHRASES.hi.some((p) => n.includes(normalize(p)))) return "hi";
  return "en";
}

function matchDay(text: string, lang: DemoLang): string | null {
  const n = normalize(text);
  const map: Record<DemoLang, Record<string, string>> = {
    en: { tomorrow: "Tomorrow", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", today: "Today", "next week": "Next week" },
    es: { mañana: "Mañana", lunes: "Lunes", martes: "Martes", miércoles: "Miércoles", jueves: "Jueves", viernes: "Viernes", sábado: "Sábado", hoy: "Hoy", "próxima semana": "Próxima semana" },
    hi: { kal: "Kal", somvar: "Somvar", mangal: "Mangal", budh: "Budh", guru: "Guru", shukra: "Shukra", shanivar: "Shanivar", aaj: "Aaj", "agla hafta": "Agla hafta" },
    fr: { demain: "Demain", lundi: "Lundi", mardi: "Mardi", mercredi: "Mercredi", jeudi: "Jeudi", vendredi: "Vendredi", samedi: "Samedi", "semaine prochaine": "Semaine prochaine", "aujourd'hui": "Aujourd'hui" },
  };
  const entries = map[lang];
  for (const [key, label] of Object.entries(entries)) {
    if (n.includes(normalize(key))) return label;
  }
  // Fallback: weekday or day-like phrase
  if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|tomorrow|today|next week)\b/i.test(text)) return text.trim();
  if (/lunes|martes|miércoles|jueves|viernes|sábado|mañana|hoy|próxima|semana/i.test(normalize(text))) return text.trim();
  if (/demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|aujourd'hui/i.test(normalize(text))) return text.trim();
  if (/kal|somvar|mangal|budh|guru|shukra|shanivar|aaj|agla|hafta/i.test(normalize(text))) return text.trim();
  return null;
}

function matchTime(text: string, lang: DemoLang): string | null {
  const n = normalize(text);
  const map: Record<DemoLang, Record<string, string>> = {
    en: { morning: "9:00 AM", afternoon: "2:00 PM", "9": "9:00 AM", "10": "10:00 AM", "11": "11:00 AM", "2": "2:00 PM", "3": "3:00 PM", "4": "4:00 PM", "5": "5:00 PM", noon: "12:00 PM", "9am": "9:00 AM", "2pm": "2:00 PM", "3pm": "3:00 PM", "4pm": "4:00 PM" },
    es: { mañana: "9:00", tarde: "15:00", "9": "9:00", "10": "10:00", "11": "11:00", "2": "14:00", "3": "15:00", "4": "16:00", mediodía: "12:00" },
    hi: { subah: "9:00 baje", shaam: "4:00 baje", dopahar: "2:00 baje", "9": "9:00", "10": "10:00", "11": "11:00", "2": "2:00", "3": "3:00", "4": "4:00" },
    fr: { matin: "9h", "après-midi": "14h", "9h": "9h", "10h": "10h", "11h": "11h", "14h": "14h", "15h": "15h", "16h": "16h", midi: "12h" },
  };
  const entries = map[lang];
  for (const [key, label] of Object.entries(entries)) {
    if (n.includes(normalize(key))) return label;
  }
  return null;
}

// ——— Replies per language ———
const REPLIES: Record<
  DemoLang,
  {
    greeting: string;
    ask_day: string;
    ask_time: string;
    confirm: (day: string, time: string) => string;
    booked: (day: string, time: string) => string;
    ask_again_day: string;
    ask_again_time: string;
    not_book: string;
    cancel: string;
    cancelled: string;
    change_day_ask: string;
    change_time_ask: string;
    reschedule_ask: string;
  }
> = {
  en: {
    greeting: "Hi! I'm the DentraFlow AI receptionist. Would you like to book an appointment, check our hours, or something else?",
    ask_day: "Sure. What day works for you? We're open Mon–Sat.",
    ask_time: "We have 9 AM, 11 AM, 2 PM, and 4 PM. Which time do you prefer?",
    confirm: (day, time) => `Got it — ${day} at ${time}. Reply "yes" to confirm and I'll book it.`,
    booked: (day, time) => `Done! You're booked for ${day} at ${time}. We'll send a reminder before your visit. You can say "change date", "change time", or "cancel appointment" if you need to.`,
    ask_again_day: "Which day would work? For example: tomorrow, Monday, or next week.",
    ask_again_time: "Which time? Morning (9 AM), 11 AM, 2 PM, or 4 PM?",
    not_book: "No problem. You can ask about our hours or say you'd like to book when you're ready.",
    cancel: "No problem. Say when you'd like to book or ask about our hours.",
    cancelled: "Your appointment has been cancelled. Would you like to book a new one?",
    change_day_ask: "What's the new date you'd like?",
    change_time_ask: "What time would work better?",
    reschedule_ask: "No problem. What's the new day you'd like? Then we'll pick a time.",
  },
  es: {
    greeting: "¡Hola! Soy el recepcionista IA de DentraFlow. ¿Quiere reservar una cita, consultar horarios o algo más?",
    ask_day: "Claro. ¿Qué día le viene bien? Estamos abiertos de lunes a sábado.",
    ask_time: "Tenemos 9:00, 11:00, 14:00 y 16:00. ¿Qué hora prefiere?",
    confirm: (day, time) => `Entendido: ${day} a las ${time}. Responda "sí" para confirmar y lo reservo.`,
    booked: (day, time) => `¡Listo! Tiene cita el ${day} a las ${time}. Enviaremos un recordatorio. Puede decir "cambiar fecha", "cambiar hora" o "cancelar cita" si lo necesita.`,
    ask_again_day: "¿Qué día le vendría bien? Por ejemplo: mañana, lunes o la próxima semana.",
    ask_again_time: "¿Qué hora? ¿Mañana (9:00), 11:00, 14:00 o 16:00?",
    not_book: "Sin problema. Puede preguntar por horarios o decir que quiere reservar cuando lo desee.",
    cancel: "Sin problema. Diga cuándo quiere reservar o consulte nuestros horarios.",
    cancelled: "Su cita ha sido cancelada. ¿Quiere reservar otra?",
    change_day_ask: "¿Cuál es la nueva fecha que desea?",
    change_time_ask: "¿Qué hora le vendría mejor?",
    reschedule_ask: "Sin problema. ¿Qué nuevo día desea? Luego elegimos la hora.",
  },
  hi: {
    greeting: "Namaste! Main DentraFlow ka AI receptionist hoon. Aap appointment book karna chahte hain, hours janna chahte hain, ya kuch aur?",
    ask_day: "Theek hai. Aapko kaun sa din sahi rahega? Hum Mon–Sat open hain.",
    ask_time: "9 baje, 11 baje, 2 baje aur 4 baje slots hain. Aap kaunsa time prefer karenge?",
    confirm: (day, time) => `${day} ko ${time} — theek hai? Confirm karne ke liye "haan" likhein, main book kar dunga.`,
    booked: (day, time) => `Ho gaya! Aapki appointment ${day} ko ${time} book ho chuki hai. Aap "change date", "change time" ya "cancel" bolo to badal sakte hain.`,
    ask_again_day: "Kaun sa din sahi rahega? Jaise kal, somvar, ya agla hafta.",
    ask_again_time: "Kaun sa time? Subah (9), 11, 2 baje ya 4 baje?",
    not_book: "Koi baat nahi. Aap hours puch sakte hain ya jab chahein book karne ke liye bolo.",
    cancel: "Koi baat nahi. Jab book karna ho bata dena ya hours puch lena.",
    cancelled: "Aapki appointment cancel ho chuki hai. Kya aap nayi book karna chahenge?",
    change_day_ask: "Nayi date kya honi chahiye?",
    change_time_ask: "Kaun sa time sahi rahega?",
    reschedule_ask: "Theek hai. Nayi date bataiye, phir time choose karenge.",
  },
  fr: {
    greeting: "Bonjour ! Je suis le réceptionniste IA DentraFlow. Souhaitez-vous prendre rendez-vous, connaître nos horaires ou autre chose ?",
    ask_day: "D'accord. Quel jour vous convient ? Nous sommes ouverts du lundi au samedi.",
    ask_time: "Nous avons 9h, 11h, 14h et 16h. Quelle heure préférez-vous ?",
    confirm: (day, time) => `D'accord — ${day} à ${time}. Répondez « oui » pour confirmer et je réserve.`,
    booked: (day, time) => `C'est fait ! Vous avez rendez-vous le ${day} à ${time}. Nous enverrons un rappel. Dites « changer la date », « changer l'heure » ou « annuler » si besoin.`,
    ask_again_day: "Quel jour vous conviendrait ? Par exemple demain, lundi ou la semaine prochaine.",
    ask_again_time: "Quelle heure ? Matin (9h), 11h, 14h ou 16h ?",
    not_book: "Pas de souci. Vous pouvez demander nos horaires ou dire que vous voulez réserver quand vous voulez.",
    cancel: "Pas de souci. Dites quand vous voulez réserver ou demandez nos horaires.",
    cancelled: "Votre rendez-vous a été annulé. Souhaitez-vous en prendre un autre ?",
    change_day_ask: "Quelle est la nouvelle date souhaitée ?",
    change_time_ask: "Quelle heure vous conviendrait mieux ?",
    reschedule_ask: "Pas de souci. Quel nouveau jour souhaitez-vous ? Ensuite nous choisirons l'heure.",
  },
};

export const INITIAL_DEMO_STATE: DemoState = { step: "greeting", lang: "en" };

export interface ClinicContext {
  accepts_insurance: boolean;
  insurance_notes?: string | null;
}

const INSURANCE_REPLIES: Record<
  DemoLang,
  { yes: (notes?: string | null) => string; no: string }
> = {
  en: {
    yes: (notes) =>
      notes?.trim()
        ? `Yes, we accept insurance. ${notes.trim()}`
        : "Yes, we accept insurance. You can ask us which plans we work with when you visit or call.",
    no: "We don't accept insurance at this time. We can discuss payment options when you book.",
  },
  es: {
    yes: (notes) =>
      notes?.trim()
        ? `Sí, aceptamos seguros. ${notes.trim()}`
        : "Sí, aceptamos seguros. Puede preguntar por los planes cuando nos visite o llame.",
    no: "Por el momento no aceptamos seguro. Podemos hablar de opciones de pago al reservar.",
  },
  hi: {
    yes: (notes) =>
      notes?.trim()
        ? `Haan, hum insurance accept karte hain. ${notes.trim()}`
        : "Haan, hum insurance accept karte hain. Aap visit pe puch sakte hain kaunse plans.",
    no: "Abhi hum insurance accept nahi karte. Book karte waqt payment options batayenge.",
  },
  fr: {
    yes: (notes) =>
      notes?.trim()
        ? `Oui, nous acceptons les assurances. ${notes.trim()}`
        : "Oui, nous acceptons les assurances. Vous pouvez demander quels contrats lors de votre visite.",
    no: "Nous n'acceptons pas les assurances pour le moment. Nous pourrons discuter des options de paiement à la réservation.",
  },
};

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

  // Insurance question (any step) — so patients understand while chatting
  const wantsInsurance = Object.values(INSURANCE_PHRASES).some((phrases) => matchesAny(text, phrases))
    || /insurance|seguro|assurance|bima|accept.*insurance/i.test(normalize(text));
  if (wantsInsurance) {
    const lang = state.step === "greeting" ? detectLang(text) : state.lang;
    const R = INSURANCE_REPLIES[lang];
    if (clinicContext?.accepts_insurance) {
      return { reply: R.yes(clinicContext.insurance_notes), nextState: { ...state, lang }, booked: false };
    }
    return { reply: R.no, nextState: { ...state, lang }, booked: false };
  }

  if (!text) {
    const R = REPLIES[state.lang];
    if (state.step === "greeting") return { reply: R.greeting, nextState: state, booked: false };
    if (state.step === "need_day") return { reply: R.ask_again_day, nextState: state, booked: false };
    if (state.step === "need_time") return { reply: R.ask_again_time, nextState: state, booked: false };
    if (state.step === "confirm") return { reply: R.confirm(state.day!, state.time!), nextState: state, booked: false };
    return { reply: R.greeting, nextState: INITIAL_DEMO_STATE, booked: false };
  }

  const lang = state.step === "greeting" ? detectLang(text) : state.lang;
  const R = REPLIES[lang];
  const nextState: DemoState = { ...state, lang };

  // When confirm or booked: handle cancel appointment, change date, change time, reschedule (before generic No)
  if (state.step === "confirm" || state.step === "booked") {
    if (matchesAny(text, CANCEL_APPT[lang])) {
      return { reply: R.cancelled, nextState: { ...INITIAL_DEMO_STATE, lang }, booked: false };
    }
    if (matchesAny(text, CHANGE_DATE[lang])) {
      nextState.step = "need_day";
      nextState.day = undefined;
      nextState.time = state.time; // keep time; we'll ask for new day then can reuse or re-ask time
      return { reply: R.change_day_ask, nextState, booked: false };
    }
    if (matchesAny(text, CHANGE_TIME[lang])) {
      nextState.step = "need_time";
      nextState.day = state.day;
      nextState.time = undefined;
      return { reply: R.change_time_ask, nextState, booked: false };
    }
    if (matchesAny(text, RESCHEDULE[lang])) {
      nextState.step = "need_day";
      nextState.day = undefined;
      nextState.time = undefined;
      return { reply: R.reschedule_ask, nextState, booked: false };
    }
  }

  // Already booked — echo or offer to start over
  if (state.step === "booked") {
    const wantsRestart = matchesAny(text, YES_PHRASES[lang]) || /again|restart|new|otra|nueva|reset/i.test(text);
    if (wantsRestart) return { reply: R.greeting, nextState: { ...INITIAL_DEMO_STATE, lang }, booked: false };
    return { reply: R.booked(state.day!, state.time!), nextState, booked: true };
  }

  // No / cancel (decline confirm or general "no")
  if (matchesAny(text, NO_PHRASES[lang])) {
    if (state.step === "confirm") return { reply: R.cancel, nextState: { ...INITIAL_DEMO_STATE, lang }, booked: false };
    return { reply: R.not_book, nextState: { ...INITIAL_DEMO_STATE, lang }, booked: false };
  }

  switch (state.step) {
    case "greeting": {
      const wantsBook =
        matchesAny(text, BOOK_PHRASES.en) ||
        matchesAny(text, BOOK_PHRASES.es) ||
        matchesAny(text, BOOK_PHRASES.hi) ||
        matchesAny(text, BOOK_PHRASES.fr) ||
        /appointment|book|schedule|cita|reserv|rdv|cleaning|checkup|limpieza|consultation/i.test(normalize(text));
      if (wantsBook) {
        nextState.step = "need_day";
        return { reply: R.ask_day, nextState, booked: false };
      }
      if (matchesAny(text, YES_PHRASES[lang])) {
        nextState.step = "need_day";
        return { reply: R.ask_day, nextState, booked: false };
      }
      // Hours or other
      const wantsHours = /hour|open|when|hora|horario|hours|timing|ouvert|heure/i.test(normalize(text));
      if (wantsHours) {
        const hoursMsg =
          lang === "es"
            ? "Estamos abiertos de lunes a sábado, 8:00–18:00. ¿Quiere reservar una cita?"
            : lang === "fr"
              ? "Nous sommes ouverts du lundi au samedi, 8h–18h. Souhaitez-vous prendre rendez-vous ?"
              : lang === "hi"
                ? "Hum Mon–Sat 8am–6pm open hain. Kya aap appointment book karna chahenge?"
                : "We're open Mon–Sat, 8am–6pm. Would you like to book an appointment?";
        return { reply: hoursMsg, nextState, booked: false };
      }
      return { reply: R.greeting, nextState, booked: false };
    }

    case "need_day": {
      const day = matchDay(text, lang) || (text.length <= 25 ? text.trim() : null);
      if (day) {
        nextState.step = "need_time";
        nextState.day = day;
        return { reply: R.ask_time, nextState, booked: false };
      }
      return { reply: R.ask_again_day, nextState, booked: false };
    }

    case "need_time": {
      const time = matchTime(text, lang) || (/\d|morning|afternoon|matin|tarde|subah|shaam|mañana|matin|noon|mediodía/i.test(normalize(text)) ? text.trim() : null);
      if (time) {
        nextState.step = "confirm";
        nextState.time = time;
        return { reply: R.confirm(nextState.day!, time), nextState, booked: false };
      }
      return { reply: R.ask_again_time, nextState, booked: false };
    }

    case "confirm": {
      if (matchesAny(text, YES_PHRASES[lang])) {
        nextState.step = "booked";
        return { reply: R.booked(nextState.day!, nextState.time!), nextState, booked: true };
      }
      return { reply: R.confirm(state.day!, state.time!), nextState, booked: false };
    }

    default:
      return { reply: R.greeting, nextState: { ...INITIAL_DEMO_STATE, lang }, booked: false };
  }
}
