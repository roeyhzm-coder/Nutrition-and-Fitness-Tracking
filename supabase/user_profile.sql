-- Shared user profile + current phase/goals (companion to app_state)

create table if not exists public.user_profile (
  owner_id text primary key default 'primary',
  profile jsonb not null default '{}'::jsonb,
  phase text not null default 'maintain'
    check (phase in ('bulk', 'cut', 'maintain')),
  goal jsonb not null default '{}'::jsonb,
  macro_presets jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_profile enable row level security;

drop policy if exists "user_profile_all" on public.user_profile;
create policy "user_profile_all"
  on public.user_profile for all
  using (true)
  with check (true);
