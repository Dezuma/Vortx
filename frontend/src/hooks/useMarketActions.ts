import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'

export function useMarketActions(marketId: string) {
  const qc = useQueryClient()
  const { user, isLoading } = useAuth()

  const watchlist = useQuery({
    queryKey: ['watchlist', marketId, user?.id],
    enabled: Boolean(supabase && marketId && user?.id),
    queryFn: async () => {
      if (!supabase || !user) return null
      const { data, error } = await supabase
        .from('watchlists')
        .select('id')
        .eq('market_id', marketId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
  })

  const prediction = useQuery({
    queryKey: ['paper-prediction', marketId, user?.id],
    enabled: Boolean(supabase && marketId && user?.id),
    queryFn: async () => {
      if (!supabase || !user) return null
      const { data, error } = await supabase
        .from('paper_predictions')
        .select('id, side, probability')
        .eq('market_id', marketId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
  })

  const toggleWatchlist = useMutation({
    mutationFn: async () => {
      if (!supabase || !user) throw new Error('Sign in to save this market.')
      if (watchlist.data?.id) {
        const { error } = await supabase.from('watchlists').delete().eq('id', watchlist.data.id)
        if (error) throw new Error(error.message)
        return 'removed'
      }
      const { error } = await supabase.from('watchlists').insert({ user_id: user.id, market_id: marketId })
      if (error) throw new Error(error.message)
      return 'added'
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['watchlist', marketId, user?.id] }),
  })

  const submitPrediction = useMutation({
    mutationFn: async ({ side, probability }: { side: 'yes' | 'no'; probability: number }) => {
      if (!supabase || !user) throw new Error('Sign in to make a paper pick.')
      const { error } = await supabase
        .from('paper_predictions')
        .upsert(
          {
            user_id: user.id,
            market_id: marketId,
            side,
            probability,
          },
          { onConflict: 'user_id,market_id' },
        )
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['paper-prediction', marketId, user?.id] }),
  })

  return {
    user,
    isAuthLoading: isLoading,
    watchlist,
    prediction,
    toggleWatchlist,
    submitPrediction,
  }
}
