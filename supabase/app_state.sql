-- Shared singleton app state (all devices read/write the same owner row)
-- Source of truth for dashboard phase, goals, nutrition targets, and tracker marks.

create table if not exists public.app_state (
  owner_id text primary key default 'primary',
  phase text not null check (phase in ('bulk', 'cut', 'maintain')),
  goal jsonb not null default '{}'::jsonb,
  macro_presets jsonb not null default '{}'::jsonb,
  user_profile jsonb,
  consistency_day_marks jsonb not null default '{}'::jsonb,
  weight_logs jsonb not null default '[]'::jsonb,
  food_logs jsonb not null default '[]'::jsonb,
  activity_logs jsonb not null default '[]'::jsonb,
  lifestyle_logs jsonb not null default '{}'::jsonb,
  saved_meals jsonb not null default '[]'::jsonb,
  recipes jsonb,
  food_categories jsonb not null default '[]'::jsonb,
  active_program_id text,
  workout_programs jsonb not null default '[]'::jsonb,
  workout_templates jsonb not null default '[]'::jsonb,
  routines jsonb not null default '[]'::jsonb,
  focus_tracks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "app_state_all" on public.app_state;
create policy "app_state_all"
  on public.app_state for all
  using (true)
  with check (true);
