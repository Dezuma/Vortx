import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Market } from '../types/market'

const marketSelect =
  'id, slug, title, description, yes_price, outcome, updated_at' as const

export function useMarkets() {
  return useQuery({
    queryKey: ['markets'],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<Market[]> => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('markets')
        .select(marketSelect)
        .order('updated_at', { ascending: false })
        .limit(48)
      if (error) throw new Error(error.message)
      return (data ?? []) as Market[]
    },
  })
}
