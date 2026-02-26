-- PayPal deposit (Elite only) and cancellation/refund policy for clinics.
-- paypal_merchant_id: clinic's PayPal Business merchant ID for receiving deposit funds.
-- cancellation_policy_text: shown to patients before paying deposit; required for legal clarity.
-- deposit_required: when true (Elite only), booking flow requires deposit payment.
-- deposit_rules_json: e.g. { "default_amount": 25, "currency": "USD", "by_service": { "Root Canal": 50 } }

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS paypal_merchant_id TEXT;
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS cancellation_policy_text TEXT;
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS deposit_rules_json JSONB;

COMMENT ON COLUMN public.clinics.paypal_merchant_id IS 'PayPal Business merchant ID for receiving appointment deposits (Elite only).';
COMMENT ON COLUMN public.clinics.cancellation_policy_text IS 'Cancellation and refund policy text shown to patients before paying deposit.';
COMMENT ON COLUMN public.clinics.deposit_required IS 'If true, patients must pay a deposit to confirm booking (Elite only).';
COMMENT ON COLUMN public.clinics.deposit_rules_json IS 'Deposit rules: default_amount, currency, optional by_service map (service name -> amount).';
