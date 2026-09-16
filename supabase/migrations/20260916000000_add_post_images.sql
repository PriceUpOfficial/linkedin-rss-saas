-- Adds image support to generated_posts (the n8n workflow now generates a
-- branded image per post) and a public Storage bucket for n8n to upload
-- those images into before writing the row.

alter table public.generated_posts
  add column image_url text;

-- Public bucket: n8n uploads with the service role key (bypasses RLS
-- entirely), and the app + LinkedIn's own fetch of the image both need
-- anonymous read access, which Supabase Storage grants automatically for
-- any object in a bucket flagged `public`.
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;
