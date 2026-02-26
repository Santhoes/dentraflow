-- Support messages: allow app_users as creator (in addition to legacy auth.users user_id).
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS app_user_id uuid NULL REFERENCES public.app_users(id) ON DELETE SET NULL;

-- Allow rows with only app_user_id (user_id nullable for app-only auth).
ALTER TABLE public.support_messages
  ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_messages_app_user_id ON public.support_messages(app_user_id);
COMMENT ON COLUMN public.support_messages.app_user_id IS 'App user who created the message; used when auth is app_users.';

-- support_replies: allow app_user_id for "user" replies.
ALTER TABLE public.support_replies
  ADD COLUMN IF NOT EXISTS app_user_id uuid NULL REFERENCES public.app_users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_support_replies_app_user_id ON public.support_replies(app_user_id);
