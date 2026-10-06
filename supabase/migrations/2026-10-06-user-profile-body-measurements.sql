-- Dedicated measurement columns on user_profile (no duplicate tables).
-- Body fat is stored as the Navy-formula result from waist and neck.
-- Height stays inside the existing profile JSON (single source of truth).

alter table public.user_profile
  add column if not exists waist_circumference numeric,
  add column if not exists neck_circumference numeric,
  add column if not exists body_fat_percentage numeric;

alter table public.user_profile
  drop constraint if exists user_profile_positive_measurements;
alter table public.user_profile
  add constraint user_profile_positive_measurements
  check (
    (waist_circumference is null or waist_circumference > 0)
    and (neck_circumference is null or neck_circumference > 0)
    and (
      body_fat_percentage is null
      or (body_fat_percentage > 0 and body_fat_percentage < 75)
    )
  );

alter table public.user_profile
  drop constraint if exists user_profile_waist_gt_neck;
alter table public.user_profile
  add constraint user_profile_waist_gt_neck
  check (
    waist_circumference is null
    or neck_circumference is null
    or waist_circumference > neck_circumference
  );

update public.user_profile
set
  waist_circumference = coalesce(
    waist_circumference,
    nullif(profile ->> 'waistCircumferenceCm', '')::numeric
  ),
  neck_circumference = coalesce(
    neck_circumference,
    nullif(profile ->> 'neckCircumferenceCm', '')::numeric
  ),
  body_fat_percentage = coalesce(
    body_fat_percentage,
    nullif(profile ->> 'estimatedBodyFatPct', '')::numeric
  );
