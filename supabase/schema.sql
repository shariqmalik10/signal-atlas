-- Signal Atlas online storage
-- Run in the Supabase SQL editor before configuring .env.local.

create table if not exists public.atlas_links (
  id text primary key,
  title text not null,
  url text not null unique,
  category text not null,
  description text not null default '',
  tags text[] not null default '{}',
  sources jsonb not null default '[]'::jsonb,
  added_by text not null default 'portal' check (added_by in ('collection', 'portal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.atlas_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.atlas_links enable row level security;
alter table public.atlas_admins enable row level security;

create policy "anyone can read atlas links"
on public.atlas_links for select
to anon, authenticated
using (true);

create policy "admins can create atlas links"
on public.atlas_links for insert
to authenticated
with check (exists (select 1 from public.atlas_admins where user_id = auth.uid()));

create policy "admins can update atlas links"
on public.atlas_links for update
to authenticated
using (exists (select 1 from public.atlas_admins where user_id = auth.uid()))
with check (exists (select 1 from public.atlas_admins where user_id = auth.uid()));

create policy "admins can delete atlas links"
on public.atlas_links for delete
to authenticated
using (exists (select 1 from public.atlas_admins where user_id = auth.uid()));

-- After signing in through /manage once, grant yourself admin access:
-- insert into public.atlas_admins (user_id)
-- select id from auth.users where email = 'you@example.com';
