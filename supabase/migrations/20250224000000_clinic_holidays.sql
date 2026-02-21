-- Clinic holidays: dates when the clinic (or a specific location) is closed. Used by chat AI and booking.
CREATE TABLE IF NOT EXISTS public.clinic_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.clinic_locations(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  end_date DATE,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_holidays_clinic_id ON public.clinic_holidays(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_holidays_dates ON public.clinic_holidays(clinic_id, holiday_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_holidays TO authenticated;

COMMENT ON TABLE public.clinic_holidays IS 'Dates when clinic or a location is closed. location_id NULL = applies to all locations.';
COMMENT ON COLUMN public.clinic_holidays.end_date IS 'Optional end date for multi-day closure.';
COMMENT ON COLUMN public.clinic_holidays.label IS 'e.g. Christmas, Thanksgiving.';

ALTER TABLE public.clinic_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members manage clinic_holidays"
  ON public.clinic_holidays FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = clinic_holidays.clinic_id AND cm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = clinic_holidays.clinic_id AND cm.user_id = auth.uid()
    )
  );
