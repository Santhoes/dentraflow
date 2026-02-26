/**
 * Generate next available 30-min slots for embed chat from working_hours and timezone.
 * Excludes times that overlap existing appointments.
 * working_hours keys may be short (mon, tue, ...) or long (Monday, Tuesday, ...); we normalize to long.
 */

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SHORT_TO_LONG_DAY: Record<string, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

/** Normalize working_hours so keys are long day names (Monday, Tuesday, ...) for toLocaleDateString(weekday: "long") lookups. */
function normalizeWorkingHours(
  workingHours: Record<string, { open: string; close: string }> | null
): Record<string, { open: string; close: string }> {
  if (!workingHours || !Object.keys(workingHours).length) return {};
  const out: Record<string, { open: string; close: string }> = {};
  for (const [day, h] of Object.entries(workingHours)) {
    if (!h?.open || !h?.close) continue;
    const longDay = SHORT_TO_LONG_DAY[day.toLowerCase()] ?? (DAY_NAMES.includes(day) ? day : null);
    if (longDay) out[longDay] = { open: h.open, close: h.close };
  }
  return out;
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatSlotLabel(start: Date, now: Date, timezone: string): string {
  const dateStr = start.toLocaleDateString("en-US", { timeZone: timezone });
  const nowStr = now.toLocaleDateString("en-US", { timeZone: timezone });
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString("en-US", { timeZone: timezone });
  const timePart = start.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (dateStr === nowStr) return `Today ${timePart}`;
  if (dateStr === tomorrowStr) return `Tomorrow ${timePart}`;
  const dayName = start.toLocaleDateString("en-US", { timeZone: timezone, weekday: "long" });
  return `${dayName} ${timePart}`;
}

/** Time only (e.g. "2:00 PM") when date is already selected. */
export function formatSlotLabelTimeOnly(start: Date, timezone: string): string {
  return start.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Get period of day (Morning / Afternoon / Evening) for a date in clinic timezone. */
function getTimeOfDayPeriod(start: Date, timezone: string): "Morning" | "Afternoon" | "Evening" {
  const hour = parseInt(
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone, hour: "numeric", hour12: false }).format(start),
    10
  );
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export interface SlotOption {
  label: string;
  start: string;
  end: string;
}

export function getNextSlots(
  workingHours: Record<string, { open: string; close: string }> | null,
  timezone: string,
  existingStarts: string[],
  count: number = 5
): SlotOption[] {
  const tz = timezone || "America/New_York";
  const now = new Date();
  const slots: SlotOption[] = [];
  const existingSet = new Set(existingStarts.map((s) => s.slice(0, 16)));

  let normalized = normalizeWorkingHours(workingHours);
  if (!Object.keys(normalized).length) {
    const fallback: Record<string, { open: string; close: string }> = {};
    for (let i = 1; i <= 6; i++) fallback[DAY_NAMES[i]] = { open: "09:00", close: "17:00" };
    normalized = fallback;
  }

  const dayToMinutes: Record<string, { open: number; close: number }> = {};
  for (const [day, h] of Object.entries(normalized)) {
    if (!h?.open || !h?.close) continue;
    const openMin = parseTime(h.open);
    let closeMin = parseTime(h.close);
    if (closeMin <= openMin) closeMin = openMin + 480;
    dayToMinutes[day] = { open: openMin, close: closeMin };
  }

  const startDate = new Date(now);
  startDate.setMinutes(0, 0, 0);
  const maxDays = 14;
  // Collect slots from at least 3–4 days: take up to 4 slots per day so we span multiple days
  const minSlots = Math.max(count, 12);
  const maxPerDay = 4;

  for (let d = 0; d < maxDays && slots.length < minSlots; d++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + d);
    const dayName = date.toLocaleDateString("en-US", { timeZone: tz, weekday: "long" });
    const range = dayToMinutes[dayName];
    if (!range) continue;

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const openDate = new Date(dayStart);
    openDate.setMinutes(dayStart.getMinutes() + range.open);
    const closeDate = new Date(dayStart);
    closeDate.setMinutes(dayStart.getMinutes() + range.close);

    let daySlots = 0;
    for (
      let slotStart = new Date(openDate);
      slotStart < closeDate && slots.length < minSlots && daySlots < maxPerDay;
      slotStart.setMinutes(slotStart.getMinutes() + 30)
    ) {
      if (slotStart <= now) continue;
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + 30);
      const startISO = slotStart.toISOString();
      const key = startISO.slice(0, 16);
      if (existingSet.has(key)) continue;
      daySlots++;
      const label = formatSlotLabel(slotStart, now, tz);
      slots.push({
        label,
        start: startISO,
        end: slotEnd.toISOString(),
      });
    }
  }

  return slots.slice(0, count);
}

export interface WorkingDayOption {
  dateStr: string;
  label: string;
}

/**
 * Get the next N working days (by working_hours) as dateStr + label. (Legacy; prefer getNextDaysWithSlots.)
 */
export function getNextWorkingDays(
  workingHours: Record<string, { open: string; close: string }> | null,
  timezone: string,
  count: number = 3
): WorkingDayOption[] {
  const tz = timezone || "America/New_York";
  const result: WorkingDayOption[] = [];
  let normalized = normalizeWorkingHours(workingHours);
  if (!Object.keys(normalized).length) {
    const fallback: Record<string, { open: string; close: string }> = {};
    for (let i = 1; i <= 6; i++) fallback[DAY_NAMES[i]] = { open: "09:00", close: "17:00" };
    normalized = fallback;
  }
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  const maxDays = 14;
  for (let d = 0; d < maxDays && result.length < count; d++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + d);
    const dayName = date.toLocaleDateString("en-US", { timeZone: tz, weekday: "long" });
    const range = normalized[dayName];
    if (!range?.open || !range?.close) continue;
    const dateStr = date.toISOString().slice(0, 10);
    const label = dateStr === now.toLocaleDateString("en-CA", { timeZone: tz })
      ? "Today"
      : dateStr === new Date(now.getTime() + 86400000).toLocaleDateString("en-CA", { timeZone: tz })
        ? "Tomorrow"
        : dayName;
    result.push({ dateStr, label });
  }
  return result;
}

/**
 * Get the next up to N calendar days that have at least one available slot.
 * Labels are day-of-month only (e.g. "24", "25", "26") for compact display.
 */
export function getNextDaysWithSlots(
  workingHours: Record<string, { open: string; close: string }> | null,
  timezone: string,
  existingStarts: string[],
  count: number = 5
): WorkingDayOption[] {
  const tz = timezone || "America/New_York";
  const result: WorkingDayOption[] = [];
  let normalized = normalizeWorkingHours(workingHours);
  if (!Object.keys(normalized).length) {
    const fallback: Record<string, { open: string; close: string }> = {};
    for (let i = 1; i <= 6; i++) fallback[DAY_NAMES[i]] = { open: "09:00", close: "17:00" };
    normalized = fallback;
  }
  const now = new Date();
  const maxDays = 21;
  for (let d = 0; d < maxDays && result.length < count; d++) {
    const instant = new Date(now.getTime() + d * 86400000);
    const yyyymmdd = instant.toLocaleDateString("en-CA", { timeZone: tz });
    if (result.some((r) => r.dateStr === yyyymmdd)) continue;
    const slots = getSlotsForDate(normalized, timezone, yyyymmdd, existingStarts, 1);
    if (slots.length === 0) continue;
    const todayStr = now.toLocaleDateString("en-CA", { timeZone: tz });
    const tomorrow = new Date(now.getTime() + 86400000);
    const tomorrowStr = tomorrow.toLocaleDateString("en-CA", { timeZone: tz });
    const shortDay = instant.toLocaleDateString("en-US", { timeZone: tz, weekday: "short" });
    const shortMonth = instant.toLocaleDateString("en-US", { timeZone: tz, month: "short" });
    const dayNum = instant.toLocaleDateString("en-US", { timeZone: tz, day: "numeric" });
    const label =
      yyyymmdd === todayStr
        ? "Today"
        : yyyymmdd === tomorrowStr
          ? "Tomorrow"
          : `${shortDay}, ${shortMonth} ${dayNum}`;
    result.push({ dateStr: yyyymmdd, label });
  }
  return result;
}

/**
 * Get available slots for a single day (YYYY-MM-DD). Slot length = durationMinutes (default 30).
 */
export function getSlotsForDate(
  workingHours: Record<string, { open: string; close: string }> | null,
  timezone: string,
  dateStr: string,
  existingStarts: string[],
  count: number = 10,
  timeOnly: boolean = false,
  durationMinutes: number = 30
): SlotOption[] {
  const tz = timezone || "America/New_York";
  const durationMs = Math.max(15, Math.min(480, durationMinutes)) * 60 * 1000;
  const existingSet = new Set(existingStarts.map((s) => s.slice(0, 16)));
  const now = new Date();

  let normalized = normalizeWorkingHours(workingHours);
  if (!Object.keys(normalized).length) {
    const fallback: Record<string, { open: string; close: string }> = {};
    for (let i = 1; i <= 6; i++) fallback[DAY_NAMES[i]] = { open: "09:00", close: "17:00" };
    normalized = fallback;
  }

  const dayToMinutes: Record<string, { open: number; close: number }> = {};
  for (const [day, h] of Object.entries(normalized)) {
    if (!h?.open || !h?.close) continue;
    const openMin = parseTime(h.open);
    let closeMin = parseTime(h.close);
    if (closeMin <= openMin) closeMin = openMin + 480;
    dayToMinutes[day] = { open: openMin, close: closeMin };
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  const dayName = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0)).toLocaleDateString("en-US", {
    timeZone: tz,
    weekday: "long",
  });
  const range = dayToMinutes[dayName];
  if (!range) return [];

  const dayStartUtc = Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0);
  const dayEndUtc = dayStartUtc + 24 * 60 * 60 * 1000;
  const slots: SlotOption[] = [];

  for (let t = dayStartUtc; t < dayEndUtc && slots.length < count; t += durationMs) {
    const slotStart = new Date(t);
    const dateInTz = slotStart.toLocaleDateString("en-CA", { timeZone: tz });
    if (dateInTz !== dateStr) continue;

    const hourInTz = parseInt(
      new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour: "numeric", hour12: false }).format(slotStart),
      10
    );
    const minuteInTz = parseInt(
      new Intl.DateTimeFormat("en-CA", { timeZone: tz, minute: "2-digit" }).format(slotStart),
      10
    );
    const minsInTz = hourInTz * 60 + minuteInTz;
    if (minsInTz < range.open || minsInTz >= range.close) continue;
    if (slotStart <= now) continue;

    const slotEnd = new Date(slotStart.getTime() + durationMs);
    const startISO = slotStart.toISOString();
    const key = startISO.slice(0, 16);
    if (existingSet.has(key)) continue;

    const timePart = formatSlotLabelTimeOnly(slotStart, tz);
    const label = timeOnly
      ? `${getTimeOfDayPeriod(slotStart, tz)} ${timePart}`
      : formatSlotLabel(slotStart, now, tz);
    slots.push({ label, start: startISO, end: slotEnd.toISOString() });
  }
  return slots.slice(0, count);
}
