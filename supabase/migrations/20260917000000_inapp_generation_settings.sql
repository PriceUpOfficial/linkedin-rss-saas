-- Supports running the generation pipeline directly from the app (no more
-- n8n dependency for the single-tenant demo): per-user schedule and an
-- image-generation toggle, both driven by dropdowns in /dashboard/settings.

alter table public.generation_settings
  add column schedule_hours integer[] not null default '{9}',
  add column generate_image boolean not null default true;

comment on column public.generation_settings.schedule_hours is
  'UTC hours (0-23) at which the hourly cron should generate a post for this user.';
