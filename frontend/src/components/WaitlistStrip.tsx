import { useState, type FormEvent } from 'react'

/** Funnel placeholder — wire to Supabase Edge Function, Resend, or Loops. */
export function WaitlistStrip() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setDone(true)
  }

  if (done) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-950">
        <strong>Thanks.</strong> Hook this form to your CRM or transactional email — the site builds trust; the system
        owns follow-up.
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
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Join
        </button>
      </form>
    </section>
  )
}
