-- Add status to support_messages: open | closed (admin can mark case closed).
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open'
  CHECK (status IN ('open', 'closed'));

COMMENT ON COLUMN public.support_messages.status IS 'Admin-set: open (default) or closed.';
