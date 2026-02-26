-- Per-IP rate limit for auth endpoints (login, signup, set-password) to prevent brute force and abuse.
CREATE TABLE IF NOT EXISTS public.auth_ip_rate (
  ip_hash TEXT NOT NULL,
  bucket_minute TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('login', 'signup', 'set_password')),
  count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_hash, bucket_minute, kind)
);

CREATE INDEX IF NOT EXISTS idx_auth_ip_rate_bucket ON public.auth_ip_rate(bucket_minute);

COMMENT ON TABLE public.auth_ip_rate IS 'Per-IP request count per minute for login/signup/set-password rate limiting.';

ALTER TABLE public.auth_ip_rate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for auth_ip_rate"
  ON public.auth_ip_rate FOR ALL
  USING (false)
  WITH CHECK (false);
