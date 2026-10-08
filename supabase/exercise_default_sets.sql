-- Per-set exercise defaults live inside workout_programs / workout_templates JSON
-- (camelCase `defaultSets`: [{ setNumber, weightKg, reps }, ...]).
-- Legacy exercises with only defaultWeightKg/defaultReps are expanded in place.

create or replace function public.exercise_json_with_default_sets(ex jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  n int;
  existing jsonb;
begin
  if ex is null or jsonb_typeof(ex) <> 'object' then
    return ex;
  end if;
  existing := coalesce(ex->'defaultSets', ex->'default_sets');
  if jsonb_typeof(existing) = 'array' and jsonb_array_length(existing) > 0 then
    if ex ? 'defaultSets' then
      return ex;
    end if;
    return (ex - 'default_sets') || jsonb_build_object('defaultSets', existing);
  end if;
  begin
    n := greatest(1, coalesce(nullif(ex->>'sets', '')::int, 1));
  exception when others then
    n := 1;
  end;
  return ex || jsonb_build_object(
    'defaultSets',
    (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'setNumber', g,
          'weightKg', ex->'defaultWeightKg',
          'reps', ex->'defaultReps'
        ) order by g
      ), '[]'::jsonb)
      from generate_series(1, n) as g
    )
  );
end;
$$;

create or replace function public.map_exercise_array_default_sets(arr jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    jsonb_agg(public.exercise_json_with_default_sets(el) order by ordinality),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(arr, '[]'::jsonb)) with ordinality as t(el, ordinality);
$$;

create or replace function public.session_json_with_default_sets(session jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when session is null or jsonb_typeof(session) <> 'object' then session
    else session || jsonb_build_object(
      'exercises',
      public.map_exercise_array_default_sets(session->'exercises')
    )
  end;
$$;

create or replace function public.day_json_with_default_sets(day jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when day is null or jsonb_typeof(day) <> 'object' then day
    else day || jsonb_build_object(
      'exercises', public.map_exercise_array_default_sets(day->'exercises'),
      'sessions', coalesce(
        (
          select jsonb_agg(public.session_json_with_default_sets(s) order by ordinality)
          from jsonb_array_elements(coalesce(day->'sessions', '[]'::jsonb))
            with ordinality as t(s, ordinality)
        ),
        '[]'::jsonb
      )
    )
  end;
$$;

create or replace function public.program_json_with_default_sets(program jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when program is null or jsonb_typeof(program) <> 'object' then program
    else program || jsonb_build_object(
      'days', coalesce(
        (
          select jsonb_agg(public.day_json_with_default_sets(d) order by ordinality)
          from jsonb_array_elements(coalesce(program->'days', '[]'::jsonb))
            with ordinality as t(d, ordinality)
        ),
        '[]'::jsonb
      )
    )
  end;
$$;

create or replace function public.programs_json_with_default_sets(programs jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    jsonb_agg(public.program_json_with_default_sets(p) order by ordinality),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(programs, '[]'::jsonb)) with ordinality as t(p, ordinality);
$$;

create or replace function public.template_json_with_default_sets(template jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when template is null or jsonb_typeof(template) <> 'object' then template
    else template || jsonb_build_object(
      'exercises', public.map_exercise_array_default_sets(template->'exercises')
    )
  end;
$$;

create or replace function public.templates_json_with_default_sets(templates jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    jsonb_agg(public.template_json_with_default_sets(t) order by ordinality),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(templates, '[]'::jsonb)) with ordinality as t(t, ordinality);
$$;

update public.app_state
set
  workout_programs = public.programs_json_with_default_sets(workout_programs),
  workout_templates = public.templates_json_with_default_sets(workout_templates),
  updated_at = now()
where true;

update public.client_app_state
set
  workout_programs = public.programs_json_with_default_sets(workout_programs),
  workout_templates = public.templates_json_with_default_sets(workout_templates),
  updated_at = now()
where true;
