/**
 * Server-side message validation before calling OpenAI.
 * Rejects spam, garbage, and abusive patterns; returns static responses and optional reset.
 */

const MAX_MESSAGE_LENGTH = 250;
const SAME_MESSAGE_REPEAT_THRESHOLD = 2;
const BURST_WINDOW_MS = 5_000;
const BURST_MAX_MESSAGES = 5;
const UNCLEAR_MESSAGE =
  "I'm having trouble understanding that. Please type a date like: May 20.";
const RESET_MESSAGE =
  "Let's start fresh 🙂\nWhat can we help with? Cleaning • Checkup • Pain • Book";

const DATE_PATTERNS = [
  /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/,
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?/i,
  /\btomorrow\b/i,
  /\bnext\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b\d{4}-\d{2}-\d{2}\b/,
];

const HUMAN_TAKEOVER_TRIGGERS = [
  "complaint",
  "refund",
  "angry",
  "lawyer",
  "sue",
];

const REAL_WORD_REGEX =
  /\b(?:the|and|for|you|book|cleaning|checkup|pain|hours|insurance|appointment|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|yes|no|please|help|want|need|hi|hello|thanks|thank)\b/i;
const HAS_NUMBER = /\d/;
const SPECIAL_ONLY = /^[\s\W_]+$/;

export interface SpamCheckInput {
  messages: { role: string; content: string }[];
  failedUnclearAttempts?: number;
}

export interface SpamCheckResult {
  reject: boolean;
  message?: string;
  resetConversation?: boolean;
  failedAttempts?: number;
  humanTakeover?: boolean;
}

export function checkSpam(input: SpamCheckInput): SpamCheckResult {
  const userMessages = (input.messages || [])
    .filter((m) => m?.role === "user")
    .map((m) => String(m?.content ?? "").trim())
    .filter(Boolean);
  const last = userMessages[userMessages.length - 1];
  if (!last) return { reject: false };

  const lower = last.toLowerCase();

  for (const trigger of HUMAN_TAKEOVER_TRIGGERS) {
    if (lower.includes(trigger)) {
      return {
        reject: true,
        message: "I'll notify the clinic team to assist you directly.",
        humanTakeover: true,
      };
    }
  }

  if (last.length > MAX_MESSAGE_LENGTH) {
    return rejectUnclear(input.failedUnclearAttempts ?? 0);
  }

  if (SPECIAL_ONLY.test(last)) {
    return rejectUnclear(input.failedUnclearAttempts ?? 0);
  }

  const sameCount = userMessages.filter((t) => t === last).length;
  if (sameCount >= SAME_MESSAGE_REPEAT_THRESHOLD) {
    return rejectUnclear(input.failedUnclearAttempts ?? 0);
  }

  const hasRealWord = REAL_WORD_REGEX.test(last);
  const hasNumber = HAS_NUMBER.test(last);
  const hasDatePattern = DATE_PATTERNS.some((p) => p.test(last));
  if (!hasRealWord && !hasNumber && !hasDatePattern) {
    const letterOnly = last.replace(/\s/g, "");
    if (letterOnly.length >= 4) {
      const distinct = new Set(letterOnly.toLowerCase().split("")).size;
      if (distinct <= 12 && letterOnly.length >= 8) {
        return rejectUnclear(input.failedUnclearAttempts ?? 0);
      }
    }
  }

  const list = input.messages ?? [];
  const lastFive = list.slice(-5).map((m) => m?.role);
  const fiveUserInRow = lastFive.length === 5 && lastFive.every((r) => r === "user");
  if (fiveUserInRow) {
    return rejectUnclear(input.failedUnclearAttempts ?? 0);
  }

  return { reject: false };
}

function rejectUnclear(failedAttempts: number): SpamCheckResult {
  const next = failedAttempts + 1;
  if (next >= 3) {
    return {
      reject: true,
      message: RESET_MESSAGE,
      resetConversation: true,
      failedAttempts: 0,
    };
  }
  return {
    reject: true,
    message: UNCLEAR_MESSAGE,
    failedAttempts: next,
  };
}

export function looksLikeDate(text: string): boolean {
  const t = String(text).trim();
  if (!t || t.length > 80) return false;
  return DATE_PATTERNS.some((p) => p.test(t));
}

export function getHumanTakeoverMessage(): string {
  return "I'll notify the clinic team to assist you directly.";
}
