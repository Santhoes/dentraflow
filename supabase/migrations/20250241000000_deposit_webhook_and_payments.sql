-- Appointment deposit/payment fields (for Elite deposit flow).
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'none'
    CHECK (payment_status IN ('none', 'pending', 'paid', 'failed', 'refunded'));
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS paypal_order_id TEXT;
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2);
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS treatment_type TEXT;
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS policy_accepted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.appointments.payment_status IS 'Deposit: none|pending|paid|failed|refunded. none = no deposit required.';
COMMENT ON COLUMN public.appointments.paypal_order_id IS 'PayPal order ID for deposit (set when order created).';
COMMENT ON COLUMN public.appointments.deposit_amount IS 'Deposit amount for this appointment (from clinic deposit_rules).';
COMMENT ON COLUMN public.appointments.policy_accepted_at IS 'When patient accepted cancellation/refund policy before paying deposit.';

-- Payments: link to appointment for deposit payments. For deposit payments, set appointment_id; plan can be null if column allows.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.payments.appointment_id IS 'Set for deposit payments; null for subscription payments.';

CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON public.payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointments_paypal_order_id ON public.appointments(paypal_order_id);

-- Idempotency: prevent duplicate webhook processing.
CREATE TABLE IF NOT EXISTS public.paypal_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paypal_event_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now()))
);
COMMENT ON TABLE public.paypal_webhook_events IS 'Processed PayPal webhook event IDs for idempotency.';
