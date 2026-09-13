"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Non autenticato.");
  }
  return { supabase, user };
}

export async function addFeed(formData: FormData) {
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return;

  try {
    // Throws if not a valid absolute URL.
    new URL(url);
  } catch {
    return;
  }

  const { supabase, user } = await requireUser();
  await supabase.from("rss_feeds").insert({ user_id: user.id, url });
  revalidatePath("/dashboard/feeds");
}

export async function deleteFeed(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { supabase } = await requireUser();
  await supabase.from("rss_feeds").delete().eq("id", id);
  revalidatePath("/dashboard/feeds");
}

export async function toggleFeed(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("is_active") === "true";
  if (!id) return;

  const { supabase } = await requireUser();
  await supabase.from("rss_feeds").update({ is_active: !isActive }).eq("id", id);
  revalidatePath("/dashboard/feeds");
}
