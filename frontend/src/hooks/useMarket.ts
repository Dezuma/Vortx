import { useQuery } from '@tanstack/react-query'
import { DEMO_MARKETS } from '../data/demo-markets'
import { supabase } from '../lib/supabase'
import type { Market } from '../types/market'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const marketSelect =
  'id, slug, title, description, yes_price, outcome, source_url, closes_at, updated_at' as const

export function useMarket(slugOrId: string | undefined) {
  return useQuery({
    queryKey: ['market', slugOrId],
    enabled: Boolean(slugOrId),
    queryFn: async (): Promise<Market | null> => {
      if (!slugOrId) return null
      if (!supabase) {
        return DEMO_MARKETS.find((m) => m.id === slugOrId || m.slug === slugOrId) ?? null
      }
      const col = UUID_RE.test(slugOrId) ? 'id' : 'slug'
      const { data, error } = await supabase
        .from('markets')
        .select(marketSelect)
        .eq(col, slugOrId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data as Market) ?? null
    },
  })
}
