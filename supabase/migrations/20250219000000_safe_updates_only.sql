-- Safe updates only: run against existing Supabase DB. No new tables if you already have full schema.
-- Use: Supabase SQL Editor or `supabase db push` (if using CLI).

-- Ensure payments has created_at (for admin earnings over time). Idempotent.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL;

-- Insurance: so patients understand while chatting with AI agent.
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS accepts_insurance BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS insurance_notes TEXT;
COMMENT ON COLUMN public.clinics.accepts_insurance IS 'Whether the clinic accepts insurance; shown to patients in chat.';
COMMENT ON COLUMN public.clinics.insurance_notes IS 'Optional notes (e.g. which plans); shown to patients when they ask.';

-- Single allowed domain for chat widget embed (e.g. www.myclinic.com). Widget only loads on this domain.
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS website_domain TEXT;
COMMENT ON COLUMN public.clinics.website_domain IS 'Single domain where chat widget is allowed (e.g. www.myclinic.com).';
