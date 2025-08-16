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
