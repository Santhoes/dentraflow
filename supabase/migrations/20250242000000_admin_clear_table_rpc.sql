-- Admin-only RPC to clear (truncate) allowed tables. Used by admin panel "Clear table data".
-- Only tables in the whitelist can be truncated. RESTART IDENTITY resets sequences; CASCADE truncates dependent tables.

CREATE OR REPLACE FUNCTION public.clear_allowed_table(tablename text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed text[] := ARRAY[
    'paypal_webhook_events',
    'contact_form_ip_rate',
    'check_email_ip_rate',
    'embed_chat_daily_usage',
    'embed_api_ip_rate',
    'support_replies',
    'support_messages',
    'payments',
    'appointments',
    'patients',
    'clinic_holidays',
    'clinic_services',
    'clinic_locations',
    'ai_agents',
    'calendar_connections',
    'clinic_members',
    'clinics'
  ];
  t text;
BEGIN
  IF tablename IS NULL OR trim(tablename) = '' THEN
    RAISE EXCEPTION 'Table name required';
  END IF;
  t := lower(trim(tablename));
  IF t != ANY(allowed) THEN
    RAISE EXCEPTION 'Table not allowed: %', tablename;
  END IF;
  EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', t);
END;
$$;

COMMENT ON FUNCTION public.clear_allowed_table(text) IS 'Truncates one whitelisted table. Admin only. CASCADE clears tables that reference this one.';

-- Grant execute to service role (API uses service role to call RPC)
GRANT EXECUTE ON FUNCTION public.clear_allowed_table(text) TO service_role;
