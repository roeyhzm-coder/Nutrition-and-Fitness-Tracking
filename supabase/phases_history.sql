-- Completed phase history (device-scoped, like client_app_state)
-- Run in Supabase SQL editor

create table if not exists public.phases_history (
  id text primary key,
  device_id text not null,
  phase text not null check (phase in ('bulk', 'cut', 'maintain')),
  start_date date not null,
  end_date date not null,
  planned_days integer not null,
  actual_days integer not null,
  start_weight_kg numeric(5, 2),
  end_weight_kg numeric(5, 2),
  avg_calories numeric(8, 2),
  target_weight_kg numeric(5, 2),
  macro_targets jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists phases_history_device_idx
  on public.phases_history (device_id, start_date);

alter table public.phases_history enable row level security;

drop policy if exists "phases_history_all" on public.phases_history;
create policy "phases_history_all"
  on public.phases_history for all
  using (true)
  with check (true);
