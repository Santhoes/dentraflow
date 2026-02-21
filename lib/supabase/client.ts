import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

const BROWSER_CLIENT_KEY = "__dentraflow_supabase_client";

declare global {
  interface Window {
    [BROWSER_CLIENT_KEY]?: SupabaseClient;
  }
}

export function createClient(): SupabaseClient {
  if (typeof window !== "undefined" && window[BROWSER_CLIENT_KEY]) return window[BROWSER_CLIENT_KEY];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const client = createSupabaseClient(url, anonKey);
  if (typeof window !== "undefined") window[BROWSER_CLIENT_KEY] = client;
  return client;
}
