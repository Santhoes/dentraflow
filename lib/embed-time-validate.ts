/**
 * Validation for appointment start/end times in embed booking and modify flows.
 * Ensures valid ISO strings, future times, and reasonable duration.
 */

const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 120;
const MAX_DAYS_AHEAD = 90;

function parseIso(iso: string): Date | null {
  const trimmed = iso?.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function validateAppointmentTimes(
  startTime: string,
  endTime: string
): { valid: boolean; error?: string } {
  const start = parseIso(startTime);
  const end = parseIso(endTime);
  if (!start) return { valid: false, error: "Invalid start time." };
  if (!end) return { valid: false, error: "Invalid end time." };
  if (start >= end) return { valid: false, error: "End time must be after start time." };
  const now = new Date();
  if (start < now) return { valid: false, error: "Start time must be in the future." };
  const durationMs = end.getTime() - start.getTime();
  const durationMin = durationMs / (60 * 1000);
  if (durationMin < MIN_DURATION_MINUTES || durationMin > MAX_DURATION_MINUTES) {
    return { valid: false, error: `Appointment duration must be between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES} minutes.` };
  }
  const daysAhead = (start.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  if (daysAhead > MAX_DAYS_AHEAD) {
    return { valid: false, error: "Start time must be within 90 days." };
  }
  return { valid: true };
}
