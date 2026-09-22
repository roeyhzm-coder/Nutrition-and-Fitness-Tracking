export type FoodProduct = {
  code: string
  name: string
  brand?: string
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatsPer100g: number | null
  imageUrl?: string
}

type OffProduct = {
  code?: string
  product_name?: string
  product_name_he?: string
  brands?: string
  image_front_small_url?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
  }
}

type OffSearchResponse = {
  products?: OffProduct[]
}

export async function searchOpenFoodFacts(
  query: string,
  signal?: AbortSignal,
): Promise<FoodProduct[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '12',
    fields:
      'code,product_name,product_name_he,brands,image_front_small_url,nutriments',
  })

  const url = `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`
  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error('חיפוש המזון נכשל')
  }

  const data = (await res.json()) as OffSearchResponse

  return (data.products ?? [])
    .filter((p) => p.product_name || p.product_name_he)
    .map((p) => ({
      code: p.code ?? crypto.randomUUID(),
      name: p.product_name_he || p.product_name || 'ללא שם',
      brand: p.brands,
      caloriesPer100g: p.nutriments?.['energy-kcal_100g'] ?? null,
      proteinPer100g: p.nutriments?.proteins_100g ?? null,
      carbsPer100g: p.nutriments?.carbohydrates_100g ?? null,
      fatsPer100g: p.nutriments?.fat_100g ?? null,
      imageUrl: p.image_front_small_url,
    }))
}
