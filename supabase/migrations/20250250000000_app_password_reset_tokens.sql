-- Password reset tokens for app_users (no Supabase Auth).
CREATE TABLE IF NOT EXISTS public.app_password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_password_reset_tokens_token ON public.app_password_reset_tokens (token);
CREATE INDEX IF NOT EXISTS idx_app_password_reset_tokens_expires_at ON public.app_password_reset_tokens (expires_at);

COMMENT ON TABLE public.app_password_reset_tokens IS 'One-time tokens for app_users password reset; used with Resend email links.';
