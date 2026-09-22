-- Live recipes catalog (matches production Supabase project)
-- Columns observed in project ywrzbdmebqmdnmsiczno

create table if not exists public.recipes (
  id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  title text not null,
  image text,
  categories text[] not null default '{}',
  equipment text[] not null default '{}',
  ingredients jsonb not null default '[]'::jsonb,
  steps text[] not null default '{}',
  macros jsonb not null default '{}'::jsonb,
  rating numeric,
  base_servings integer default 1,
  favorite boolean not null default false,
  created_at_ms bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipes enable row level security;

-- Public read for anonymous catalog browsing (adjust if you need auth-only)
drop policy if exists "recipes_public_read" on public.recipes;
create policy "recipes_public_read"
  on public.recipes for select
  using (true);
