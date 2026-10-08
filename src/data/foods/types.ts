export type FoodPortion = {
  name: string
  grams: number
  isDefault: boolean
}

export type IsraeliFood = {
  id: string
  name: string
  category: string
  brand: string | null
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  portions: FoodPortion[]
  is_custom?: boolean
  is_system?: boolean
}

export type IsraeliFoodRow = IsraeliFood & {
  is_system?: boolean
  is_custom?: boolean
}
