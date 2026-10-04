-- Standard household serving units used by the meal composer.
-- Runtime fallback lives in src/lib/servingPresets.ts (LOCAL_SERVING_PRESET_ROWS).

create table if not exists public.food_serving_presets (
  id text primary key,
  family text not null,
  label text not null,
  grams numeric not null check (grams > 0),
  match_aliases text[] not null default '{}',
  sort_order integer not null default 0
);

alter table public.food_serving_presets enable row level security;

drop policy if exists "food_serving_presets_public_read" on public.food_serving_presets;
create policy "food_serving_presets_public_read"
  on public.food_serving_presets for select
  using (true);

grant select on public.food_serving_presets to anon, authenticated;

insert into public.food_serving_presets (id, family, label, grams, match_aliases, sort_order)
values
  ('dairy-tub-full', 'dairy_tub', 'גביע שלם (250 גרם)', 250, array['קוטג','cottage','יוגורט','גביע','גבינה לבנה'], 10),
  ('dairy-tub-half', 'dairy_tub', 'חצי גביע (125 גרם)', 125, array['קוטג','cottage','יוגורט','גביע','גבינה לבנה'], 20),
  ('dairy-tub-tbsp', 'dairy_tub', 'כף (30 גרם)', 30, array['קוטג','cottage','יוגורט','גביע','גבינה לבנה'], 30),
  ('bread-slice', 'bread', 'פרוסה (30 גרם)', 30, array['לחם','פרוסה','חלה','bread','toast'], 10),
  ('bread-two-slices', 'bread', '2 פרוסות (60 גרם)', 60, array['לחם','פרוסה','חלה','bread','toast'], 20),
  ('egg-l', 'egg', 'יחידה L (60 גרם)', 60, array['ביצה','ביצים','egg'], 10),
  ('egg-m', 'egg', 'יחידה M (50 גרם)', 50, array['ביצה','ביצים','egg'], 20),
  ('scoop-25', 'scoop', 'סקופ (25 גרם)', 25, array['אבקת','חלבון','whey','oats','שיבולת','סקופ'], 10),
  ('scoop-30', 'scoop', 'סקופ (30 גרם)', 30, array['אבקת','חלבון','whey','oats','שיבולת','סקופ'], 20),
  ('unit-1', 'unit', 'יחידה', 1, array[]::text[], 10),
  ('spoon-tbsp', 'spoon', 'כף (15 גרם)', 15, array['שמן','זית','טחינה','חמאת','מיונז','כף'], 10),
  ('spoon-tsp', 'spoon', 'כפית (5 גרם)', 5, array['שמן','זית','טחינה','חמאת','מיונז','כפית'], 20),
  ('general-scoop-25', 'general', 'סקופ (25 גרם)', 25, array[]::text[], 10),
  ('general-scoop-30', 'general', 'סקופ (30 גרם)', 30, array[]::text[], 20),
  ('general-unit', 'general', 'יחידה', 1, array[]::text[], 30),
  ('general-tbsp', 'general', 'כף (15 גרם)', 15, array[]::text[], 40),
  ('general-tsp', 'general', 'כפית (5 גרם)', 5, array[]::text[], 50)
on conflict (id) do update
set
  family = excluded.family,
  label = excluded.label,
  grams = excluded.grams,
  match_aliases = excluded.match_aliases,
  sort_order = excluded.sort_order;
