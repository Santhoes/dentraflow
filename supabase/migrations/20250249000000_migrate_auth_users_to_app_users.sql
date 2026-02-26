-- Seed app_users from existing auth.users based on email, and backfill clinic_members.app_user_id.
DO $$
DECLARE
  u RECORD;
  new_app_user_id uuid;
BEGIN
  FOR u IN
    SELECT id, email
    FROM auth.users
    WHERE email IS NOT NULL
  LOOP
    INSERT INTO public.app_users (email, password_hash)
    VALUES (lower(u.email), '')
    ON CONFLICT (lower(email)) DO UPDATE
      SET email = EXCLUDED.email
    RETURNING id INTO new_app_user_id;

    UPDATE public.clinic_members
    SET app_user_id = new_app_user_id
    WHERE user_id = u.id::uuid
      AND app_user_id IS NULL;
  END LOOP;
END
$$;

