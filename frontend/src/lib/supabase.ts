import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function createBrowserClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) return null
  return createClient(url, key)
}

/** Null when URL/key missing (local marketing mode). */
export const supabase = createBrowserClient()
