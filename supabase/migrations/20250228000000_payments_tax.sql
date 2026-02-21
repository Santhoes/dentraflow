-- Store tax and country on payments for display and reporting.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2);
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS country TEXT;
COMMENT ON COLUMN public.payments.tax_amount IS 'Tax amount in payment currency (e.g. VAT/GST).';
COMMENT ON COLUMN public.payments.country IS 'Country of the payer (for tax display).';
