-- Promote the existing PC row into the shared owner and lock the master phase.

insert into public.app_state (
  owner_id,
  phase,
  goal,
  macro_presets,
  user_profile,
  consistency_day_marks,
  weight_logs,
  food_logs,
  activity_logs,
  lifestyle_logs,
  saved_meals,
  food_categories,
  active_program_id,
  workout_programs,
  workout_templates,
  routines,
  focus_tracks,
  updated_at
)
select
  'primary',
  'maintain',
  jsonb_set(
    jsonb_set(
      jsonb_set(coalesce(goal, '{}'::jsonb), '{startDate}', '"2026-09-26"'),
      '{totalDays}',
      '196'
    ),
    '{activePhase}',
    '"maintain"'
  ),
  macro_presets,
  user_profile,
  consistency_day_marks,
  coalesce(weight_logs, '[]'::jsonb),
  coalesce(food_logs, '[]'::jsonb),
  coalesce(activity_logs, '[]'::jsonb),
  coalesce(lifestyle_logs, '{}'::jsonb),
  coalesce(saved_meals, '[]'::jsonb),
  coalesce(food_categories, '[]'::jsonb),
  active_program_id,
  workout_programs,
  workout_templates,
  coalesce(routines, '[]'::jsonb),
  coalesce(focus_tracks, '[]'::jsonb),
  now()
from public.client_app_state
order by updated_at desc
limit 1
on conflict (owner_id) do update
set
  phase = excluded.phase,
  goal = excluded.goal,
  macro_presets = excluded.macro_presets,
  user_profile = excluded.user_profile,
  consistency_day_marks = excluded.consistency_day_marks,
  weight_logs = excluded.weight_logs,
  food_logs = excluded.food_logs,
  activity_logs = excluded.activity_logs,
  lifestyle_logs = excluded.lifestyle_logs,
  saved_meals = excluded.saved_meals,
  food_categories = excluded.food_categories,
  active_program_id = excluded.active_program_id,
  workout_programs = excluded.workout_programs,
  workout_templates = excluded.workout_templates,
  routines = excluded.routines,
  focus_tracks = excluded.focus_tracks,
  updated_at = excluded.updated_at;

insert into public.user_profile (owner_id, profile, phase, goal, macro_presets, updated_at)
select
  owner_id,
  coalesce(user_profile, '{}'::jsonb),
  phase,
  goal,
  macro_presets,
  updated_at
from public.app_state
where owner_id = 'primary'
on conflict (owner_id) do update
set
  profile = excluded.profile,
  phase = excluded.phase,
  goal = excluded.goal,
  macro_presets = excluded.macro_presets,
  updated_at = excluded.updated_at;

insert into public.client_app_state (
  device_id,
  owner_id,
  phase,
  goal,
  macro_presets,
  active_program_id,
  workout_programs,
  workout_templates,
  consistency_day_marks,
  food_categories,
  saved_meals,
  user_profile,
  activity_logs,
  lifestyle_logs,
  food_logs,
  weight_logs,
  routines,
  focus_tracks,
  updated_at
)
select
  'primary',
  owner_id,
  phase,
  goal,
  macro_presets,
  active_program_id,
  workout_programs,
  workout_templates,
  consistency_day_marks,
  food_categories,
  saved_meals,
  user_profile,
  activity_logs,
  lifestyle_logs,
  food_logs,
  weight_logs,
  routines,
  focus_tracks,
  updated_at
from public.app_state
where owner_id = 'primary'
on conflict (device_id) do update
set
  owner_id = excluded.owner_id,
  phase = excluded.phase,
  goal = excluded.goal,
  macro_presets = excluded.macro_presets,
  active_program_id = excluded.active_program_id,
  workout_programs = excluded.workout_programs,
  workout_templates = excluded.workout_templates,
  consistency_day_marks = excluded.consistency_day_marks,
  food_categories = excluded.food_categories,
  saved_meals = excluded.saved_meals,
  user_profile = excluded.user_profile,
  activity_logs = excluded.activity_logs,
  lifestyle_logs = excluded.lifestyle_logs,
  food_logs = excluded.food_logs,
  weight_logs = excluded.weight_logs,
  routines = excluded.routines,
  focus_tracks = excluded.focus_tracks,
  updated_at = excluded.updated_at;

update public.client_app_state
set
  owner_id = 'primary',
  phase = 'maintain',
  goal = jsonb_set(
    jsonb_set(
      jsonb_set(coalesce(goal, '{}'::jsonb), '{startDate}', '"2026-09-26"'),
      '{totalDays}',
      '196'
    ),
    '{activePhase}',
    '"maintain"'
  ),
  updated_at = now();

update public.workout_logs
set owner_id = 'primary'
where owner_id is distinct from 'primary';
