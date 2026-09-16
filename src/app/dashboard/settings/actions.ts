"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Dropdown presets for "quando generare" — matches the SCHEDULE_PRESETS
// options rendered in page.tsx. Anything else falls back to the default.
const SCHEDULE_PRESETS: Record<string, number[]> = {
  "1x": [9],
  "3x": [9, 13, 18],
  "5x": [8, 11, 12, 14, 18],
};

export async function saveGenerationSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const tone = String(formData.get("tone") ?? "professionale");
  const language = String(formData.get("language") ?? "it");
  const customInstructions = String(formData.get("custom_instructions") ?? "").trim();
  const schedulePreset = String(formData.get("schedule_preset") ?? "1x");
  const schedule_hours = SCHEDULE_PRESETS[schedulePreset] ?? SCHEDULE_PRESETS["1x"];
  const generate_image = formData.get("generate_image") === "true";

  await supabase.from("generation_settings").upsert(
    {
      user_id: user.id,
      tone,
      language,
      custom_instructions: customInstructions || null,
      schedule_hours,
      generate_image,
    },
    { onConflict: "user_id" }
  );

  revalidatePath("/dashboard/settings");
}
