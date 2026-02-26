-- Case-insensitive app_users lookup by email (uses existing lower(email) index).
-- Use from login/forgot-password/check-email so "User@Example.com" matches "user@example.com".
CREATE OR REPLACE FUNCTION public.get_app_user_by_email(em text)
RETURNS SETOF public.app_users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email, password_hash, is_admin, created_at, updated_at
  FROM public.app_users
  WHERE lower(trim(em)) = lower(email)
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_app_user_by_email(text) IS 'Returns app_users row by email (case-insensitive). Used by login and related auth.';
