-- Routines & habits tracker (device-scoped)
-- Run in Supabase SQL editor

create table if not exists public.routines (
  id text primary key,
  device_id text not null,
  title text not null,
  target_minutes integer not null default 30,
  weekly_target_days integer not null default 4,
  time_of_day text not null default 'anytime',
  completed_dates jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists routines_device_idx
  on public.routines (device_id, created_at);

alter table public.routines enable row level security;

drop policy if exists "routines_all" on public.routines;
create policy "routines_all"
  on public.routines for all
  using (true)
  with check (true);

alter table public.client_app_state
  add column if not exists routines jsonb not null default '[]'::jsonb;
