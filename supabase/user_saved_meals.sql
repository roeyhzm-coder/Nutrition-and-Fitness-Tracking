-- Durable "הקבועים שלי" rows, keyed by the shared owner id (text), not auth.users.
-- App state JSONB is still written as a backup; this table is the source of truth.

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

alter table public.user_saved_meals enable row level security;

drop policy if exists "user_saved_meals_all" on public.user_saved_meals;
create policy "user_saved_meals_all"
  on public.user_saved_meals for all
  using (true)
  with check (true);

notify pgrst, 'reload schema';
