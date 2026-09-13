"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveGenerationSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const tone = String(formData.get("tone") ?? "professionale");
  const language = String(formData.get("language") ?? "it");
  const postsPerDayRaw = Number(formData.get("posts_per_day") ?? 1);
  const posts_per_day = Number.isFinite(postsPerDayRaw) && postsPerDayRaw > 0 ? Math.floor(postsPerDayRaw) : 1;
  const customInstructions = String(formData.get("custom_instructions") ?? "").trim();

  await supabase.from("generation_settings").upsert(
    {
      user_id: user.id,
      tone,
      language,
      posts_per_day,
      custom_instructions: customInstructions || null,
    },
    { onConflict: "user_id" }
  );

  revalidatePath("/dashboard/settings");
}
