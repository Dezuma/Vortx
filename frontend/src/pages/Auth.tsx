import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

type Mode = 'sign-in' | 'sign-up'

export function Auth() {
  const { user, isLoading, hasAuthClient } = useAuth()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isLoading && user) return <Navigate to="/markets" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return

    setError(null)
    setMessage(null)
    setIsSubmitting(true)

    const cleanEmail = email.trim().toLowerCase()
    const result =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email: cleanEmail, password })
        : await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth` : undefined,
            },
          })

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    if (mode === 'sign-up' && !result.data.session) {
      setMessage('Check your email to confirm your account, then come back and sign in.')
      return
    }

    setMessage(mode === 'sign-in' ? 'Signed in.' : 'Account created.')
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Account</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {mode === 'sign-in' ? 'Sign in to Vortx' : 'Create your Vortx account'}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Save your watchlist, join the paper league, and unlock member-only signals as tiers come online.
        </p>
      </div>

      {!hasAuthClient ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Supabase env is missing, so authentication is disabled in this build.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="rounded-xl border border-line bg-surface-elevated p-5">
          <div className="flex rounded-lg bg-neutral-100 p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setMode('sign-in')}
              className={`flex-1 rounded-md px-3 py-2 ${mode === 'sign-in' ? 'bg-surface-elevated shadow-sm' : 'text-muted'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('sign-up')}
              className={`flex-1 rounded-md px-3 py-2 ${mode === 'sign-up' ? 'bg-surface-elevated shadow-sm' : 'text-muted'}`}
            >
              Sign up
            </button>
          </div>

          <label className="mt-5 block text-sm font-medium text-ink" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none ring-accent focus:border-accent focus:ring-2"
          />

          <label className="mt-4 block text-sm font-medium text-ink" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none ring-accent focus:border-accent focus:ring-2"
          />

          {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p> : null}
          {message ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      )}
    </div>
  )
}
