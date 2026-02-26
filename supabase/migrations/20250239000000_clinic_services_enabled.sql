-- Allow clinics to enable/disable individual appointment types (disabled = not shown in embed).
ALTER TABLE public.clinic_services
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.clinic_services.enabled IS 'When false, this service is hidden from the embed chat (clinic does not offer it).';
