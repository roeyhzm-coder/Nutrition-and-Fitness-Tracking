-- Israeli household food catalog with household portions.
-- Runtime source of truth: src/data/foods/

create extension if not exists pg_trgm;

create table if not exists public.israeli_foods (
  id text primary key,
  name text not null,
  category text not null,
  brand text,
  calories_per_100g numeric not null,
  protein_per_100g numeric not null,
  carbs_per_100g numeric not null,
  fat_per_100g numeric not null,
  portions jsonb not null default '[]'::jsonb,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists israeli_foods_name_trgm
  on public.israeli_foods using gin (name gin_trgm_ops);

create index if not exists israeli_foods_category_idx
  on public.israeli_foods (category);

create index if not exists israeli_foods_brand_trgm
  on public.israeli_foods using gin (brand gin_trgm_ops);

alter table public.israeli_foods enable row level security;

drop policy if exists "israeli_foods_public_read" on public.israeli_foods;
create policy "israeli_foods_public_read"
  on public.israeli_foods for select
  using (true);

drop policy if exists "israeli_foods_system_insert" on public.israeli_foods;
create policy "israeli_foods_system_insert"
  on public.israeli_foods for insert
  with check (is_system = true);

drop policy if exists "israeli_foods_system_update" on public.israeli_foods;
create policy "israeli_foods_system_update"
  on public.israeli_foods for update
  using (is_system = true)
  with check (is_system = true);

drop policy if exists "israeli_foods_custom_insert" on public.israeli_foods;
create policy "israeli_foods_custom_insert"
  on public.israeli_foods for insert
  with check (true);

drop policy if exists "israeli_foods_custom_update" on public.israeli_foods;
create policy "israeli_foods_custom_update"
  on public.israeli_foods for update
  using (is_system = false)
  with check (is_system = false);

grant select, insert, update on public.israeli_foods to anon, authenticated;
