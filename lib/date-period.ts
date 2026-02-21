export type FilterPeriod = "today" | "yesterday" | "week" | "month" | "year";

/** For upcoming section: future only, up to a month (today / week / month). */
export type UpcomingPeriod = "today" | "week" | "month";

/** For completed section: past only (today = start of today to now, yesterday/week/month/year = full period in past). */
export type PastPeriod = "today" | "yesterday" | "week" | "month" | "year";

export const PERIOD_OPTIONS: { value: FilterPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
];

export const UPCOMING_PERIOD_OPTIONS: { value: UpcomingPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

export const PAST_PERIOD_OPTIONS: { value: PastPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
];

export function getRange(period: FilterPeriod): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  switch (period) {
    case "today":
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "yesterday":
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 1);
      to.setHours(23, 59, 59, 999);
      break;
    case "week": {
      const day = from.getDay();
      const diff = day === 0 ? 6 : day - 1;
      from.setDate(from.getDate() - diff);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    }
    case "month":
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "year":
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
  }
  return { from, to };
}

/** From now to end of today/week/month. Use for upcoming appointments (no year). */
export function getUpcomingRange(period: UpcomingPeriod): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);
  switch (period) {
    case "today":
      to.setHours(23, 59, 59, 999);
      break;
    case "week": {
      const day = to.getDay();
      const daysToEnd = day === 0 ? 0 : 7 - day;
      to.setDate(to.getDate() + daysToEnd);
      to.setHours(23, 59, 59, 999);
      break;
    }
    case "month":
      to.setMonth(to.getMonth() + 1, 0);
      to.setHours(23, 59, 59, 999);
      break;
  }
  return { from, to };
}

/** Past range: from start of period to end (for "today" = to now). Use for completed appointments. */
export function getPastRange(period: PastPeriod): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  switch (period) {
    case "today":
      from.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 1);
      to.setHours(23, 59, 59, 999);
      break;
    case "week": {
      const day = from.getDay();
      const diff = day === 0 ? 6 : day - 1;
      from.setDate(from.getDate() - diff);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case "month":
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    case "year":
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      break;
  }
  return { from, to };
}

export function getPeriodLabel(period: FilterPeriod): string {
  return PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period;
}

/** Previous period of same length (e.g. last month if period is month). For comparison. */
export function getPreviousRange(period: FilterPeriod): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  switch (period) {
    case "today":
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 1);
      to.setHours(23, 59, 59, 999);
      break;
    case "yesterday":
      from.setDate(from.getDate() - 2);
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 2);
      to.setHours(23, 59, 59, 999);
      break;
    case "week": {
      const day = from.getDay();
      const diff = day === 0 ? 6 : day - 1;
      from.setDate(from.getDate() - diff - 7);
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - diff - 1);
      to.setHours(23, 59, 59, 999);
      break;
    }
    case "month":
      from.setMonth(from.getMonth() - 1, 1);
      from.setHours(0, 0, 0, 0);
      to.setMonth(to.getMonth(), 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "year":
      from.setFullYear(from.getFullYear() - 1, 0, 1);
      from.setHours(0, 0, 0, 0);
      to.setFullYear(to.getFullYear() - 1, 11, 31);
      to.setHours(23, 59, 59, 999);
      break;
  }
  return { from, to };
}
