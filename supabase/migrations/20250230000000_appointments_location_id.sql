-- Link appointments to a specific clinic location (branch). NULL = main clinic.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.clinic_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_location_id ON public.appointments(location_id);

COMMENT ON COLUMN public.appointments.location_id IS 'Optional: branch where the appointment is booked. NULL = primary clinic. Used for analytics by location.';
