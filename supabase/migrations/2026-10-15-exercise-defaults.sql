-- Per-exercise defaults (sets, per-set kg, per-set reps/seconds, metric).
-- One row per exercise name, upserted individually so a stale device pushing the
-- whole workout_programs JSON blob can no longer wipe a saved default.
-- The app is single-tenant (shared owner 'primary', anon key, no Supabase Auth),
-- so RLS scopes rows to the shared owner aliases rather than auth.uid().

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

alter table public.exercise_defaults enable row level security;

drop policy if exists "exercise_defaults_owner" on public.exercise_defaults;
create policy "exercise_defaults_owner"
  on public.exercise_defaults for all
  using (owner_id in ('primary', 'primary_user'))
  with check (owner_id in ('primary', 'primary_user'));

grant select, insert, update, delete on public.exercise_defaults to anon, authenticated;

alter table public.exercise_defaults replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'exercise_defaults'
  ) then
    alter publication supabase_realtime add table public.exercise_defaults;
  end if;
end $$;
