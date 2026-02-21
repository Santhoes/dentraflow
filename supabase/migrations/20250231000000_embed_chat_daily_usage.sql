-- Daily chat message count per clinic for cost protection (Starter/Pro/Elite limits).
CREATE TABLE IF NOT EXISTS public.embed_chat_daily_usage (
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  message_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (clinic_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_embed_chat_daily_usage_date ON public.embed_chat_daily_usage(usage_date);

COMMENT ON TABLE public.embed_chat_daily_usage IS 'Daily embed chat message count per clinic. Used to enforce plan limits (e.g. 300/day Starter) and protect OpenAI cost.';

-- Only server/embed API should write; no RLS needed if only service role calls.
ALTER TABLE public.embed_chat_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for embed_chat_daily_usage"
  ON public.embed_chat_daily_usage FOR ALL
  USING (false)
  WITH CHECK (false);

COMMENT ON POLICY "Service role only for embed_chat_daily_usage" ON public.embed_chat_daily_usage IS 'Table is updated only by API using service role; no app user access.';
