-- Per-exercise notes (coaching cues), name-keyed alongside the saved set defaults.
-- Notes have their own timestamp so a note edit and a "save as default" on
-- another device never overwrite each other. A row created by a note save keeps
-- default_sets = '[]' and the client treats it as note-only.
-- RLS: the existing "exercise_defaults_owner" policy (shared owner aliases) covers these columns.

alter table public.exercise_defaults
  add column if not exists notes text,
  add column if not exists notes_updated_at timestamptz;

alter table public.exercise_defaults
  drop constraint if exists exercise_defaults_notes_length;

alter table public.exercise_defaults
  add constraint exercise_defaults_notes_length
  check (notes is null or char_length(notes) <= 2000);

notify pgrst, 'reload schema';
