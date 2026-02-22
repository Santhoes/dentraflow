-- Per-IP rate limit for contact form: 5 submissions per minute.
CREATE TABLE IF NOT EXISTS public.contact_form_ip_rate (
  ip_hash TEXT NOT NULL,
  bucket_minute TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_hash, bucket_minute)
);

CREATE INDEX IF NOT EXISTS idx_contact_form_ip_rate_bucket ON public.contact_form_ip_rate(bucket_minute);

COMMENT ON TABLE public.contact_form_ip_rate IS 'Per-IP submission count per minute for contact form rate limiting.';

ALTER TABLE public.contact_form_ip_rate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for contact_form_ip_rate"
  ON public.contact_form_ip_rate FOR ALL
  USING (false)
  WITH CHECK (false);

COMMENT ON POLICY "Service role only for contact_form_ip_rate" ON public.contact_form_ip_rate IS 'Updated only by API using service role.';

-- Per-IP rate limit for check-email: 10 requests per minute (reduces enumeration).
CREATE TABLE IF NOT EXISTS public.check_email_ip_rate (
  ip_hash TEXT NOT NULL,
  bucket_minute TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_hash, bucket_minute)
);

CREATE INDEX IF NOT EXISTS idx_check_email_ip_rate_bucket ON public.check_email_ip_rate(bucket_minute);

COMMENT ON TABLE public.check_email_ip_rate IS 'Per-IP request count per minute for check-email rate limiting.';

ALTER TABLE public.check_email_ip_rate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for check_email_ip_rate"
  ON public.check_email_ip_rate FOR ALL
  USING (false)
  WITH CHECK (false);
