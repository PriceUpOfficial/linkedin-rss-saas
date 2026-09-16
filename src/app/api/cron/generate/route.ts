import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePostForUser } from "@/lib/generatePost";
import { env } from "@/lib/env";

export const maxDuration = 60;

/**
 * Fires hourly (see vercel.json). For every user whose generation_settings
 * lists the current UTC hour in `schedule_hours`, runs the same pipeline as
 * the "Genera ora" button. Protected by CRON_SECRET so the URL can't be
 * triggered by anyone who finds it.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const currentHour = new Date().getUTCHours();
  const supabase = createAdminClient();

  const { data: dueUsers, error } = await supabase
    .from("generation_settings")
    .select("user_id")
    .contains("schedule_hours", [currentHour]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = await Promise.all(
    (dueUsers ?? []).map(async ({ user_id }) => {
      try {
        const result = await generatePostForUser(user_id);
        return { user_id, ...result };
      } catch (err) {
        return {
          user_id,
          status: "error" as const,
          message: err instanceof Error ? err.message : "Errore sconosciuto.",
        };
      }
    })
  );

  return NextResponse.json({ hour: currentHour, processed: results.length, results });
}
