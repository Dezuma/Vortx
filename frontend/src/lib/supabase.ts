import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { publicEnv } from './env'

function createBrowserClient(): SupabaseClient | null {
  const url = publicEnv.supabaseUrl
  const key = publicEnv.supabasePublishableKey
  if (!url || !key) return null
  return createClient(url, key, {
    auth: {
      detectSessionInUrl: true,
      flowType: 'pkce',
      persistSession: true,
    },
  })
}

/** Null when URL/key missing (local marketing mode). */
export const supabase = createBrowserClient()
