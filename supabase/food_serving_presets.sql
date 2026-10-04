-- Standard household serving units used by the meal composer.
-- Runtime source of truth: src/lib/servingUnits.ts

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
  ('dairy-tub-full', 'dairy_tub', 'גביע שלם (250g)', 250, array['קוטג','cottage','יוגורט','גביע','גבינה לבנה'], 10),
  ('dairy-tub-half', 'dairy_tub', 'חצי גביע (125g)', 125, array['קוטג','cottage','יוגורט','גביע','גבינה לבנה'], 20),
  ('dairy-heaped-tbsp', 'dairy_tub', 'כף גדושה (30g)', 30, array['קוטג','cottage','יוגורט','גביע','גבינה'], 30),
  ('bread-slice', 'bread', 'פרוסה (30g)', 30, array['לחם','פרוסה','חלה','bread','toast'], 10),
  ('bread-pita', 'bread', 'פיתה (100g)', 100, array['פיתה','pita'], 20),
  ('bread-bun', 'bread', 'לחמניה (80g)', 80, array['לחמניה','לחמני','bun','roll'], 30),
  ('egg-l', 'egg', 'יחידה L (60g)', 60, array['ביצה','ביצים','egg'], 10),
  ('egg-m', 'egg', 'יחידה M (50g)', 50, array['ביצה','ביצים','egg'], 20),
  ('scoop-25', 'scoop', 'סקופ (25g)', 25, array['אבקת','חלבון','whey','oats','שיבולת','סקופ'], 10),
  ('scoop-30', 'scoop', 'סקופ (30g)', 30, array['אבקת','חלבון','whey','oats','שיבולת','סקופ'], 20),
  ('snack-small', 'snack_bag', 'שקית קטנה (25g)', 25, array['במבה','ביסלי','bamba','bisli','שקית'], 10),
  ('snack-large', 'snack_bag', 'שקית גדולה (80g)', 80, array['במבה','ביסלי','bamba','bisli','שקית'], 20),
  ('snack-mega', 'snack_bag', 'שקית ענק (100g)', 100, array['במבה','ביסלי','bamba','bisli','שקית'], 30),
  ('can-drained', 'canned', 'קופסה מסוננת (112g)', 112, array['טונה','tuna','קופסה'], 10),
  ('can-full', 'canned', 'קופסה מלאה (160g)', 160, array['טונה','tuna','קופסה'], 20),
  ('produce-banana', 'produce', 'יחידה בינונית (100g)', 100, array['בננה','banana'], 10),
  ('spoon-tbsp', 'spoon', 'כף (15g)', 15, array['שמן','זית','טחינה','חמאת','מיונז','כף'], 10),
  ('spoon-tsp', 'spoon', 'כפית (5g)', 5, array['שמן','זית','טחינה','חמאת','מיונז','כפית'], 20),
  ('fallback-gram', 'general', 'גרם (1g)', 1, array[]::text[], 10),
  ('fallback-tbsp', 'general', 'כף (15g)', 15, array[]::text[], 20),
  ('fallback-tsp', 'general', 'כפית (5g)', 5, array[]::text[], 30),
  ('fallback-portion', 'general', 'מנה (100g)', 100, array[]::text[], 40)
on conflict (id) do update
set
  family = excluded.family,
  label = excluded.label,
  grams = excluded.grams,
  match_aliases = excluded.match_aliases,
  sort_order = excluded.sort_order;
