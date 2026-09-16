import { createClient } from "@/lib/supabase/server";
import { saveGenerationSettings } from "./actions";

const SCHEDULE_OPTIONS = [
  { value: "1x", label: "1 volta al giorno (09:00 UTC)", hours: [9] },
  { value: "3x", label: "3 volte al giorno (09:00, 13:00, 18:00 UTC)", hours: [9, 13, 18] },
  { value: "5x", label: "5 volte al giorno (08:00, 11:00, 12:00, 14:00, 18:00 UTC)", hours: [8, 11, 12, 14, 18] },
];

function presetForHours(hours: number[] | undefined): string {
  const match = SCHEDULE_OPTIONS.find(
    (option) => JSON.stringify(option.hours) === JSON.stringify(hours ?? [])
  );
  return match?.value ?? "1x";
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: settings } = await supabase
    .from("generation_settings")
    .select("tone, language, custom_instructions, schedule_hours, generate_image")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Impostazioni di generazione</h1>
        <p className="mt-1 text-sm text-gray-500">
          Controllano come e quando l&apos;app genera i post: fonti, tono, orari e immagine.
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
          <label htmlFor="schedule_preset" className="block text-sm font-medium text-gray-700">
            Quando generare automaticamente
          </label>
          <select
            id="schedule_preset"
            name="schedule_preset"
            defaultValue={presetForHours(settings?.schedule_hours)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          >
            {SCHEDULE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Vale solo per la generazione automatica (cron). &laquo;Genera ora&raquo; funziona in
            qualsiasi momento.
          </p>
        </div>

        <div>
          <label htmlFor="generate_image" className="block text-sm font-medium text-gray-700">
            Genera anche un&apos;immagine
          </label>
          <select
            id="generate_image"
            name="generate_image"
            defaultValue={String(settings?.generate_image ?? true)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          >
            <option value="true">Sì</option>
            <option value="false">No</option>
          </select>
        </div>

        <div>
          <label htmlFor="custom_instructions" className="block text-sm font-medium text-gray-700">
            Istruzioni personalizzate per l&apos;AI
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
