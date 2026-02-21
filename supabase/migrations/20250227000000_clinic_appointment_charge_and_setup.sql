-- Default charge per appointment for revenue calculation (completed count × charge).
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS default_appointment_charge NUMERIC(10, 2);
COMMENT ON COLUMN public.clinics.default_appointment_charge IS 'Default charge per appointment (e.g. average visit fee). Used to estimate revenue from completed appointments.';

-- When set, user has completed the initial setup; dashboard will not prompt to complete settings.
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS settings_completed_at TIMESTAMPTZ;
COMMENT ON COLUMN public.clinics.settings_completed_at IS 'When the clinic completed initial setup (details, etc.). Null = show setup prompt on dashboard.';
