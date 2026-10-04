-- Mobile is the master record: bulk phase 1, start 2026-10-01, 69.5 kg, empty week 1.

update public.app_state
set
  phase = 'bulk',
  goal = coalesce(goal, '{}'::jsonb)
    || jsonb_build_object(
      'startDate', '2026-10-01',
      'totalDays', 196,
      'activePhase', 'bulk',
      'phaseName', 'מסה מבוססת הרגלים',
      'phaseNumber', 1,
      'totalPhases', 6,
      'startWeightKg', 69.5,
      'targetWeightKg', 75.5,
      'targetBodyFatPct', 15,
      'weeklyWorkoutTarget', 5
    ),
  user_profile = jsonb_set(
    coalesce(user_profile, '{}'::jsonb),
    '{startWeightKg}',
    '69.5'
  ),
  consistency_day_marks = '{}'::jsonb,
  weight_logs = '[{"id":"seed-weight-phase1-2026-10-01","weightKg":69.5,"bodyFatPct":14,"loggedAt":"2026-10-01T12:00:00","note":"התחלת שלב 1"}]'::jsonb,
  updated_at = now()
where owner_id = 'primary';

update public.user_profile
set
  phase = 'bulk',
  goal = coalesce(goal, '{}'::jsonb)
    || jsonb_build_object(
      'startDate', '2026-10-01',
      'totalDays', 196,
      'activePhase', 'bulk',
      'phaseName', 'מסה מבוססת הרגלים',
      'phaseNumber', 1,
      'totalPhases', 6,
      'startWeightKg', 69.5,
      'targetWeightKg', 75.5,
      'targetBodyFatPct', 15,
      'weeklyWorkoutTarget', 5
    ),
  profile = jsonb_set(coalesce(profile, '{}'::jsonb), '{startWeightKg}', '69.5'),
  updated_at = now()
where owner_id = 'primary';

update public.client_app_state
set
  owner_id = 'primary',
  phase = 'bulk',
  goal = coalesce(goal, '{}'::jsonb)
    || jsonb_build_object(
      'startDate', '2026-10-01',
      'totalDays', 196,
      'activePhase', 'bulk',
      'phaseName', 'מסה מבוססת הרגלים',
      'phaseNumber', 1,
      'totalPhases', 6,
      'startWeightKg', 69.5,
      'targetWeightKg', 75.5,
      'targetBodyFatPct', 15,
      'weeklyWorkoutTarget', 5
    ),
  user_profile = jsonb_set(
    coalesce(user_profile, '{}'::jsonb),
    '{startWeightKg}',
    '69.5'
  ),
  consistency_day_marks = '{}'::jsonb,
  weight_logs = '[{"id":"seed-weight-phase1-2026-10-01","weightKg":69.5,"bodyFatPct":14,"loggedAt":"2026-10-01T12:00:00","note":"התחלת שלב 1"}]'::jsonb,
  updated_at = now();
