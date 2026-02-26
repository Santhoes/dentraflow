-- Track which appointment reminders have been sent so we don't send twice (cron may run hourly).
CREATE TABLE IF NOT EXISTS public.appointment_reminder_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('day_before', 'morning_of')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now())),
  UNIQUE(appointment_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_appointment_reminder_sent_appointment_id ON public.appointment_reminder_sent(appointment_id);
COMMENT ON TABLE public.appointment_reminder_sent IS 'One row per appointment per reminder type (day_before, morning_of). Prevents duplicate reminder emails.';
