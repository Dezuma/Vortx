type WaitlistResponse =
  | { ok: true; status: 'created' | 'existing' }
  | { ok: false; error: string; message?: string }

export async function joinWaitlist(email: string) {
  const res = await fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, source: 'homepage' }),
  })

  const payload = (await res.json()) as WaitlistResponse
  if (!res.ok || !payload.ok) {
    throw new Error(payload.ok ? 'waitlist_failed' : payload.message || payload.error)
  }

  return payload
}
