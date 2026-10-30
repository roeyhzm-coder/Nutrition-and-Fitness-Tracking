-- "כושר דגשים" tab: user-editable training tips, grouped in categories.
-- One JSON document per owner (categories -> items), last-write-wins by updated_at.
-- The app is single-tenant (shared owner 'primary', anon key, no Supabase Auth),
-- so RLS scopes rows to the shared owner aliases rather than auth.uid(),
-- matching exercise_defaults.

create table if not exists public.fitness_tips (
  owner_id text primary key default 'primary',
  categories jsonb not null default '[]'::jsonb check (jsonb_typeof(categories) = 'array'),
  updated_at timestamptz not null default now(),
  constraint fitness_tips_size check (pg_column_size(categories) <= 512000)
);

alter table public.fitness_tips enable row level security;

drop policy if exists "fitness_tips_owner" on public.fitness_tips;

create policy "fitness_tips_owner"
  on public.fitness_tips for all
  using (owner_id in ('primary', 'primary_user'))
  with check (owner_id in ('primary', 'primary_user'));

grant select, insert, update, delete on public.fitness_tips to anon, authenticated;

alter table public.fitness_tips replica identity full;

alter publication supabase_realtime add table public.fitness_tips;

notify pgrst, 'reload schema';
