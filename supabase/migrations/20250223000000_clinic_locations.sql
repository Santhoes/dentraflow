-- Branch locations per clinic (Pro: up to 3, Elite: unlimited). Primary location = clinic itself.
CREATE TABLE IF NOT EXISTS public.clinic_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  timezone TEXT,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_locations_clinic_id ON public.clinic_locations(clinic_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_locations TO authenticated;

COMMENT ON TABLE public.clinic_locations IS 'Branch locations for multi-location plans (Pro/Elite). Primary location is the clinic itself.';

ALTER TABLE public.clinic_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members manage clinic_locations"
  ON public.clinic_locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = clinic_locations.clinic_id AND cm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = clinic_locations.clinic_id AND cm.user_id = auth.uid()
    )
  );

-- Keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_clinic_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clinic_locations_updated_at ON public.clinic_locations;
CREATE TRIGGER clinic_locations_updated_at
  BEFORE UPDATE ON public.clinic_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_clinic_locations_updated_at();
