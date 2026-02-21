-- =============================================================================
-- COMPLETE APPOINTMENTS TABLE (reference only – do not run if table already exists)
-- Use this as the single source of truth for the appointments table structure.
-- If you are creating a new DB from scratch, run this once. Otherwise your
-- table was created from an earlier schema; use the other migrations to alter.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('pending', 'scheduled', 'confirmed', 'cancelled', 'completed')),
  location_id UUID REFERENCES public.clinic_locations(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now()))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON public.appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_location_id ON public.appointments(location_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Optional: composite for common queries (upcoming by clinic)
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_start ON public.appointments(clinic_id, start_time);

-- Comments
COMMENT ON TABLE public.appointments IS 'Bookings per clinic. status: pending=just created; scheduled/confirmed=active; cancelled; completed=visit done.';
COMMENT ON COLUMN public.appointments.id IS 'Primary key.';
COMMENT ON COLUMN public.appointments.clinic_id IS 'Clinic that owns this appointment.';
COMMENT ON COLUMN public.appointments.patient_id IS 'Patient for this visit.';
COMMENT ON COLUMN public.appointments.start_time IS 'Appointment start (ISO 8601 / TIMESTAMPTZ).';
COMMENT ON COLUMN public.appointments.end_time IS 'Appointment end (ISO 8601 / TIMESTAMPTZ).';
COMMENT ON COLUMN public.appointments.status IS 'pending | scheduled | confirmed | cancelled | completed. scheduled/confirmed = active booking.';
COMMENT ON COLUMN public.appointments.location_id IS 'Optional branch (clinic_locations). NULL = primary clinic.';
COMMENT ON COLUMN public.appointments.reason IS 'Cause or purpose of visit (e.g. cleaning, check-up).';
COMMENT ON COLUMN public.appointments.created_at IS 'When the appointment record was created.';

-- RLS (enable and policy as needed for your app)
-- ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Clinic members can manage appointments"
--   ON public.appointments FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.clinic_members cm
--       WHERE cm.clinic_id = appointments.clinic_id AND cm.user_id = auth.uid()
--     )
--   );
