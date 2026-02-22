/**
 * Build "Add to Google Calendar" URL for an appointment.
 * Used for Pro & Elite: chat and confirmation email.
 */

export function buildGoogleCalendarUrl(params: {
  title: string;
  start: string;
  end: string;
  details?: string;
  location?: string;
}): string {
  const startDate = new Date(params.start);
  const endDate = new Date(params.end);
  const format = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dates = `${format(startDate)}/${format(endDate)}`;
  const search = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title.slice(0, 200),
    dates,
  });
  if (params.details) search.set("details", params.details.slice(0, 500));
  if (params.location) search.set("location", params.location.slice(0, 200));
  return `https://calendar.google.com/calendar/render?${search.toString()}`;
}
