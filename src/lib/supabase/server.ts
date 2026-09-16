import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * Supabase client for use in Server Components, Server Actions and Route
 * Handlers. Runs with the caller's session (from cookies), so every query
 * is subject to RLS as that user.
 *
 * `cookies()` is async since Next.js 15, so this factory is async too —
 * every call site must `await createClient()`.
 */
export async function createClient() {
  const cookieStore = await cookies();

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
