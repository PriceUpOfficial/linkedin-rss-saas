import { createClient } from "@/lib/supabase/server";
import { saveGenerationSettings } from "./actions";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: settings } = await supabase
    .from("generation_settings")
    .select("tone, language, posts_per_day, custom_instructions")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Impostazioni di generazione</h1>
        <p className="mt-1 text-sm text-gray-500">
          Queste preferenze vengono lette dal workflow n8n quando genera i post.
        </p>
      </div>

      <form action={saveGenerationSettings} className="space-y-4 rounded-md border border-gray-200 bg-white p-4">
        <div>
          <label htmlFor="tone" className="block text-sm font-medium text-gray-700">
            Tono
          </label>
          <select
            id="tone"
            name="tone"
            defaultValue={settings?.tone ?? "professionale"}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          >
            <option value="professionale">Professionale</option>
            <option value="informale">Informale</option>
            <option value="entusiasta">Entusiasta</option>
            <option value="tecnico">Tecnico</option>
          </select>
        </div>

        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700">
            Lingua
          </label>
          <select
            id="language"
            name="language"
            defaultValue={settings?.language ?? "it"}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          >
            <option value="it">Italiano</option>
            <option value="en">Inglese</option>
          </select>
        </div>

        <div>
          <label htmlFor="posts_per_day" className="block text-sm font-medium text-gray-700">
            Post al giorno
          </label>
          <input
            id="posts_per_day"
            name="posts_per_day"
            type="number"
            min={1}
            defaultValue={settings?.posts_per_day ?? 1}
            className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="custom_instructions" className="block text-sm font-medium text-gray-700">
            Istruzioni personalizzate
          </label>
          <textarea
            id="custom_instructions"
            name="custom_instructions"
            rows={4}
            defaultValue={settings?.custom_instructions ?? ""}
            placeholder="Es: evita emoji, cita sempre la fonte, massimo 3 hashtag…"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Salva impostazioni
        </button>
      </form>
    </div>
  );
}
