# Tables-only usage (no Supabase Auth)

The app uses **only Supabase as a database** (public tables). Authentication is handled by our own **app_users** and **app_sessions** (cookies). Supabase Auth (`auth.users`) is **not** used for login/signup.

## API routes (tables only)

- All API routes use **createAdminClient()** (service role), which bypasses RLS and never uses Supabase Auth.
- Auth is done via **getAuthContext()** / **getAuthContextFromRequest()** / **requireUser()** / **requireAdmin()** from `@/lib/auth/app-auth` and `@/lib/admin-auth-server`, which read the session cookie and look up **app_sessions** → **app_users**.
- No route calls `supabase.auth.signIn`, `getUser`, or `getSession`.

## Client-side (Supabase client)

- **createClient()** (anon key) is used in some app pages (e.g. appointments, dashboard, locations, analytics) to query **appointments**, **patients**, **clinic_holidays**, etc. from the browser.
- RLS on those tables uses `auth.uid()` in policies. With app-only auth there is no Supabase Auth session, so `auth.uid()` is null and those policies would deny anon. In practice, either RLS is not enforced for anon on those tables or the app relies on API routes for sensitive data; the main app flows (create/update/delete) go through API routes with **createAdminClient()**.

## Database (migrations)

- **app_users**, **app_sessions**, **app_password_reset_tokens**: app-only; no reference to `auth.users`.
- **clinic_members**: has both `user_id` (legacy, nullable) and **app_user_id** (used for app auth). Migration `20250252000000_clinic_members_app_user_only.sql` made `user_id` nullable.
- **support_messages**, **support_replies**: have **user_id** (legacy, references auth.users) and **app_user_id** (used for app). Migration `20250251000000_support_messages_app_user_id.sql` added **app_user_id** and made **user_id** nullable on support_messages.
- **20250249000000_migrate_auth_users_to_app_users.sql**: one-time seed from `auth.users` into **app_users** and backfill of **clinic_members.app_user_id**.
- **20250256000000_app_tables_only_docs.sql**: documents that the app uses tables only and auth is app_users/app_sessions.

## Legacy references (kept for data)

- **support_messages.user_id**, **support_replies.user_id**, **clinic_members.user_id** still reference `auth.users` where present. RLS policies in older migrations still use `auth.uid()`; they apply only when using Supabase Auth. Service role bypasses RLS, so API behavior is unchanged.
