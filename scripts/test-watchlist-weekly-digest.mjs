import assert from 'node:assert/strict'
import { runWatchedWeeklyDigestJob } from '../frontend/functions/lib/watchlist-weekly-digest.js'

const userId = '11111111-1111-4111-8111-111111111111'
const watchlistId = '22222222-2222-4222-8222-222222222222'
const entityId = '33333333-3333-4333-8333-333333333333'
const eventId = '44444444-4444-4444-8444-444444444444'

function mockRest({ coverageFails = false } = {}) {
  const calls = []
  const supabaseRest = async (_env, path) => {
    calls.push(path)
    if (path.startsWith('entity_watchlist_members')) {
      return [{ watchlist_id: watchlistId, entity_id: entityId }]
    }
    if (path.startsWith('entity_watchlists?select')) {
      return [{ id: watchlistId, user_id: userId, metadata: {} }]
    }
    if (path.startsWith('app_profiles')) {
      return [
        {
          user_id: userId,
          email: 'ada@example.com',
          plan: 'sentinel',
          role: 'customer',
          subscription_status: 'active',
        },
      ]
    }
    if (path.startsWith('legal_events')) {
      if (/detected_at|news_mentioned_at|coverage_first_seen_at/.test(path)) {
        const error = new Error('column legal_events.detected_at does not exist')
        error.status = 400
        throw error
      }
      return [
        {
          id: eventId,
          entity_id: entityId,
          event_type: 'form_4',
          title: 'Form 4 insider filing: Ada',
          summary: '',
          filing_date: '2026-11-20',
          created_at: '2026-11-20T12:00:00.000Z',
        },
      ]
    }
    if (path.startsWith('event_news_coverage')) {
      if (coverageFails) throw new Error('coverage_unavailable')
      return [
        {
          event_id: eventId,
          detected_at: '2026-11-20T12:00:00.000Z',
          news_mentioned_at: '2026-11-20T18:00:00.000Z',
        },
      ]
    }
    if (path.startsWith('entities')) {
      return [{ id: entityId, canonical_name: 'Ada Insider' }]
    }
    throw new Error(`unexpected path ${path}`)
  }
  return { calls, supabaseRest }
}

const happy = mockRest()
const sent = await runWatchedWeeklyDigestJob({}, happy.supabaseRest, { dryRun: true })
assert.equal(sent.ok, true, sent.errors.join('; '))
assert.equal(sent.sent, 1)
assert.equal(sent.errors.length, 0)
const eventsQuery = happy.calls.find((path) => path.startsWith('legal_events'))
assert.ok(eventsQuery)
assert.equal(/detected_at|news_mentioned_at|coverage_first_seen_at/.test(eventsQuery), false)
assert.ok(happy.calls.some((path) => path.startsWith('event_news_coverage')))

const degraded = mockRest({ coverageFails: true })
const stillSent = await runWatchedWeeklyDigestJob({}, degraded.supabaseRest, { dryRun: true })
assert.equal(stillSent.ok, true, stillSent.errors.join('; '))
assert.equal(stillSent.sent, 1)

console.log('test-watchlist-weekly-digest: ok')
