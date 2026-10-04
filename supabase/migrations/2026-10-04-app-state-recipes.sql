-- Persist user recipes alongside saved meals so catalog deletes stay gone.

alter table public.app_state
  add column if not exists recipes jsonb;

alter table public.client_app_state
  add column if not exists recipes jsonb;
