-- app_users: custom email/password users for DentraFlow app (replacing Supabase Auth for app login).
CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_unique ON public.app_users (lower(email));

COMMENT ON TABLE public.app_users IS 'Custom application users (email/password), separate from Supabase auth.users.';

-- app_sessions: opaque session tokens stored server-side and referenced by secure cookies.
CREATE TABLE IF NOT EXISTS public.app_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_token ON public.app_sessions (token);
CREATE INDEX IF NOT EXISTS idx_app_sessions_user_id ON public.app_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_expires_at ON public.app_sessions (expires_at);

COMMENT ON TABLE public.app_sessions IS 'Opaque session tokens for app_users, used for login sessions via HTTP-only cookies.';

-- Link clinic_members to app_users for app-level authorization (separate from auth.users).
ALTER TABLE public.clinic_members
  ADD COLUMN IF NOT EXISTS app_user_id uuid NULL REFERENCES public.app_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clinic_members_app_user_id ON public.clinic_members(app_user_id);


