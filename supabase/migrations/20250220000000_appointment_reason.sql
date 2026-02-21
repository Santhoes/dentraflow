-- Reason/cause for the appointment (e.g. cleaning, check-up, root canal). Optional.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reason TEXT;
COMMENT ON COLUMN public.appointments.reason IS 'Cause or purpose of the visit (e.g. cleaning, check-up); shown on appointments page.';
