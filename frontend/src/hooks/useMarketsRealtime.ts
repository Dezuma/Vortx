import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/** Invalidate caches when `markets` rows change (enable Realtime on `public.markets` in Supabase). */
export function useMarketsRealtime() {
  const qc = useQueryClient()

  useEffect(() => {
    const client = supabase
    if (!client) return

    const channel = client
      .channel('vortx-markets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'markets' },
        () => {
          void qc.invalidateQueries({ queryKey: ['markets'] })
          void qc.invalidateQueries({
            predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'market',
          })
        },
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [qc])
}
