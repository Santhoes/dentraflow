-- Support messages from clinic users to admin (chat-style).
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  admin_reply TEXT,
  admin_replied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS support_messages_clinic_id_idx ON public.support_messages(clinic_id);
CREATE INDEX IF NOT EXISTS support_messages_created_at_idx ON public.support_messages(created_at DESC);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Clinic members can insert their own messages; only service role can read all / update (admin reply).
CREATE POLICY support_messages_insert ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id = support_messages.clinic_id AND user_id = auth.uid())
  );

CREATE POLICY support_messages_select_own ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id = support_messages.clinic_id AND user_id = auth.uid())
  );

COMMENT ON TABLE public.support_messages IS 'Messages from clinic users to DentraFlow support; admin can view and reply.';
