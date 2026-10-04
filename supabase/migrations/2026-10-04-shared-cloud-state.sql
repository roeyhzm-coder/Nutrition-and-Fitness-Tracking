-- Shared cloud owner for dashboard / tracker / nutrition state.
-- Devices no longer keep isolated copies keyed only by device_id.

alter table public.client_app_state
  add column if not exists owner_id text not null default 'primary';

alter table public.client_app_state
  add column if not exists weight_logs jsonb not null default '[]'::jsonb;

alter table public.workout_logs
  add column if not exists owner_id text not null default 'primary';

create index if not exists workout_logs_owner_completed_idx
  on public.workout_logs (owner_id, completed_at);

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

create table if not exists public.user_profile (
  owner_id text primary key default 'primary',
  profile jsonb not null default '{}'::jsonb,
  phase text not null default 'maintain'
    check (phase in ('bulk', 'cut', 'maintain')),
  goal jsonb not null default '{}'::jsonb,
  macro_presets jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_profile enable row level security;

drop policy if exists "user_profile_all" on public.user_profile;
create policy "user_profile_all"
  on public.user_profile for all
  using (true)
  with check (true);
