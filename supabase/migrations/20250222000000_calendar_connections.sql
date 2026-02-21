-- Multi-staff Google Calendar connections (Elite). One row per connected calendar per clinic.
CREATE TABLE IF NOT EXISTS public.calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_connections_clinic_id
  ON public.calendar_connections(clinic_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_connections TO authenticated;

COMMENT ON TABLE public.calendar_connections IS 'Elite: Google Calendar connections per clinic for multi-staff sync.';
COMMENT ON COLUMN public.calendar_connections.display_name IS 'Label for this calendar (e.g. staff name).';
COMMENT ON COLUMN public.calendar_connections.calendar_id IS 'Google Calendar ID (e.g. primary or specific calendar id).';

ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;

-- Clinic members can view and manage their clinic's calendar connections.
CREATE POLICY "Clinic members manage calendar_connections"
  ON public.calendar_connections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = calendar_connections.clinic_id AND cm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = calendar_connections.clinic_id AND cm.user_id = auth.uid()
    )
  );
