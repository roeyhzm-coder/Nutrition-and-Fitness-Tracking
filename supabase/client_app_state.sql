-- Device-scoped app state for goals, phase macros, and workout presets
-- Run in Supabase SQL editor for project sync

create table if not exists public.client_app_state (
  device_id text primary key,
  phase text not null check (phase in ('bulk', 'cut')),
  goal jsonb not null default '{}'::jsonb,
  macro_presets jsonb not null default '{}'::jsonb,
  active_program_id text,
  workout_programs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.client_app_state enable row level security;

drop policy if exists "client_app_state_all" on public.client_app_state;
create policy "client_app_state_all"
  on public.client_app_state for all
  using (true)
  with check (true);
