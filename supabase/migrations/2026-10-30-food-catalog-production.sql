-- Food catalog for the PRODUCTION project (ywrzbdmebqmdnmsiczno).
-- Run once in https://supabase.com/dashboard/project/ywrzbdmebqmdnmsiczno/sql/new
-- Schema mirrors supabase/israeli_foods.sql + supabase/food_serving_presets.sql.
-- Rows were exported read-only on 2026-10-30 from the dev project (cpgosfbtsxcjvfxkyhsk):
-- This file: both catalog schemas + the 30 food_serving_presets rows (anon cannot insert presets).
-- The 1023 israeli_foods rows are loaded afterwards over the REST API with the anon key
-- (allowed by israeli_foods_system_insert: is_system = true) from the same export.
-- Only touches these two catalog tables; ON CONFLICT DO NOTHING, safe to re-run.

create extension if not exists pg_trgm;

create table if not exists public.israeli_foods (
  id text primary key,
  name text not null,
  category text not null,
  brand text,
  calories_per_100g numeric not null,
  protein_per_100g numeric not null,
  carbs_per_100g numeric not null,
  fat_per_100g numeric not null,
  portions jsonb not null default '[]'::jsonb,
  is_system boolean not null default true,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists israeli_foods_name_trgm
  on public.israeli_foods using gin (name gin_trgm_ops);

create index if not exists israeli_foods_category_idx
  on public.israeli_foods (category);

create index if not exists israeli_foods_brand_trgm
  on public.israeli_foods using gin (brand gin_trgm_ops);

alter table public.israeli_foods enable row level security;

drop policy if exists "israeli_foods_public_read" on public.israeli_foods;
create policy "israeli_foods_public_read"
  on public.israeli_foods for select
  using (true);

drop policy if exists "israeli_foods_system_insert" on public.israeli_foods;
create policy "israeli_foods_system_insert"
  on public.israeli_foods for insert
  with check (is_system = true);

drop policy if exists "israeli_foods_system_update" on public.israeli_foods;
create policy "israeli_foods_system_update"
  on public.israeli_foods for update
  using (is_system = true)
  with check (is_system = true);

drop policy if exists "israeli_foods_custom_insert" on public.israeli_foods;
create policy "israeli_foods_custom_insert"
  on public.israeli_foods for insert
  with check (true);

drop policy if exists "israeli_foods_custom_update" on public.israeli_foods;
create policy "israeli_foods_custom_update"
  on public.israeli_foods for update
  using (is_system = false)
  with check (is_system = false);

drop policy if exists "israeli_foods_custom_delete" on public.israeli_foods;
create policy "israeli_foods_custom_delete"
  on public.israeli_foods for delete
  using (is_system = false);

grant select, insert, update, delete on public.israeli_foods to anon, authenticated;

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
select id, family, label, grams, match_aliases, sort_order
from jsonb_populate_recordset(null::public.food_serving_presets, $catalog$[{"id":"bread-bun","family":"bread","label":"לחמניה (80g)","grams":80,"match_aliases":["לחמניה","לחמני","bun","roll"],"sort_order":30},{"id":"bread-pita","family":"bread","label":"פיתה (100g)","grams":100,"match_aliases":["פיתה","pita"],"sort_order":20},{"id":"bread-slice","family":"bread","label":"פרוסה (30g)","grams":30,"match_aliases":["לחם","פרוסה","חלה","bread","toast"],"sort_order":10},{"id":"bread-two-slices","family":"bread","label":"2 פרוסות (60 גרם)","grams":60,"match_aliases":["לחם","פרוסה","חלה","bread","toast"],"sort_order":20},{"id":"can-drained","family":"canned","label":"קופסה מסוננת (112g)","grams":112,"match_aliases":["טונה","tuna","קופסה"],"sort_order":10},{"id":"can-full","family":"canned","label":"קופסה מלאה (160g)","grams":160,"match_aliases":["טונה","tuna","קופסה"],"sort_order":20},{"id":"dairy-heaped-tbsp","family":"dairy_tub","label":"כף גדושה (30g)","grams":30,"match_aliases":["קוטג","cottage","יוגורט","גביע","גבינה"],"sort_order":30},{"id":"dairy-tub-full","family":"dairy_tub","label":"גביע שלם (250g)","grams":250,"match_aliases":["קוטג","cottage","יוגורט","גביע","גבינה לבנה"],"sort_order":10},{"id":"dairy-tub-half","family":"dairy_tub","label":"חצי גביע (125g)","grams":125,"match_aliases":["קוטג","cottage","יוגורט","גביע","גבינה לבנה"],"sort_order":20},{"id":"dairy-tub-tbsp","family":"dairy_tub","label":"כף (30 גרם)","grams":30,"match_aliases":["קוטג","cottage","יוגורט","גביע","גבינה לבנה"],"sort_order":30},{"id":"egg-l","family":"egg","label":"יחידה L (60g)","grams":60,"match_aliases":["ביצה","ביצים","egg"],"sort_order":10},{"id":"egg-m","family":"egg","label":"יחידה M (50g)","grams":50,"match_aliases":["ביצה","ביצים","egg"],"sort_order":20},{"id":"fallback-gram","family":"general","label":"גרם (1g)","grams":1,"match_aliases":[],"sort_order":10},{"id":"fallback-portion","family":"general","label":"מנה (100g)","grams":100,"match_aliases":[],"sort_order":40},{"id":"fallback-tbsp","family":"general","label":"כף (15g)","grams":15,"match_aliases":[],"sort_order":20},{"id":"fallback-tsp","family":"general","label":"כפית (5g)","grams":5,"match_aliases":[],"sort_order":30},{"id":"general-scoop-25","family":"general","label":"סקופ (25 גרם)","grams":25,"match_aliases":[],"sort_order":10},{"id":"general-scoop-30","family":"general","label":"סקופ (30 גרם)","grams":30,"match_aliases":[],"sort_order":20},{"id":"general-tbsp","family":"general","label":"כף (15 גרם)","grams":15,"match_aliases":[],"sort_order":40},{"id":"general-tsp","family":"general","label":"כפית (5 גרם)","grams":5,"match_aliases":[],"sort_order":50},{"id":"general-unit","family":"general","label":"יחידה","grams":1,"match_aliases":[],"sort_order":30},{"id":"produce-banana","family":"produce","label":"יחידה בינונית (100g)","grams":100,"match_aliases":["בננה","banana"],"sort_order":10},{"id":"scoop-25","family":"scoop","label":"סקופ (25g)","grams":25,"match_aliases":["אבקת","חלבון","whey","oats","שיבולת","סקופ"],"sort_order":10},{"id":"scoop-30","family":"scoop","label":"סקופ (30g)","grams":30,"match_aliases":["אבקת","חלבון","whey","oats","שיבולת","סקופ"],"sort_order":20},{"id":"snack-large","family":"snack_bag","label":"שקית גדולה (80g)","grams":80,"match_aliases":["במבה","ביסלי","bamba","bisli","שקית"],"sort_order":20},{"id":"snack-mega","family":"snack_bag","label":"שקית ענק (100g)","grams":100,"match_aliases":["במבה","ביסלי","bamba","bisli","שקית"],"sort_order":30},{"id":"snack-small","family":"snack_bag","label":"שקית קטנה (25g)","grams":25,"match_aliases":["במבה","ביסלי","bamba","bisli","שקית"],"sort_order":10},{"id":"spoon-tbsp","family":"spoon","label":"כף (15g)","grams":15,"match_aliases":["שמן","זית","טחינה","חמאת","מיונז","כף"],"sort_order":10},{"id":"spoon-tsp","family":"spoon","label":"כפית (5g)","grams":5,"match_aliases":["שמן","זית","טחינה","חמאת","מיונז","כפית"],"sort_order":20},{"id":"unit-1","family":"unit","label":"יחידה","grams":1,"match_aliases":[],"sort_order":10}]$catalog$::jsonb)
on conflict (id) do nothing;

notify pgrst, 'reload schema';

select
  (select count(*) from public.food_serving_presets) as food_serving_presets_rows;
