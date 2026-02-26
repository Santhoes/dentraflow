-- App uses public tables only; Supabase Auth (auth.users) is legacy.
-- Authentication: app_users + app_sessions (cookies). API uses service_role (createAdminClient) and bypasses RLS.
-- Legacy: support_messages.user_id, support_replies.user_id, clinic_members.user_id still reference auth.users for old data; app_user_id is used for app auth.
-- RLS policies that use auth.uid() apply only when using Supabase Auth (anon/authenticated); service_role bypasses RLS.

COMMENT ON TABLE public.app_users IS 'Application users (email/password). Primary auth; not Supabase auth.users.';
COMMENT ON TABLE public.app_sessions IS 'App session tokens (cookies). Primary auth; not Supabase Auth.';
