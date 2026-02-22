-- Per-IP rate limit for embed chat: 10 messages per minute.
CREATE TABLE IF NOT EXISTS public.embed_chat_ip_rate (
  ip_hash TEXT NOT NULL,
  bucket_minute TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_hash, bucket_minute)
);

CREATE INDEX IF NOT EXISTS idx_embed_chat_ip_rate_bucket ON public.embed_chat_ip_rate(bucket_minute);

COMMENT ON TABLE public.embed_chat_ip_rate IS 'Per-IP message count per minute for embed chat rate limiting.';

ALTER TABLE public.embed_chat_ip_rate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for embed_chat_ip_rate"
  ON public.embed_chat_ip_rate FOR ALL
  USING (false)
  WITH CHECK (false);

COMMENT ON POLICY "Service role only for embed_chat_ip_rate" ON public.embed_chat_ip_rate IS 'Updated only by API using service role.';
