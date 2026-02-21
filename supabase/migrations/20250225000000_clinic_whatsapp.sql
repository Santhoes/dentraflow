-- WhatsApp business number for Elite: patients can open wa.me link to chat/book.
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
COMMENT ON COLUMN public.clinics.whatsapp_phone IS 'WhatsApp business number (E.164 or with country code). Elite only. Used for wa.me link.';
