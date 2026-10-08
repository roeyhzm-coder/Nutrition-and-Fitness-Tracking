-- Recalibrate Phase 1 / Master Plan targets. Do not touch food logs, meals, or workout history.

update public.app_state
set
  phase = 'bulk',
  goal = coalesce(goal, '{}'::jsonb) || jsonb_build_object(
    'startDate', '2026-10-08',
    'totalDays', 210,
    'activePhase', 'bulk',
    'phaseName', 'מסה נקייה ומואצת',
    'phaseNumber', 1,
    'totalPhases', 3,
    'startWeightKg', 71,
    'targetWeightKg', 77,
    'targetBodyFatPct', 15,
    'weeklyWorkoutTarget', 5,
    'masterStartDate', '2026-10-08',
    'masterTotalDays', 480,
    'masterTargetWeightKg', 80,
    'masterTargetBodyFatPct', 9,
    'masterName', 'גוף אל יווני'
  ),
  macro_presets = jsonb_set(
    coalesce(macro_presets, '{}'::jsonb),
    '{bulk}',
    '{"calories":2650,"protein":160,"carbs":330,"fats":70}'::jsonb
  ),
  updated_at = now()
where owner_id in ('primary', 'primary_user');

update public.user_profile
set
  phase = 'bulk',
  goal = coalesce(goal, '{}'::jsonb) || jsonb_build_object(
    'startDate', '2026-10-08',
    'totalDays', 210,
    'activePhase', 'bulk',
    'phaseName', 'מסה נקייה ומואצת',
    'phaseNumber', 1,
    'totalPhases', 3,
    'startWeightKg', 71,
    'targetWeightKg', 77,
    'targetBodyFatPct', 15,
    'weeklyWorkoutTarget', 5,
    'masterStartDate', '2026-10-08',
    'masterTotalDays', 480,
    'masterTargetWeightKg', 80,
    'masterTargetBodyFatPct', 9,
    'masterName', 'גוף אל יווני'
  ),
  macro_presets = jsonb_set(
    coalesce(macro_presets, '{}'::jsonb),
    '{bulk}',
    '{"calories":2650,"protein":160,"carbs":330,"fats":70}'::jsonb
  ),
  updated_at = now()
where owner_id in ('primary', 'primary_user');

update public.client_app_state
set
  phase = 'bulk',
  goal = coalesce(goal, '{}'::jsonb) || jsonb_build_object(
    'startDate', '2026-10-08',
    'totalDays', 210,
    'activePhase', 'bulk',
    'phaseName', 'מסה נקייה ומואצת',
    'phaseNumber', 1,
    'totalPhases', 3,
    'startWeightKg', 71,
    'targetWeightKg', 77,
    'targetBodyFatPct', 15,
    'weeklyWorkoutTarget', 5,
    'masterStartDate', '2026-10-08',
    'masterTotalDays', 480,
    'masterTargetWeightKg', 80,
    'masterTargetBodyFatPct', 9,
    'masterName', 'גוף אל יווני'
  ),
  macro_presets = jsonb_set(
    coalesce(macro_presets, '{}'::jsonb),
    '{bulk}',
    '{"calories":2650,"protein":160,"carbs":330,"fats":70}'::jsonb
  ),
  updated_at = now()
where owner_id in ('primary', 'primary_user')
   or device_id in ('primary', 'primary_user');
