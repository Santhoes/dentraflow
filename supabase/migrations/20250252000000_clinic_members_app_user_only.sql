-- Allow clinic_members to be created with only app_user_id (no auth.users user_id).
-- Makes user_id nullable so new signups using app_users can add members without Supabase Auth.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinic_members' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.clinic_members ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END
$$;
