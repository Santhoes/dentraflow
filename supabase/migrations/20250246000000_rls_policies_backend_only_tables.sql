-- Satisfy linter: RLS enabled but no policy (rls_enabled_no_policy).
-- These tables are backend-only (service_role). Add explicit "deny all" policies
-- so anon/authenticated have no access; service_role bypasses RLS.
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

CREATE POLICY "Server only: no direct API access"
  ON public.paypal_webhook_events
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Server only: no direct API access"
  ON public.appointment_reminder_sent
  FOR ALL
  USING (false)
  WITH CHECK (false);
