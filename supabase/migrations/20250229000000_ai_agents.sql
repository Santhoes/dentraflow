-- AI agents per clinic: human-named receptionists. Count limited by plan (starter=1, pro=2, elite=5).
-- Embed and chat widget APIs use agent_id to load name and location for the conversation.
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_id UUID REFERENCES public.clinic_locations(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_agents_name_not_empty CHECK (trim(name) <> '')
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_clinic_id ON public.ai_agents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_location_id ON public.ai_agents(location_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agents TO authenticated;

COMMENT ON TABLE public.ai_agents IS 'Named AI receptionist agents per clinic. Plan limits: starter=1, pro=2, elite=5. Chat widget and embed API use agent to personalize prompts.';
COMMENT ON COLUMN public.ai_agents.name IS 'Human-like name for this agent (e.g. Sarah, Alex). Shown to patients in chat.';
COMMENT ON COLUMN public.ai_agents.location_id IS 'Optional: link agent to a branch; null = main clinic. Used for location-specific hours/insurance in prompt.';

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members manage ai_agents"
  ON public.ai_agents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = ai_agents.clinic_id AND cm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = ai_agents.clinic_id AND cm.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.set_ai_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_agents_updated_at ON public.ai_agents;
CREATE TRIGGER ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.set_ai_agents_updated_at();
