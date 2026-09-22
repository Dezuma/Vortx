#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  buildAnnouncementCopy,
  buildFacebookWeeklyStory,
  buildGoingLiveCopy,
  checkKickLive,
  isDiscordWebhookUrl,
  normalizeLogin,
  postAnnouncement,
  reachHealth,
  sanitizeAnnounceUrl,
} from '../worker/reach-distribution.js'
import { buildSpotlightSubstackPost, draftSpotlightToSubstack } from '../frontend/functions/lib/substack-publish.js'

assert.equal(sanitizeAnnounceUrl('https://www.youtube.com/@ByBizu'), 'https://www.youtube.com/@ByBizu')
assert.equal(sanitizeAnnounceUrl('http://www.youtube.com/@ByBizu'), null)
assert.equal(sanitizeAnnounceUrl('https://127.0.0.1/secret'), null)
assert.equal(sanitizeAnnounceUrl('https://evil.example/phish'), null)

assert.equal(isDiscordWebhookUrl('https://discord.com/api/webhooks/1/abc'), true)
assert.equal(isDiscordWebhookUrl('https://evil.com/api/webhooks/1/abc'), false)
assert.equal(isDiscordWebhookUrl('https://discord.com/api/v10/users/@me'), false)

assert.equal(normalizeLogin('bybizu_'), 'bybizu_')
assert.equal(normalizeLogin('@ByBizu'), 'ByBizu')
assert.equal(normalizeLogin('bad login'), '')

const live = buildAnnouncementCopy(
  { kind: 'live', platform: 'kick', url: 'https://kick.com/bybizu', title: 'Desk hours' },
  {},
)
assert.match(live.text, /live on Kick/)
assert.match(live.text, /kick.com\/bybizu/)
assert.doesNotMatch(live.text, /Form 4|lawsuit|filing/i)

const youtube = buildAnnouncementCopy(
  { kind: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'New episode' },
  {},
)
assert.match(youtube.text, /New on YouTube/)
assert.doesNotMatch(youtube.text, /Form 4/)

const goingLive = buildGoingLiveCopy({ BYBIZU_TWITCH_URL: 'https://www.twitch.tv/bybizu_' }, { platform: 'twitch' })
assert.match(goingLive.text, /Twitch/)

const bybizuStory = buildFacebookWeeklyStory(null, { FACEBOOK_WEEKLY_BRAND: 'bybizu' })
assert.equal(bybizuStory.brand, 'bybizu')
assert.match(bybizuStory.message, /YouTube/)
assert.doesNotMatch(bybizuStory.message, /Form 4|WARN|bankruptcy/i)

const vortxStory = buildFacebookWeeklyStory(
  { name: 'Acme Logistics' },
  { FACEBOOK_WEEKLY_BRAND: 'vortx', MARKETING_CTA_URL: 'https://vortxmkt.com/?view=pricing' },
)
assert.match(vortxStory.message, /Acme Logistics/)
assert.match(vortxStory.message, /Research only/)

const post = buildSpotlightSubstackPost(
  {
    name: 'Acme Logistics',
    event_type: 'warn_notice',
    jurisdiction: 'US-TX',
    score: 81,
    filing_date: '2026-09-21',
    slug: 'abc123',
  },
  { siteUrl: 'https://vortxmkt.com', ctaUrl: 'https://vortxmkt.com/?view=pricing' },
)
assert.match(post.title, /Acme Logistics/)
assert.match(post.subtitle, /warn notice/)
assert.match(post.body, /Research only/)
assert.match(post.body, /vortxmkt.com\/signal\/abc123/)

const dryDraft = await draftSpotlightToSubstack(
  {},
  { name: 'Acme Logistics', event_type: 'warn_notice' },
  { dryRun: true },
)
assert.equal(dryDraft.dry_run, true)
assert.equal(dryDraft.posted, false)

const health = reachHealth({})
assert.equal(health.substack_draft, true)
assert.equal(health.has_substack_sid, false)
assert.equal(health.twitch_login, 'bybizu_')
assert.equal(health.kick_login, 'bybizu')

const announced = await postAnnouncement(
  {
    ANNOUNCE_ENABLED: 'true',
    MARKETING_BOT_DRY_RUN: 'true',
    DISCORD_ANNOUNCEMENTS_WEBHOOK_URL: 'https://discord.com/api/webhooks/1/test',
  },
  { kind: 'youtube', title: 'Hook', url: 'https://www.youtube.com/@ByBizu' },
  { dryRun: true, postTweet: async () => ({ data: { id: 'dry' } }) },
)
assert.equal(announced.ok, true)
assert.equal(announced.discord.dry_run, true)
assert.equal(announced.x.dry_run, true)

const kickOffline = await checkKickLive('bybizu', {
  fetchImpl: async () =>
    new Response(JSON.stringify({ livestream: null }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
})
assert.equal(kickOffline.live, false)

const kickLive = await checkKickLive('bybizu', {
  fetchImpl: async () =>
    new Response(JSON.stringify({ livestream: { id: '99', session_title: 'Desk hours' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
})
assert.equal(kickLive.live, true)
assert.equal(kickLive.stream_id, '99')
assert.equal(kickLive.url, 'https://kick.com/bybizu')

console.log('reach-distribution + substack spotlight: ok')
