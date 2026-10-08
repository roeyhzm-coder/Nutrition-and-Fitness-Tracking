-- Switch the live training block to Block 2 and replace the leftover 69.5 kg seed weigh-in.

update public.app_state
set
  active_program_id = 'program-block-2',
  weight_logs = case
    when coalesce(jsonb_array_length(weight_logs), 0) = 0
      or (
        jsonb_array_length(weight_logs) = 1
        and weight_logs->0->>'id' in (
          'seed-weight-phase1-2026-09-26',
          'seed-weight-phase1-2026-10-01',
          'seed-weight-current'
        )
      )
    then '[{"id":"seed-weight-phase1-2026-10-08","weightKg":71,"bodyFatPct":14,"loggedAt":"2026-10-08T12:00:00","note":"התחלת שלב 1"}]'::jsonb
    else coalesce(weight_logs, '[]'::jsonb)
  end,
  updated_at = now()
where owner_id in ('primary', 'primary_user');

update public.client_app_state
set
  active_program_id = 'program-block-2',
  updated_at = now()
where owner_id in ('primary', 'primary_user')
   or device_id in ('primary', 'primary_user');
