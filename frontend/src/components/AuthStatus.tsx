import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export function AuthStatus() {
  const { user, isLoading, hasAuthClient } = useAuth()

  if (!hasAuthClient) {
    return (
      <Link to="/auth" className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink no-underline">
        Sign in
      </Link>
    )
  }

  if (isLoading) {
    return <span className="text-xs text-muted">Checking session…</span>
  }

  if (!user) {
    return (
      <Link
        to="/auth"
        className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-neutral-800"
      >
        Sign in
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="max-w-[9rem] truncate text-muted">{user.email}</span>
      <button
        type="button"
        onClick={() => void supabase?.auth.signOut()}
        className="rounded-full border border-line px-3 py-1.5 font-semibold text-ink hover:bg-neutral-50"
      >
        Sign out
      </button>
    </div>
  )
}
