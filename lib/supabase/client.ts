import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __dentraflow_supabase_client: SupabaseClient | undefined;
}

export function createClient(): SupabaseClient {
  if (typeof globalThis !== "undefined" && globalThis.__dentraflow_supabase_client)
    return globalThis.__dentraflow_supabase_client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const client = createSupabaseClient(url, anonKey, {
    auth: { debug: false },
  });
  if (typeof globalThis !== "undefined") globalThis.__dentraflow_supabase_client = client;
  return client;
}
