-- Clinic setting: require policy agreement before confirming a paid (deposit) booking.
-- When false, patients can confirm without ticking the policy checkbox (booking = implicit agreement).
-- Only applies when deposit_required is true; free bookings never show the agreement step.

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS require_policy_agreement BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.clinics.require_policy_agreement IS 'When deposit_required is true: if true, patients must tick policy agreement before confirm. If false, skip agreement step.';
