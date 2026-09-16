import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePostForUser } from "@/lib/generatePost";

// Image generation can take a while; give this route the most headroom the
// hosting plan allows (60s on Vercel Hobby, more on paid plans).
export const maxDuration = 60;

// Called by the "Genera ora" button. Runs the whole pipeline in-process:
// fetch this user's active RSS feeds, pick the best new article, write and
// (optionally) illustrate the post with OpenAI, save it as 'pending'.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  try {
    const result = await generatePostForUser(user.id);

    switch (result.status) {
      case "created":
        return NextResponse.json({ ok: true, postId: result.postId, message: "Nuovo post generato." });
      case "no_active_feeds":
        return NextResponse.json(
          { error: "Nessun feed RSS attivo: aggiungine uno in «Feed RSS» prima di generare." },
          { status: 422 }
        );
      case "no_new_articles":
        return NextResponse.json({ ok: true, message: "Nessun nuovo articolo trovato nei feed attivi." });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto durante la generazione.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
