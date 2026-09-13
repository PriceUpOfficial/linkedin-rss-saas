-- Initial schema for linkedin-rss-saas
-- Tables: profiles, rss_feeds, feed_items, linkedin_accounts, oauth_states,
--         generated_posts, content, generation_settings
-- All tables have Row Level Security enabled.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Shared helper: keep an `updated_at` column current on every UPDATE.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: 1:1 extension of auth.users, auto-created on signup.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text,
  is_admin            boolean not null default false,
  subscription_status text not null default 'free',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth.users row is inserted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- rss_feeds: a user's list of RSS feed URLs.
-- ---------------------------------------------------------------------------
create table public.rss_feeds (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  url        text not null,
  title      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, url)
);

create index rss_feeds_user_id_idx on public.rss_feeds (user_id);

alter table public.rss_feeds enable row level security;

create policy "rss_feeds_select_own" on public.rss_feeds
  for select using (auth.uid() = user_id);

create policy "rss_feeds_insert_own" on public.rss_feeds
  for insert with check (auth.uid() = user_id);

create policy "rss_feeds_update_own" on public.rss_feeds
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "rss_feeds_delete_own" on public.rss_feeds
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- feed_items: items pulled from a feed, deduped by guid.
-- ---------------------------------------------------------------------------
create table public.feed_items (
  id            uuid primary key default gen_random_uuid(),
  feed_id       uuid not null references public.rss_feeds (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  guid          text not null,
  title         text,
  link          text,
  summary       text,
  published_at  timestamptz,
  fetched_at    timestamptz not null default now(),
  unique (feed_id, guid)
);

create index feed_items_feed_id_idx on public.feed_items (feed_id);
create index feed_items_user_id_idx on public.feed_items (user_id);

alter table public.feed_items enable row level security;

create policy "feed_items_select_own" on public.feed_items
  for select using (auth.uid() = user_id);

create policy "feed_items_insert_own" on public.feed_items
  for insert with check (auth.uid() = user_id);

create policy "feed_items_update_own" on public.feed_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "feed_items_delete_own" on public.feed_items
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- linkedin_accounts: tokens from the custom LinkedIn OAuth 2.0 flow.
-- Access/refresh tokens should only ever be read server-side with the
-- service role key; RLS below only guarantees a user can't see another
-- user's row.
-- ---------------------------------------------------------------------------
create table public.linkedin_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users (id) on delete cascade,
  linkedin_sub  text,
  access_token  text not null,
  refresh_token text,
  scope         text,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.linkedin_accounts enable row level security;

create policy "linkedin_accounts_select_own" on public.linkedin_accounts
  for select using (auth.uid() = user_id);

create policy "linkedin_accounts_insert_own" on public.linkedin_accounts
  for insert with check (auth.uid() = user_id);

create policy "linkedin_accounts_update_own" on public.linkedin_accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "linkedin_accounts_delete_own" on public.linkedin_accounts
  for delete using (auth.uid() = user_id);

create trigger linkedin_accounts_set_updated_at
  before update on public.linkedin_accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- oauth_states: short-lived CSRF state for the LinkedIn OAuth handshake.
-- ---------------------------------------------------------------------------
create table public.oauth_states (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  state      text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);

alter table public.oauth_states enable row level security;

create policy "oauth_states_select_own" on public.oauth_states
  for select using (auth.uid() = user_id);

create policy "oauth_states_insert_own" on public.oauth_states
  for insert with check (auth.uid() = user_id);

create policy "oauth_states_update_own" on public.oauth_states
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "oauth_states_delete_own" on public.oauth_states
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- generated_posts: generated LinkedIn post drafts awaiting approval.
-- ---------------------------------------------------------------------------
create table public.generated_posts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  feed_item_id      uuid references public.feed_items (id) on delete set null,
  content           text not null,
  status            text not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected', 'posted', 'failed')),
  linkedin_post_urn text,
  error_message     text,
  approved_at       timestamptz,
  posted_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index generated_posts_user_id_idx on public.generated_posts (user_id);
create index generated_posts_status_idx on public.generated_posts (status);
create index generated_posts_user_id_created_at_idx on public.generated_posts (user_id, created_at);

alter table public.generated_posts enable row level security;

create policy "generated_posts_select_own" on public.generated_posts
  for select using (auth.uid() = user_id);

create policy "generated_posts_insert_own" on public.generated_posts
  for insert with check (auth.uid() = user_id);

create policy "generated_posts_update_own" on public.generated_posts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "generated_posts_delete_own" on public.generated_posts
  for delete using (auth.uid() = user_id);

create trigger generated_posts_set_updated_at
  before update on public.generated_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- content: articles/videos, readable by any authenticated user, writable
-- only by admins (profiles.is_admin = true).
-- ---------------------------------------------------------------------------
create table public.content (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text not null unique,
  body          text,
  video_url     text,
  is_published  boolean not null default false,
  is_premium    boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index content_is_published_idx on public.content (is_published);

alter table public.content enable row level security;

create policy "content_select_authenticated" on public.content
  for select using (auth.role() = 'authenticated');

create policy "content_insert_admin" on public.content
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "content_update_admin" on public.content
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "content_delete_admin" on public.content
  for delete using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create trigger content_set_updated_at
  before update on public.content
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- generation_settings: one row per user controlling post generation.
-- ---------------------------------------------------------------------------
create table public.generation_settings (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  tone                text not null default 'professional',
  language            text not null default 'en',
  posts_per_day       integer not null default 1 check (posts_per_day > 0),
  custom_instructions text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.generation_settings enable row level security;

create policy "generation_settings_select_own" on public.generation_settings
  for select using (auth.uid() = user_id);

create policy "generation_settings_insert_own" on public.generation_settings
  for insert with check (auth.uid() = user_id);

create policy "generation_settings_update_own" on public.generation_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "generation_settings_delete_own" on public.generation_settings
  for delete using (auth.uid() = user_id);

create trigger generation_settings_set_updated_at
  before update on public.generation_settings
  for each row execute function public.set_updated_at();
