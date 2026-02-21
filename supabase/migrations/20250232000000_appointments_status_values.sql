-- Appointment status: pending | scheduled | confirmed | cancelled | completed.
-- scheduled and confirmed both mean "booked and active". No calendar sync required.
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending', 'scheduled', 'confirmed', 'cancelled', 'completed'));

COMMENT ON COLUMN public.appointments.status IS 'pending=just created; scheduled/confirmed=active booking; cancelled=patient or clinic cancelled; completed=visit done.';
