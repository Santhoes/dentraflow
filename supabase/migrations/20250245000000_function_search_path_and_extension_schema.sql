-- Fix Supabase linter: function_search_path_mutable and extension_in_public.
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public

-- =============================================================================
-- 1. Functions: set immutable search_path so the linter is satisfied
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_ai_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_clinic_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- =============================================================================
-- 2. Extension: move btree_gist from public to extensions schema
-- =============================================================================
-- If this fails (e.g. permissions), enable "extensions" schema in Dashboard
-- and re-enable btree_gist there so it installs into extensions by default.

CREATE SCHEMA IF NOT EXISTS extensions;

ALTER EXTENSION btree_gist SET SCHEMA extensions;
