-- Supabase schema & RLS setup
create extension if not exists "pgcrypto";

create table if not exists public.lesson_registrations (
  id uuid primary key default gen_random_uuid(),
  lesson_slug text not null,
  name text not null,
  email text not null,
  created_at timestamptz default now()
);

-- Unique constraint to prevent duplicate signups per email per lesson
create unique index if not exists lesson_registrations_unique on public.lesson_registrations(lesson_slug, lower(email));

alter table public.lesson_registrations enable row level security;

-- View for public counts (no PII)
create or replace view public.lesson_registrations_counts as
select lesson_slug, count(*)::int as registrations
from public.lesson_registrations
group by lesson_slug;

grant select on public.lesson_registrations_counts to anon;

create or replace function public.is_admin() returns boolean language sql stable as $$
  select coalesce( (
    current_setting('request.jwt.claims', true)::json -> 'app_metadata' -> 'roles'
  ) ? 'admin', false);
$$;

-- Insert allowed for anyone
create policy if not exists anon_insert_registration on public.lesson_registrations for insert with check (true);
-- Select only for admin
create policy if not exists admin_select_registrations on public.lesson_registrations for select using ( public.is_admin() );

-- Logging table for function attempts (optional)
create table if not exists public.function_logs (
  id bigserial primary key,
  fn text not null,
  slug text,
  ip text,
  ok boolean,
  created_at timestamptz default now()
);
alter table public.function_logs enable row level security;
-- Allow service role (bypass RLS) insert; create explicit admin select policy
create policy if not exists admin_select_function_logs on public.function_logs for select using ( public.is_admin() );
-- (No public insert policy; only service key will be able to insert bypassing RLS)

-- Optional: you can create a lessons_public view if you sync lesson front matter into the DB.
-- Example (adjust to your ingestion pipeline):
-- Lessons authoritative table (ingested from repo via automation or manual SQL)
create table if not exists public.lessons (
  slug text primary key,
  title text not null,
  capacity int check (capacity >= 0),
  date timestamptz,
  location text,
  created_at timestamptz default now()
);
alter table public.lessons enable row level security;
-- Public can read limited lesson data
create policy if not exists anon_select_lessons on public.lessons for select using (true);

-- Public safe view (only necessary fields)
create or replace view public.lessons_public as
  select slug, capacity, date from public.lessons;
grant select on public.lessons_public to anon;

-- (Optional) we could add a trigger to ensure capacity not null; for now allow null meaning unlimited.

-- Index to speed counts per lesson slug
create index if not exists lesson_registrations_slug_idx on public.lesson_registrations(lesson_slug);

-- Email hash column for privacy-aware operations (store lowercase SHA256)
alter table public.lesson_registrations add column if not exists email_hash text;

-- Backfill email_hash where missing (idempotent)
update public.lesson_registrations
  set email_hash = encode(digest(lower(email), 'sha256'),'hex')
  where email_hash is null;

-- New unique constraint based on hash (kept alongside legacy one for transition)
create unique index if not exists lesson_registrations_unique_hash on public.lesson_registrations(lesson_slug, email_hash) where email_hash is not null;
