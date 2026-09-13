import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * Supabase client for use in Server Components, Server Actions and Route
 * Handlers. Runs with the caller's session (from cookies), so every query
 * is subject to RLS as that user.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component render (not an action/route
          // handler) — cookies are read-only there. Safe to ignore as
          // long as middleware.ts refreshes the session on navigation.
        }
      },
    },
  });
}
