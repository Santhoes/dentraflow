-- Enable RLS on public tables reported by Supabase linter (rls_disabled_in_public, sensitive_columns_exposed).
-- - appointments: clinic members can manage their clinic's appointments (dashboard uses anon+auth).
-- - paypal_webhook_events: backend-only (webhook idempotency); no user access.
-- - appointment_reminder_sent: backend-only (cron); no user access.

-- =============================================================================
-- appointments
-- =============================================================================
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Allow clinic members to manage appointments for their clinic (same pattern as clinic_locations, ai_agents, etc.)
CREATE POLICY "Clinic members manage appointments"
  ON public.appointments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = appointments.clinic_id AND cm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = appointments.clinic_id AND cm.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;

-- =============================================================================
-- paypal_webhook_events (backend-only; no policies = no anon/authenticated access)
-- =============================================================================
ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- appointment_reminder_sent (backend-only; no policies = no anon/authenticated access)
-- =============================================================================
ALTER TABLE public.appointment_reminder_sent ENABLE ROW LEVEL SECURITY;
