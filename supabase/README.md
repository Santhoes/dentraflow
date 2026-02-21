# Supabase

## Migrations

Run the SQL in `migrations/` in your Supabase project (SQL Editor or via Supabase CLI). These are safe to run on an existing database (idempotent).

- **20250219000000_safe_updates_only.sql**  
  - Adds `created_at` to `payments` if not present (for admin earnings over time).

If you already use the full schema (e.g. from `full-schema-and-migrations-new-project.sql`), you already have `clinics`, `clinic_members`, `appointments`, `payments`, etc. Only run the migration above if `payments` is missing the `created_at` column.
