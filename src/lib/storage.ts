import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const BUCKET = "post-images";

/**
 * Uploads a generated post image to the public `post-images` Storage
 * bucket (created by supabase/migrations/20260916000000_add_post_images.sql)
 * and returns its public URL. Expects an admin (service role) client since
 * writes to storage.objects need to succeed regardless of who's viewing.
 */
export async function uploadGeneratedImage(
  supabase: SupabaseClient<Database>,
  userId: string,
  imageBytes: Buffer
): Promise<string> {
  const path = `${userId}/${Date.now()}.png`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, imageBytes, {
    contentType: "image/png",
    upsert: true,
  });

  if (error) {
    throw new Error(`Caricamento immagine su Supabase Storage fallito: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}
