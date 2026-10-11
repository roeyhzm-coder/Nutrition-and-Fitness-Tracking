import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Dedicated client for recipe-book's live `recipes` table.
 * Must stay separate from the nutrition project's client (israeli_foods, app_state).
 */
const FALLBACK_URL = 'https://ywrzbdmebqmdnmsiczno.supabase.co'
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cnpiZG1lYnFtZG5tc2ljem5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjczMDMsImV4cCI6MjA5MzMwMzMwM30.an1hYfbrCJGSjJ7JYY0se5ntx3kDoH5WNmn3ZQ8vUKE'

const url =
  (import.meta.env.VITE_RECIPE_BOOK_SUPABASE_URL as string | undefined)?.trim() ||
  FALLBACK_URL
const anonKey =
  (import.meta.env.VITE_RECIPE_BOOK_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  FALLBACK_ANON_KEY

export const isRecipeBookConfigured = Boolean(url && anonKey)

export const recipeBookSupabase: SupabaseClient | null = isRecipeBookConfigured
  ? createClient(url, anonKey)
  : null
