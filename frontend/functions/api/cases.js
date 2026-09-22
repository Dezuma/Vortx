/**
 * Case stories API: public published list + admin review / generate actions.
 * Approval is always a human admin action. Publish distributes to Discord PNGs,
 * X, and Substack (when SUBSTACK_SID is configured).
 */

import { requireAdminSession } from './auth.js'
import { json, supabaseRest } from '../lib/supabase-rest.js'
import {
  buildSubstackPost,
  sanitizeCaseText,
  substackPublicationUrl,
  validateCaseDraft,
} from '../lib/case-stories.js'
import { distributePublishedCase } from '../lib/case-distribution.js'
import { substackConfigured, substackPublishOnApproveEnabled } from '../lib/substack-publish.js'
import { runCaseDraftJob } from '../lib/case-draft-generator.js'

const PUBLIC_FIELDS = 'id,slug,headline,dek,body,record_type,event_id,entity_id,source_fields,published_at'
const ADMIN_FIELDS = `${PUBLIC_FIELDS},status,video_script,model,generation_notes,reviewed_by,created_at,updated_at`

export async function onCasesPublicList({ env }) {
  try {
    const rows = await supabaseRest(
      env,
      `case_stories?select=${PUBLIC_FIELDS}&status=eq.published&order=published_at.desc&limit=30`,
    )
    return json(
      { ok: true, cases: rows || [] },
      { headers: { 'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' } },
    )
  } catch (error) {
    return json({ ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onCasesDraftList({ request, env }) {
  try {
    await requireAdminSession(request, env)
    const [pending, recent] = await Promise.all([
      supabaseRest(
        env,
        `case_stories?select=${ADMIN_FIELDS}&status=eq.pending_review&order=created_at.desc&limit=50`,
      ),
      supabaseRest(
        env,
        `case_stories?select=${ADMIN_FIELDS}&status=eq.published&order=published_at.desc&limit=10`,
      ),
    ])
    const siteUrl = String(env.PUBLIC_SITE_URL || 'https://vortxmkt.com').replace(/\/$/, '')
    const withSubstack = (rows) =>
      (rows || []).map((row) => ({ ...row, substack_post: buildSubstackPost(row, siteUrl) }))
    return json({
      ok: true,
      pending: withSubstack(pending),
      recent_published: withSubstack(recent),
      substack: {
        publication_url: substackPublicationUrl(env),
        composer_url: `${substackPublicationUrl(env)}/publish/post?type=newsletter`,
        auto_publish_configured: substackConfigured(env),
        publish_on_approve: substackPublishOnApproveEnabled(env),
      },
    })
  } catch (error) {
    return json(error.body || { ok: false, error: error.message }, { status: error.status || 500 })
  }
}

/**
 * POST /api/cases/generate — run AI case draft job for WARN + egregious trades (admin).
 */
export async function onCasesGenerate({ request, env }) {
  try {
    await requireAdminSession(request, env)
    let body = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const dryRun = body?.dry_run === true
    const result = await runCaseDraftJob(env, supabaseRest, { dryRun, force: true })
    return json({ ok: true, ...result })
  } catch (error) {
    return json(error.body || { ok: false, error: error.message }, { status: error.status || 500 })
  }
}

async function approveOne(env, profile, story, edits = {}) {
  const merged = {
    headline: sanitizeCaseText(edits.headline ?? story.headline),
    dek: sanitizeCaseText(edits.dek ?? story.dek),
    body: sanitizeCaseText(edits.body ?? story.body),
    video_script: sanitizeCaseText(edits.video_script ?? story.video_script),
    record_type: story.record_type,
  }
  const check = validateCaseDraft(merged, story.source_fields)
  if (!check.ok) {
    return { ok: false, error: 'validation_failed', issues: check.issues, id: story.id }
  }

  const publishedAt = new Date().toISOString()
  await supabaseRest(env, `case_stories?id=eq.${encodeURIComponent(story.id)}`, {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      status: 'published',
      headline: merged.headline,
      dek: merged.dek,
      body: merged.body,
      video_script: merged.video_script,
      reviewed_by: profile.email,
      published_at: publishedAt,
      updated_at: publishedAt,
    }),
  })

  const published = { ...story, ...merged }
  const distribution = await distributePublishedCase(env, published)
  const siteUrl = String(env.PUBLIC_SITE_URL || 'https://vortxmkt.com').replace(/\/$/, '')

  return {
    ok: true,
    status: 'published',
    id: story.id,
    slug: story.slug,
    discord: distribution.discord,
    x: distribution.x,
    substack: distribution.substack,
    social_copy: distribution.copy,
    substack_post: distribution.substack?.post || buildSubstackPost(published, siteUrl),
    substack_composer_url:
      distribution.substack?.composer_url || `${substackPublicationUrl(env)}/publish/post?type=newsletter`,
  }
}

async function rejectOne(env, profile, story) {
  await supabaseRest(env, `case_stories?id=eq.${encodeURIComponent(story.id)}`, {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      status: 'rejected',
      reviewed_by: profile.email,
      updated_at: new Date().toISOString(),
    }),
  })
  return { ok: true, status: 'rejected', id: story.id }
}

/**
 * POST /api/cases/review with body:
 *   { id, action: 'approve' | 'reject', edits?: { headline?, dek?, body?, video_script? } }
 *   OR bulk: { action: 'approve_all' | 'reject_all' }
 * Edits are validated against the stored source_fields before publishing.
 */
export async function onCaseReview({ request, env }) {
  try {
    const { profile } = await requireAdminSession(request, env)

    let body
    try {
      body = await request.json()
    } catch {
      return json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }

    const action = String(body.action || '').trim()

    if (action === 'approve_all' || action === 'reject_all') {
      const pending = await supabaseRest(
        env,
        `case_stories?select=${ADMIN_FIELDS}&status=eq.pending_review&order=created_at.asc&limit=25`,
      )
      const results = []
      for (const story of pending || []) {
        if (action === 'reject_all') {
          results.push(await rejectOne(env, profile, story))
        } else {
          results.push(await approveOne(env, profile, story, {}))
        }
      }
      return json({
        ok: true,
        bulk: true,
        action,
        count: results.length,
        published: results.filter((row) => row.status === 'published').length,
        rejected: results.filter((row) => row.status === 'rejected').length,
        failed: results.filter((row) => !row.ok).length,
        results,
      })
    }

    const id = String(body.id || '').trim()
    if (!id || (action !== 'approve' && action !== 'reject')) {
      return json({ ok: false, error: 'invalid_request' }, { status: 400 })
    }

    const rows = await supabaseRest(
      env,
      `case_stories?select=${ADMIN_FIELDS}&id=eq.${encodeURIComponent(id)}&limit=1`,
    )
    const story = rows?.[0]
    if (!story) return json({ ok: false, error: 'not_found' }, { status: 404 })
    if (story.status !== 'pending_review') {
      return json({ ok: false, error: 'not_pending', status: story.status }, { status: 409 })
    }

    if (action === 'reject') {
      return json(await rejectOne(env, profile, story))
    }

    const edits = body.edits && typeof body.edits === 'object' ? body.edits : {}
    const result = await approveOne(env, profile, story, edits)
    if (!result.ok) {
      return json(result, { status: result.error === 'validation_failed' ? 422 : 500 })
    }
    return json(result)
  } catch (error) {
    return json(error.body || { ok: false, error: error.message }, { status: error.status || 500 })
  }
}
