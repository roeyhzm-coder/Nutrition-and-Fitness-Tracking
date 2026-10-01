-- Permanent workout history (device-scoped, like phases_history)
-- Run in Supabase SQL editor. No row cap / TTL — every completed workout is kept.

create table if not exists public.workout_logs (
  id text primary key,
  device_id text not null,
  program_id text not null default '',
  program_name text not null default '',
  block_number integer,
  day_id text not null default '',
  day_number integer not null default 1,
  workout_name text not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workout_logs_device_completed_idx
  on public.workout_logs (device_id, completed_at);

alter table public.workout_logs enable row level security;

drop policy if exists "workout_logs_all" on public.workout_logs;
create policy "workout_logs_all"
  on public.workout_logs for all
  using (true)
  with check (true);
