"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function disconnectLinkedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("linkedin_accounts").delete().eq("user_id", user.id);
  revalidatePath("/dashboard/linkedin");
}
