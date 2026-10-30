-- Bring the PRODUCTION Supabase project (ywrzbdmebqmdnmsiczno, the one Vercel uses)
-- up to the schema the client expects. Paste the whole file into that project's
-- SQL Editor and run it once (it uses DO blocks, so not via run-supabase-sql.mjs).
--
-- Safe to re-run:
--   * schema only — no INSERT/UPDATE/DELETE, so live app_state / user rows are untouched
--     (the seed / align / block-activation migrations are deliberately NOT included);
--   * every table/column/index is IF NOT EXISTS;
--   * existing tables keep their current policies — an owner-scoped policy is added
--     only to a table that has none yet (single-tenant shared owner, anon key, no Auth).

-- ---------------------------------------------------------------- existing state tables
alter table if exists public.app_state
  add column if not exists user_profile jsonb,
  add column if not exists consistency_day_marks jsonb not null default '{}'::jsonb,
  add column if not exists weight_logs jsonb not null default '[]'::jsonb,
  add column if not exists food_logs jsonb not null default '[]'::jsonb,
  add column if not exists activity_logs jsonb not null default '[]'::jsonb,
  add column if not exists lifestyle_logs jsonb not null default '{}'::jsonb,
  add column if not exists saved_meals jsonb not null default '[]'::jsonb,
  add column if not exists recipes jsonb,
  add column if not exists food_categories jsonb not null default '[]'::jsonb,
  add column if not exists workout_templates jsonb not null default '[]'::jsonb,
  add column if not exists routines jsonb not null default '[]'::jsonb,
  add column if not exists focus_tracks jsonb not null default '[]'::jsonb;

alter table if exists public.client_app_state
  add column if not exists workout_templates jsonb not null default '[]'::jsonb,
  add column if not exists consistency_day_marks jsonb not null default '{}'::jsonb,
  add column if not exists food_categories jsonb not null default '[]'::jsonb,
  add column if not exists saved_meals jsonb not null default '[]'::jsonb,
  add column if not exists user_profile jsonb,
  add column if not exists activity_logs jsonb not null default '[]'::jsonb,
  add column if not exists lifestyle_logs jsonb not null default '{}'::jsonb,
  add column if not exists food_logs jsonb not null default '[]'::jsonb,
  add column if not exists routines jsonb not null default '[]'::jsonb,
  add column if not exists focus_tracks jsonb not null default '[]'::jsonb,
  add column if not exists owner_id text not null default 'primary',
  add column if not exists weight_logs jsonb not null default '[]'::jsonb,
  add column if not exists recipes jsonb;

-- ---------------------------------------------------------------- user_profile
create table if not exists public.user_profile (
  owner_id text primary key default 'primary',
  profile jsonb not null default '{}'::jsonb,
  phase text not null default 'maintain' check (phase in ('bulk', 'cut', 'maintain')),
  goal jsonb not null default '{}'::jsonb,
  macro_presets jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_profile
  add column if not exists waist_circumference numeric,
  add column if not exists neck_circumference numeric,
  add column if not exists body_fat_percentage numeric;

alter table public.user_profile drop constraint if exists user_profile_positive_measurements;
alter table public.user_profile
  add constraint user_profile_positive_measurements check (
    (waist_circumference is null or waist_circumference > 0)
    and (neck_circumference is null or neck_circumference > 0)
    and (body_fat_percentage is null or (body_fat_percentage > 0 and body_fat_percentage < 75))
  );

alter table public.user_profile drop constraint if exists user_profile_waist_gt_neck;
alter table public.user_profile
  add constraint user_profile_waist_gt_neck check (
    waist_circumference is null or neck_circumference is null
    or waist_circumference > neck_circumference
  );

-- ---------------------------------------------------------------- body_measurements
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

-- ---------------------------------------------------------------- user_saved_meals
create table if not exists public.user_saved_meals (
  id text primary key,
  user_id text not null default 'primary',
  name text not null,
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fats numeric not null default 0,
  notes text,
  kind text default 'meal',
  serving_grams numeric,
  components jsonb not null default '[]'::jsonb,
  serving_units jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists user_saved_meals_user_idx
  on public.user_saved_meals (user_id, updated_at desc);

-- ---------------------------------------------------------------- workout_logs
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

alter table public.workout_logs
  add column if not exists performed_on date,
  add column if not exists estimated_calories integer,
  add column if not exists owner_id text not null default 'primary';

create index if not exists workout_logs_owner_completed_idx
  on public.workout_logs (owner_id, completed_at);

-- ---------------------------------------------------------------- routines
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

alter table public.routines
  add column if not exists timeframe text not null default 'forever',
  add column if not exists starts_on date,
  add column if not exists ends_on date,
  add column if not exists duration_days integer,
  add column if not exists archived_at timestamptz;

-- ---------------------------------------------------------------- phases_history
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

-- ---------------------------------------------------------------- exercise_defaults (+ notes)
create table if not exists public.exercise_defaults (
  owner_id text not null default 'primary',
  exercise_key text not null,
  exercise_name text not null,
  metric text not null default 'reps' check (metric in ('reps', 'seconds')),
  sets integer not null default 1 check (sets between 1 and 20),
  default_sets jsonb not null default '[]'::jsonb check (jsonb_typeof(default_sets) = 'array'),
  updated_at timestamptz not null default now(),
  primary key (owner_id, exercise_key)
);

create index if not exists exercise_defaults_owner_updated_idx
  on public.exercise_defaults (owner_id, updated_at desc);

alter table public.exercise_defaults
  add column if not exists notes text,
  add column if not exists notes_updated_at timestamptz;

alter table public.exercise_defaults drop constraint if exists exercise_defaults_notes_length;
alter table public.exercise_defaults
  add constraint exercise_defaults_notes_length
  check (notes is null or char_length(notes) <= 2000);

-- ---------------------------------------------------------------- fitness_tips
create table if not exists public.fitness_tips (
  owner_id text primary key default 'primary',
  categories jsonb not null default '[]'::jsonb check (jsonb_typeof(categories) = 'array'),
  updated_at timestamptz not null default now(),
  constraint fitness_tips_size check (pg_column_size(categories) <= 512000)
);

-- ---------------------------------------------------------------- RLS, grants, realtime
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('user_profile', 'owner_id'),
      ('body_measurements', 'user_id'),
      ('user_saved_meals', 'user_id'),
      ('workout_logs', 'owner_id'),
      ('routines', 'device_id'),
      ('phases_history', 'device_id'),
      ('exercise_defaults', 'owner_id'),
      ('fitness_tips', 'owner_id')
    ) as v(tbl, owner_col)
  loop
    execute format('alter table public.%I enable row level security', t.tbl);
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = t.tbl
    ) then
      execute format(
        'create policy %I on public.%I for all using (%I in (''primary'', ''primary_user'')) with check (%I in (''primary'', ''primary_user''))',
        t.tbl || '_owner', t.tbl, t.owner_col, t.owner_col
      );
    end if;
    execute format(
      'grant select, insert, update, delete on public.%I to anon, authenticated', t.tbl
    );
  end loop;
end $$;

alter table public.exercise_defaults replica identity full;
alter table public.fitness_tips replica identity full;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['exercise_defaults', 'fitness_tips'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
