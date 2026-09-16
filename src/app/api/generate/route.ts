import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

// Called by the "Genera ora" button. Triggers the external n8n workflow
// (which reads/writes Supabase directly with the service role key) by
// posting the current user's id to its webhook. This app never talks to
// RSS feeds or an LLM itself.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  try {
    const res = await fetch(env.n8nGenerateWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Il workflow n8n ha risposto con errore (${res.status}): ${text}` },
        { status: 502 }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto.";
    return NextResponse.json({ error: `Impossibile contattare n8n: ${message}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
