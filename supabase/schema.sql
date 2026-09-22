-- PulsePlan schema — Training & Nutrition tracking
-- Run in Supabase SQL editor

create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'he',
  calorie_target integer not null default 2400,
  protein_target integer not null default 180,
  carbs_target integer not null default 220,
  fats_target integer not null default 70,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workout set logs
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day_id text not null,
  exercise_id text not null,
  exercise_name text not null,
  weight_kg numeric(6, 2) not null check (weight_kg >= 0),
  reps integer not null check (reps > 0),
  rpe numeric(3, 1) check (rpe is null or (rpe >= 1 and rpe <= 10)),
  is_key_lift boolean not null default false,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists workouts_user_logged_at_idx
  on public.workouts (user_id, logged_at desc);

create index if not exists workouts_user_exercise_idx
  on public.workouts (user_id, exercise_id, logged_at desc);

-- Daily body weight
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  weight_kg numeric(5, 2) not null check (weight_kg > 0),
  note text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists weight_logs_user_logged_at_idx
  on public.weight_logs (user_id, logged_at desc);

-- Food diary entries
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  grams numeric(8, 2) not null default 0,
  calories numeric(8, 2) not null default 0,
  protein numeric(8, 2) not null default 0,
  carbs numeric(8, 2) not null default 0,
  fats numeric(8, 2) not null default 0,
  source text not null check (source in ('openfoodfacts', 'manual', 'recipe')),
  external_code text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists food_logs_user_logged_at_idx
  on public.food_logs (user_id, logged_at desc);

-- Recipe catalog (shared or user-owned)
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  appliance text not null check (
    appliance in ('ninja-grill', 'air-fryer', 'ninja-creami')
  ),
  protein_g numeric(6, 2) not null,
  calories numeric(8, 2) not null,
  carbs_g numeric(6, 2) not null default 0,
  fats_g numeric(6, 2) not null default 0,
  time_min integer,
  tags text[] not null default '{}',
  ingredients text[] not null default '{}',
  steps text[] not null default '{}',
  excludes_fish boolean not null default true,
  excludes_mustard boolean not null default true,
  excludes_deli_meats boolean not null default true,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_appliance_idx
  on public.recipes (appliance);

-- Habit completions (optional companion table)
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  habit_item_id text not null,
  completed_on date not null default (timezone('utc', now()))::date,
  created_at timestamptz not null default now(),
  unique (user_id, habit_item_id, completed_on)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.weight_logs enable row level security;
alter table public.food_logs enable row level security;
alter table public.recipes enable row level security;
alter table public.habit_logs enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "workouts_all_own"
  on public.workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "weight_logs_all_own"
  on public.weight_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "food_logs_all_own"
  on public.food_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "recipes_select_public_or_own"
  on public.recipes for select
  using (is_public or auth.uid() = user_id);

create policy "recipes_write_own"
  on public.recipes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "habit_logs_all_own"
  on public.habit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
