-- Restore the three missing custom meals into user_saved_meals and app_state JSON.

with restored as (
  select * from jsonb_to_recordset($meals$
  [
    {
      "id": "meal-toast",
      "name": "טוסט",
      "calories": 259,
      "protein": 15.4,
      "carbs": 29.8,
      "fats": 8.32,
      "notes": "2 פרוסות לחם (30 גרם לפרוסה) + 2 פרוסות גבינה צהובה 9% עמק (20 גרם לפרוסה)",
      "kind": "meal",
      "servingGrams": 100,
      "components": [
        {
          "name": "לחם",
          "amount": "2",
          "unit": "serving",
          "servingGrams": 30,
          "servingLabel": "פרוסה (30g)",
          "calories": 159,
          "protein": 5.4,
          "carbs": 29.4,
          "fats": 1.92,
          "per100g": { "calories": 265, "protein": 9, "carbs": 49, "fats": 3.2 },
          "kind": "item",
          "catalogId": "pantry-bread-generic",
          "unitId": "bread-slice"
        },
        {
          "name": "גבינה צהובה 9% עמק",
          "amount": "2",
          "unit": "serving",
          "servingGrams": 20,
          "servingLabel": "פרוסה (20g)",
          "calories": 100,
          "protein": 10,
          "carbs": 0.4,
          "fats": 6.4,
          "per100g": { "calories": 250, "protein": 25, "carbs": 1, "fats": 16 },
          "kind": "item",
          "catalogId": "pantry-yellow-emek-9"
        }
      ]
    },
    {
      "id": "meal-cottage-bread",
      "name": "לחם קוטג'",
      "calories": 477,
      "protein": 34.85,
      "carbs": 33.9,
      "fats": 14.42,
      "notes": "1 גביע קוטג' 5% תנובה (250 גרם) + 2 פרוסות לחם (30 גרם לפרוסה)",
      "kind": "meal",
      "servingGrams": 310,
      "components": [
        {
          "name": "קוטג' 5% תנובה",
          "amount": "1",
          "unit": "serving",
          "servingGrams": 250,
          "servingLabel": "גביע שלם (250g)",
          "calories": 237.5,
          "protein": 26.75,
          "carbs": 4.5,
          "fats": 12.5,
          "per100g": { "calories": 95, "protein": 10.7, "carbs": 1.8, "fats": 5 },
          "kind": "item",
          "catalogId": "pantry-cottage-tnuva-5",
          "unitId": "tub-full"
        },
        {
          "name": "לחם",
          "amount": "2",
          "unit": "serving",
          "servingGrams": 30,
          "servingLabel": "פרוסה (30g)",
          "calories": 159,
          "protein": 5.4,
          "carbs": 29.4,
          "fats": 1.92,
          "per100g": { "calories": 265, "protein": 9, "carbs": 49, "fats": 3.2 },
          "kind": "item",
          "catalogId": "pantry-bread-generic",
          "unitId": "bread-slice"
        }
      ]
    },
    {
      "id": "meal-acai-protein",
      "name": "קערת אסאי חלבון",
      "calories": 296.2,
      "protein": 25.13,
      "carbs": 29.53,
      "fats": 9.99,
      "notes": "25 גרם אבקת חלבון Myprotein שוקולד לבן + 80 גרם בננה + 50 גרם תותים קפואים / מנגו + 15 גרם חמאת בוטנים טבעית",
      "kind": "meal",
      "servingGrams": 170,
      "components": [
        {
          "name": "אבקת חלבון Myprotein שוקולד לבן",
          "amount": "1",
          "unit": "serving",
          "servingGrams": 25,
          "servingLabel": "סקופ (25g)",
          "calories": 102,
          "protein": 20,
          "carbs": 1.88,
          "fats": 1.8,
          "per100g": { "calories": 408, "protein": 80, "carbs": 7.5, "fats": 7.2 },
          "kind": "item",
          "catalogId": "pantry-protein-myprotein-white-choc",
          "unitId": "scoop-25"
        },
        {
          "name": "בננה",
          "amount": "80",
          "unit": "grams",
          "servingGrams": 100,
          "servingLabel": "יחידה בינונית (100g)",
          "calories": 71.2,
          "protein": 0.88,
          "carbs": 18.4,
          "fats": 0.24,
          "per100g": { "calories": 89, "protein": 1.1, "carbs": 23, "fats": 0.3 },
          "kind": "item",
          "catalogId": "pantry-banana",
          "unitId": "grams"
        },
        {
          "name": "תותים קפואים / מנגו",
          "amount": "50",
          "unit": "grams",
          "servingGrams": 80,
          "servingLabel": "מנה (80g)",
          "calories": 28.5,
          "protein": 0.35,
          "carbs": 7,
          "fats": 0.15,
          "per100g": { "calories": 57, "protein": 0.7, "carbs": 14, "fats": 0.3 },
          "kind": "item",
          "catalogId": "pantry-berries",
          "unitId": "grams"
        },
        {
          "name": "חמאת בוטנים טבעית",
          "amount": "1",
          "unit": "serving",
          "servingGrams": 15,
          "servingLabel": "כף (15g)",
          "calories": 94.5,
          "protein": 3.9,
          "carbs": 2.25,
          "fats": 7.8,
          "per100g": { "calories": 630, "protein": 26, "carbs": 15, "fats": 52 },
          "kind": "item",
          "catalogId": "pantry-pb-bd",
          "unitId": "spoon-tbsp"
        }
      ]
    }
  ]
  $meals$) as meal(
    id text,
    name text,
    calories numeric,
    protein numeric,
    carbs numeric,
    fats numeric,
    notes text,
    kind text,
    "servingGrams" numeric,
    components jsonb
  )
)
insert into public.user_saved_meals (
  id, user_id, name, calories, protein, carbs, fats, notes, kind, serving_grams, components, payload, updated_at
)
select
  meal.id,
  'primary',
  meal.name,
  meal.calories,
  meal.protein,
  meal.carbs,
  meal.fats,
  meal.notes,
  meal.kind,
  meal."servingGrams",
  coalesce(meal.components, '[]'::jsonb),
  jsonb_build_object(
    'id', meal.id,
    'name', meal.name,
    'calories', meal.calories,
    'protein', meal.protein,
    'carbs', meal.carbs,
    'fats', meal.fats,
    'notes', meal.notes,
    'kind', meal.kind,
    'servingGrams', meal."servingGrams",
    'components', meal.components
  ),
  now()
from restored meal
on conflict (id) do update set
  user_id = excluded.user_id,
  name = excluded.name,
  calories = excluded.calories,
  protein = excluded.protein,
  carbs = excluded.carbs,
  fats = excluded.fats,
  notes = excluded.notes,
  kind = excluded.kind,
  serving_grams = excluded.serving_grams,
  components = excluded.components,
  payload = excluded.payload,
  updated_at = now();

update public.app_state
set
  saved_meals = (
    select coalesce(jsonb_agg(elem), '[]'::jsonb)
    from (
      select elem
      from jsonb_array_elements(coalesce(saved_meals, '[]'::jsonb)) elem
      where elem->>'id' not in ('meal-toast', 'meal-cottage-bread', 'meal-acai-protein')
      union all
      select payload
      from public.user_saved_meals
      where user_id = 'primary'
        and id in ('meal-toast', 'meal-cottage-bread', 'meal-acai-protein')
    ) s(elem)
  ),
  updated_at = now();

update public.client_app_state
set
  saved_meals = (
    select coalesce(jsonb_agg(elem), '[]'::jsonb)
    from (
      select elem
      from jsonb_array_elements(coalesce(saved_meals, '[]'::jsonb)) elem
      where elem->>'id' not in ('meal-toast', 'meal-cottage-bread', 'meal-acai-protein')
      union all
      select payload
      from public.user_saved_meals
      where user_id = 'primary'
        and id in ('meal-toast', 'meal-cottage-bread', 'meal-acai-protein')
    ) s(elem)
  ),
  updated_at = now();
