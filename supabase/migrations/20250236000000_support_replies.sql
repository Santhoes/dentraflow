-- Thread replies for support cases: clinic can add messages, admin replies stored here too.
CREATE TABLE IF NOT EXISTS public.support_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.support_messages(id) ON DELETE CASCADE,
  from_role TEXT NOT NULL CHECK (from_role IN ('user', 'admin')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_replies_case_id_created_at_idx ON public.support_replies(case_id, created_at ASC);

ALTER TABLE public.support_replies ENABLE ROW LEVEL SECURITY;

-- Clinic members can see replies for their clinic's cases.
CREATE POLICY support_replies_select ON public.support_replies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_messages sm
      JOIN public.clinic_members cm ON cm.clinic_id = sm.clinic_id AND cm.user_id = auth.uid()
      WHERE sm.id = support_replies.case_id
    )
  );

-- Clinic members can insert user replies for their clinic's cases.
CREATE POLICY support_replies_insert_user ON public.support_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    from_role = 'user'
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_messages sm
      JOIN public.clinic_members cm ON cm.clinic_id = sm.clinic_id AND cm.user_id = auth.uid()
      WHERE sm.id = support_replies.case_id
    )
  );

-- Admin (service role) can insert and do everything; no policy for anon.
COMMENT ON TABLE public.support_replies IS 'Follow-up messages in a support case; from_role user = clinic, admin = DentraFlow support.';
