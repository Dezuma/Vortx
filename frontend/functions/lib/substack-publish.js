/**
 * Optional Substack publish via session cookie (unofficial internal API).
 * When SUBSTACK_SID is unset, callers fall back to composer paste helpers.
 */

import { buildSubstackPost, substackPublicationUrl } from './case-stories.js'

function bool(value, fallback = false) {
  if (value == null || value === '') return fallback
  const text = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(text)) return true
  if (['0', 'false', 'no', 'off'].includes(text)) return false
  return fallback
}

export function substackSessionCookie(env) {
  return String(env?.SUBSTACK_SID || env?.SUBSTACK_SESSION_COOKIE || '').trim()
}

export function substackConfigured(env) {
  return Boolean(substackSessionCookie(env))
}

/** True only when the env flag is explicitly on (not the implicit default). */
export function substackAutoPublishRequested(env) {
  return bool(env?.SUBSTACK_PUBLISH_ON_APPROVE, false)
}

/**
 * Auto-post on approve runs only when a session cookie exists.
 * Unconfigured workers report false so ops does not claim publish is live.
 */
export function substackPublishOnApproveEnabled(env) {
  if (!substackConfigured(env)) return false
  return bool(env?.SUBSTACK_PUBLISH_ON_APPROVE, true)
}

export function plainTextToSubstackHtml(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const escaped = block
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
      return `<p>${escaped}</p>`
    })
    .join('')
}

async function substackFetch(publicationUrl, path, { cookie, method = 'GET', body } = {}) {
  const base = String(publicationUrl || '').replace(/\/$/, '')
  const url = `${base}/api/v1${path}`
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    cookie: `connect.sid=${cookie}; substack.sid=${cookie}`,
    'user-agent': 'VortxCasePublisher/1.0 (+https://vortxmkt.com)',
  }
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = { raw: text }
  }
  if (!response.ok) {
    const detail =
      payload?.error || payload?.message || payload?.raw || text || `http_${response.status}`
    throw new Error(`substack_${response.status}:${String(detail).slice(0, 220)}`)
  }
  return payload
}

function sanitizeSpotlightName(value) {
  return String(value || 'Public record')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

/**
 * Newsletter copy from the same spotlight the X marketing bot uses.
 * Draft-only by default — marketing never auto-sends to the list.
 */
export function buildSpotlightSubstackPost(spotlight, { siteUrl, ctaUrl } = {}) {
  const name = sanitizeSpotlightName(spotlight?.name)
  const recordType = String(
    spotlight?.event_type || spotlight?.recordType || spotlight?.record_type || 'public record',
  )
    .replaceAll('_', ' ')
    .trim()
  const jurisdiction = String(spotlight?.jurisdiction || 'US').trim() || 'US'
  const scoreRaw = Number(spotlight?.score ?? spotlight?.severity ?? 0)
  const score = Number.isFinite(scoreRaw) && scoreRaw > 0 ? Math.round(Math.min(100, scoreRaw)) : null
  const filing = String(spotlight?.filing_date || spotlight?.filingDate || '').slice(0, 10)
  const base = String(siteUrl || 'https://vortxmkt.com').replace(/\/$/, '')
  const deskUrl = String(ctaUrl || `${base}/?view=pricing`)
  const signalUrl = spotlight?.slug ? `${base}/signal/${spotlight.slug}` : deskUrl
  const title = `${name}: public record, not the headline`
  const subtitle = [recordType, jurisdiction, score != null ? `score ${score}/100` : null, filing || null]
    .filter(Boolean)
    .join(' · ')
  const body = [
    `The dated filing on ${name} is already in the public queue.`,
    'What is free: record type, jurisdiction, and the friction score.',
    'What stays on the desk: source URL, timeline, watchlists, and exports.',
    filing ? `Filing date on record: ${filing}.` : null,
    `Desk and pricing: ${deskUrl}`,
    spotlight?.slug ? `Signal card: ${signalUrl}` : null,
    'Records are allegations or administrative artifacts, not judgments. Research only, not legal or financial advice.',
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    title,
    subtitle,
    body,
    full_text: `${title}\n\n${subtitle}\n\n${body}`,
  }
}

/**
 * Create a Substack draft (and optionally publish) from title/subtitle/body.
 * Marketing callers must pass publish:false so the list is not auto-sent.
 */
export async function draftPlainPostToSubstack(env, post, { publish = false } = {}) {
  const publicationUrl = substackPublicationUrl(env)
  const composerUrl = `${publicationUrl}/publish/post?type=newsletter`
  const cookie = substackSessionCookie(env)

  if (!cookie) {
    return {
      posted: false,
      drafted: false,
      reason: 'SUBSTACK_SID not configured',
      publication_url: publicationUrl,
      composer_url: composerUrl,
      post,
    }
  }

  try {
    const draft = await substackFetch(publicationUrl, '/drafts', {
      cookie,
      method: 'POST',
      body: {
        draft_title: post.title,
        draft_subtitle: post.subtitle,
        draft_body: plainTextToSubstackHtml(post.body),
        type: 'newsletter',
      },
    })
    const draftId = draft?.id || draft?.draft_id || null

    if (!publish || !draftId) {
      return {
        posted: false,
        drafted: true,
        draft_id: draftId,
        reason: publish ? 'draft_created_missing_id' : 'draft_only',
        publication_url: publicationUrl,
        composer_url: composerUrl,
        draft_url: draftId ? `${publicationUrl}/publish/post/${draftId}` : composerUrl,
        post,
      }
    }

    const published = await substackFetch(publicationUrl, `/drafts/${draftId}/publish`, {
      cookie,
      method: 'POST',
      body: { send: true, audience: 'everyone' },
    })

    return {
      posted: true,
      drafted: true,
      draft_id: draftId,
      post_id: published?.id || published?.post_id || null,
      post_url:
        published?.canonical_url ||
        published?.url ||
        (published?.slug ? `${publicationUrl}/p/${published.slug}` : null),
      publication_url: publicationUrl,
      composer_url: composerUrl,
      post,
    }
  } catch (error) {
    return {
      posted: false,
      drafted: false,
      reason: error instanceof Error ? error.message : String(error),
      publication_url: publicationUrl,
      composer_url: composerUrl,
      post,
    }
  }
}

export async function draftSpotlightToSubstack(env, spotlight, options = {}) {
  const post = buildSpotlightSubstackPost(spotlight, options)
  if (options.dryRun) {
    return {
      posted: false,
      drafted: false,
      dry_run: true,
      reason: 'dry_run',
      publication_url: substackPublicationUrl(env),
      composer_url: `${substackPublicationUrl(env)}/publish/post?type=newsletter`,
      post,
    }
  }
  const publish = bool(options.publish ?? env.SUBSTACK_MARKETING_PUBLISH, false)
  return draftPlainPostToSubstack(env, post, { publish })
}

/**
 * Create a Substack draft (and optionally publish) for a case story.
 * @returns {Promise<object>}
 */
export async function publishCaseToSubstack(env, story, siteUrl) {
  const post = buildSubstackPost(story, siteUrl)
  const shouldPublish = bool(env.SUBSTACK_PUBLISH_ON_APPROVE, true)
  return draftPlainPostToSubstack(env, post, { publish: shouldPublish })
}
