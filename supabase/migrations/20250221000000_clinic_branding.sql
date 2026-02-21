-- Custom branding for chat widget (Elite). Logo and colors.
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS widget_primary_color TEXT;
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS widget_background_color TEXT;
COMMENT ON COLUMN public.clinics.logo_url IS 'Logo URL for chat widget header (Elite custom branding).';
COMMENT ON COLUMN public.clinics.widget_primary_color IS 'Hex color for widget buttons/bubbles (e.g. #0d9488).';
COMMENT ON COLUMN public.clinics.widget_background_color IS 'Hex color for widget header background (optional).';
