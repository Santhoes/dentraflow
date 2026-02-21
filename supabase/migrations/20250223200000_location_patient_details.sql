-- Per-location patient-facing details: hours, insurance (for location-wise chat widget).
ALTER TABLE public.clinic_locations ADD COLUMN IF NOT EXISTS working_hours JSONB;
ALTER TABLE public.clinic_locations ADD COLUMN IF NOT EXISTS accepts_insurance BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.clinic_locations ADD COLUMN IF NOT EXISTS insurance_notes TEXT;

COMMENT ON COLUMN public.clinic_locations.working_hours IS 'e.g. {"mon":{"open":"09:00","close":"17:00"},...}. Used by chat widget for this location.';
COMMENT ON COLUMN public.clinic_locations.accepts_insurance IS 'Whether this location accepts insurance; shown to patients in chat.';
COMMENT ON COLUMN public.clinic_locations.insurance_notes IS 'Optional notes (e.g. which plans); shown to patients when they ask.';
