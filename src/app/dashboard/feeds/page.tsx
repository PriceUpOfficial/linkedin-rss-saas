import { createClient } from "@/lib/supabase/server";
import { addFeed, deleteFeed, toggleFeed } from "./actions";

export default async function FeedsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: feeds } = await supabase
    .from("rss_feeds")
    .select("id, url, title, is_active, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold">Feed RSS</h1>
        <p className="mt-1 text-sm text-gray-500">
          Aggiungi gli URL dei feed RSS da cui generare i post. Il recupero e la generazione
          avvengono in un workflow n8n esterno.
        </p>
      </div>

      <form action={addFeed} className="flex gap-2">
        <input
          type="url"
          name="url"
          required
          placeholder="https://esempio.com/feed.xml"
          className="block w-full max-w-md rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Aggiungi feed
        </button>
      </form>

      <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
        {(feeds ?? []).map((feed) => (
          <li key={feed.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {feed.title ?? feed.url}
              </p>
              <p className="truncate text-xs text-gray-500">{feed.url}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  feed.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                {feed.is_active ? "Attivo" : "In pausa"}
              </span>
              <form action={toggleFeed}>
                <input type="hidden" name="id" value={feed.id} />
                <input type="hidden" name="is_active" value={String(feed.is_active)} />
                <button type="submit" className="text-xs font-medium text-blue-600 hover:text-blue-800">
                  {feed.is_active ? "Metti in pausa" : "Riattiva"}
                </button>
              </form>
              <form action={deleteFeed}>
                <input type="hidden" name="id" value={feed.id} />
                <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-800">
                  Elimina
                </button>
              </form>
            </div>
          </li>
        ))}
        {(feeds ?? []).length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-gray-500">
            Nessun feed ancora aggiunto.
          </li>
        )}
      </ul>
    </div>
  );
}
