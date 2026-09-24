-- Device-scoped app state for goals, phase macros, workout presets & templates
-- Run in Supabase SQL editor for project sync

create table if not exists public.client_app_state (
  device_id text primary key,
  phase text not null check (phase in ('bulk', 'cut')),
  goal jsonb not null default '{}'::jsonb,
  macro_presets jsonb not null default '{}'::jsonb,
  active_program_id text,
  workout_programs jsonb not null default '[]'::jsonb,
  workout_templates jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.client_app_state
  add column if not exists workout_templates jsonb not null default '[]'::jsonb;

alter table public.client_app_state
  add column if not exists consistency_day_marks jsonb not null default '{}'::jsonb;

alter table public.client_app_state
  add column if not exists food_categories jsonb not null default '[]'::jsonb;

alter table public.client_app_state
  add column if not exists saved_meals jsonb not null default '[]'::jsonb;

alter table public.client_app_state
  add column if not exists user_profile jsonb;

alter table public.client_app_state
  add column if not exists activity_logs jsonb not null default '[]'::jsonb;

alter table public.client_app_state
  add column if not exists lifestyle_logs jsonb not null default '{}'::jsonb;

alter table public.client_app_state
  add column if not exists food_logs jsonb not null default '[]'::jsonb;

alter table public.client_app_state enable row level security;

drop policy if exists "client_app_state_all" on public.client_app_state;
create policy "client_app_state_all"
  on public.client_app_state for all
  using (true)
  with check (true);
