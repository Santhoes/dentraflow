/**
 * Generate next available 30-min slots for embed chat from working_hours and timezone.
 * Excludes times that overlap existing appointments.
 */

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

  if (!workingHours || !Object.keys(workingHours).length) {
    const fallback: Record<string, { open: string; close: string }> = {};
    for (let i = 1; i <= 6; i++) fallback[DAY_NAMES[i]] = { open: "09:00", close: "17:00" };
    workingHours = fallback;
  }

  const dayToMinutes: Record<string, { open: number; close: number }> = {};
  for (const [day, h] of Object.entries(workingHours)) {
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
  if (!workingHours || !Object.keys(workingHours).length) {
    const fallback: Record<string, { open: string; close: string }> = {};
    for (let i = 1; i <= 6; i++) fallback[DAY_NAMES[i]] = { open: "09:00", close: "17:00" };
    workingHours = fallback;
  }
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  const maxDays = 14;
  for (let d = 0; d < maxDays && result.length < count; d++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + d);
    const dayName = date.toLocaleDateString("en-US", { timeZone: tz, weekday: "long" });
    const range = workingHours[dayName];
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
  if (!workingHours || !Object.keys(workingHours).length) {
    const fallback: Record<string, { open: string; close: string }> = {};
    for (let i = 1; i <= 6; i++) fallback[DAY_NAMES[i]] = { open: "09:00", close: "17:00" };
    workingHours = fallback;
  }
  const now = new Date();
  const maxDays = 21;
  for (let d = 0; d < maxDays && result.length < count; d++) {
    const instant = new Date(now.getTime() + d * 86400000);
    const yyyymmdd = instant.toLocaleDateString("en-CA", { timeZone: tz });
    if (result.some((r) => r.dateStr === yyyymmdd)) continue;
    const slots = getSlotsForDate(workingHours, timezone, yyyymmdd, existingStarts, 1);
    if (slots.length === 0) continue;
    const dayNum = yyyymmdd.split("-")[2];
    result.push({ dateStr: yyyymmdd, label: dayNum || "?" });
  }
  return result;
}

/**
 * Get available 30-min slots for a single day (YYYY-MM-DD). Used when user has chosen a date.
 */
export function getSlotsForDate(
  workingHours: Record<string, { open: string; close: string }> | null,
  timezone: string,
  dateStr: string,
  existingStarts: string[],
  count: number = 10,
  timeOnly: boolean = false
): SlotOption[] {
  const tz = timezone || "America/New_York";
  const existingSet = new Set(existingStarts.map((s) => s.slice(0, 16)));
  const now = new Date();

  if (!workingHours || !Object.keys(workingHours).length) {
    const fallback: Record<string, { open: string; close: string }> = {};
    for (let i = 1; i <= 6; i++) fallback[DAY_NAMES[i]] = { open: "09:00", close: "17:00" };
    workingHours = fallback;
  }

  const dayToMinutes: Record<string, { open: number; close: number }> = {};
  for (const [day, h] of Object.entries(workingHours)) {
    if (!h?.open || !h?.close) continue;
    const openMin = parseTime(h.open);
    let closeMin = parseTime(h.close);
    if (closeMin <= openMin) closeMin = openMin + 480;
    dayToMinutes[day] = { open: openMin, close: closeMin };
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  // Noon UTC so the calendar day is correct in any timezone for dayName
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
  const dayName = date.toLocaleDateString("en-US", { timeZone: tz, weekday: "long" });
  const range = dayToMinutes[dayName];
  if (!range) return [];

  // Start of that calendar day (local server time), then add open/close minutes
  const dayStart = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0);
  const openDate = new Date(dayStart);
  openDate.setMinutes(dayStart.getMinutes() + range.open);
  const closeDate = new Date(dayStart);
  closeDate.setMinutes(dayStart.getMinutes() + range.close);

  const slots: SlotOption[] = [];
  for (
    let slotStart = new Date(openDate);
    slotStart < closeDate && slots.length < count;
    slotStart.setMinutes(slotStart.getMinutes() + 30)
  ) {
    if (slotStart <= now) continue;
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30);
    const startISO = slotStart.toISOString();
    const key = startISO.slice(0, 16);
    if (existingSet.has(key)) continue;
    const label = timeOnly ? formatSlotLabelTimeOnly(slotStart, tz) : formatSlotLabel(slotStart, now, tz);
    slots.push({ label, start: startISO, end: slotEnd.toISOString() });
  }
  return slots.slice(0, count);
}
