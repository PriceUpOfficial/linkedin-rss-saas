import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * Service-role Supabase client. Bypasses RLS entirely — never import this
 * from a Client Component, and never return its results directly to the
 * browser without checking ownership yourself. Not currently used by any
 * request in this app (every table's RLS policy already lets a user read
 * and write their own rows), kept available for future server-side jobs
 * (e.g. an internal admin API) run from this app rather than from n8n.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
