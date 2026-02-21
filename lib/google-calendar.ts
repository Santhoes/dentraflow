/**
 * Build an "Add to Google Calendar" URL for an appointment.
 * Format: https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...
 * Dates must be in YYYYMMDDTHHmmssZ (UTC).
 */
export function getGoogleCalendarUrl(params: {
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}): string {
  const format = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const base = "https://calendar.google.com/calendar/render";
  const search = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${format(params.start)}/${format(params.end)}`,
  });
  if (params.description) search.set("details", params.description);
  if (params.location) search.set("location", params.location);
  return `${base}?${search.toString()}`;
}
