-- Historical body measurements. Current snapshot stays on user_profile.
-- One row per save so monthly trends survive profile overwrites.

create table if not exists public.body_measurements (
  id text primary key,
  user_id text not null default 'primary',
  recorded_at timestamptz not null default now(),
  weight numeric,
  waist_circumference numeric,
  neck_circumference numeric,
  body_fat_percentage numeric
);

create index if not exists body_measurements_user_recorded_idx
  on public.body_measurements (user_id, recorded_at desc);

alter table public.body_measurements enable row level security;

drop policy if exists "body_measurements_all" on public.body_measurements;
create policy "body_measurements_all"
  on public.body_measurements for all
  using (true)
  with check (true);
