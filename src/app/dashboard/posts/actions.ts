"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { publishLinkedInPost } from "@/lib/linkedin";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Non autenticato.");
  }
  return { supabase, user };
}

/**
 * Approve = publish immediately to LinkedIn using the user's own token
 * (read server-side, never sent to the browser). On success the post is
 * marked 'posted' with the LinkedIn URN; on failure it's marked 'failed'
 * with the error, so it stays visible and the RLS-owned row can be
 * inspected/retried instead of disappearing silently.
 */
export async function approvePost(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { supabase, user } = await requireUser();

  const { data: post } = await supabase
    .from("generated_posts")
    .select("id, content, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!post || post.status !== "pending") {
    return;
  }

  const { data: account } = await supabase
    .from("linkedin_accounts")
    .select("access_token, linkedin_sub, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const now = new Date().toISOString();

  if (!account || !account.linkedin_sub) {
    await supabase
      .from("generated_posts")
      .update({ status: "failed", error_message: "Nessun account LinkedIn collegato." })
      .eq("id", id);
    revalidatePath("/dashboard/posts");
    return;
  }

  if (account.expires_at && new Date(account.expires_at).getTime() < Date.now()) {
    await supabase
      .from("generated_posts")
      .update({
        status: "failed",
        error_message: "Il token LinkedIn è scaduto: ricollega l'account e riprova.",
      })
      .eq("id", id);
    revalidatePath("/dashboard/posts");
    return;
  }

  try {
    const urn = await publishLinkedInPost({
      accessToken: account.access_token,
      authorSub: account.linkedin_sub,
      text: post.content,
    });

    await supabase
      .from("generated_posts")
      .update({
        status: "posted",
        linkedin_post_urn: urn,
        approved_at: now,
        posted_at: now,
        error_message: null,
      })
      .eq("id", id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto durante la pubblicazione.";
    await supabase
      .from("generated_posts")
      .update({ status: "failed", error_message: message, approved_at: now })
      .eq("id", id);
  }

  revalidatePath("/dashboard/posts");
}

export async function rejectPost(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { supabase, user } = await requireUser();

  await supabase
    .from("generated_posts")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending");

  revalidatePath("/dashboard/posts");
}
