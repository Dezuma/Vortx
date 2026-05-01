import { useState, type FormEvent } from 'react'
import { joinWaitlist } from '../lib/waitlist'

/** Funnel placeholder — wire to Supabase Edge Function, Resend, or Loops. */
export function WaitlistStrip() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) return

    setError(null)
    setIsSubmitting(true)
    try {
      await joinWaitlist(cleanEmail)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to join waitlist')
      setIsSubmitting(false)
    }
  }

  if (done) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-950">
        <strong>Thanks.</strong> You are on the Vortx waitlist. Watch for paper league and oracle beta updates.
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-line bg-surface-elevated p-5 md:p-6">
      <h2 className="text-lg font-semibold text-ink">Waitlist · oracle + markets</h2>
      <p className="mt-1 text-sm text-muted">
        One action behind the brand: get notified when public odds + paper league open.
      </p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">
          Email
        </label>
        <input
          id="waitlist-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none ring-accent focus:border-accent focus:ring-2"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          {isSubmitting ? 'Joining…' : 'Join'}
        </button>
      </form>
      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}
    </section>
  )
}
