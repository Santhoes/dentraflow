-- Address fields for primary clinic (edit from Locations page).
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS postal_code TEXT;

COMMENT ON COLUMN public.clinics.address_line1 IS 'Primary location address line 1.';
COMMENT ON COLUMN public.clinics.address_line2 IS 'Primary location address line 2.';
COMMENT ON COLUMN public.clinics.city IS 'Primary location city.';
COMMENT ON COLUMN public.clinics.state IS 'Primary location state / province.';
COMMENT ON COLUMN public.clinics.postal_code IS 'Primary location postal code.';
