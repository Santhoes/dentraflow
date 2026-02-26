-- Allow clearing auth_ip_rate from admin (rate limit table).
CREATE OR REPLACE FUNCTION public.clear_allowed_table(tablename text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed text[] := ARRAY[
    'paypal_webhook_events',
    'appointment_reminder_sent',
    'contact_form_ip_rate',
    'check_email_ip_rate',
    'auth_ip_rate',
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
