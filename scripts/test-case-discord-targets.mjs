#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  discordCasesDeliveryConfigured,
  resolveCaseDiscordChannelIds,
  resolveCaseDiscordWebhooks,
} from '../frontend/functions/lib/case-discord-targets.js'
import {
  plainTextToSubstackHtml,
  substackAutoPublishRequested,
  substackConfigured,
  substackPublishOnApproveEnabled,
} from '../frontend/functions/lib/substack-publish.js'

const materialForm4 = {
  record_type: 'form_4',
  source_fields: {
    amount: 250000,
    severity: 84,
    title: 'Form 4 insider filing: Ford (F) purchase',
    summary: 'Transaction code: P. Amount/shares field on record: 250000.',
  },
}
assert.deepEqual(resolveCaseDiscordChannelIds(materialForm4).slice(0, 3), [
  'cases',
  'congress-and-insiders',
  'alpha-feed',
])
assert.ok(resolveCaseDiscordChannelIds({ record_type: 'warn_notice' }).includes('mass-layoffs'))
assert.ok(!resolveCaseDiscordChannelIds({ record_type: 'warn_notice' }).includes('alpha-feed'))
assert.ok(
  !resolveCaseDiscordChannelIds({ record_type: 'form_4', source_fields: { amount: 8000, severity: 60 } }).includes(
    'alpha-feed',
  ),
)
assert.ok(resolveCaseDiscordChannelIds({ record_type: 'bankruptcy_docket' }).includes('death-spirals'))
assert.ok(
  resolveCaseDiscordChannelIds({
    record_type: 'form_4',
    source_fields: { severity: 90 },
  }).includes('unfiltered-signals'),
)

const hooks = resolveCaseDiscordWebhooks(
  {
    DISCORD_CASES_WEBHOOK_URL: 'https://discord.com/api/webhooks/0/c',
    DISCORD_CONGRESS_INSIDERS_WEBHOOK_URL: 'https://discord.com/api/webhooks/1/a',
    DISCORD_ALPHA_FEED_WEBHOOK_URL: 'https://discord.com/api/webhooks/2/b',
    DISCORD_MARKET_CHATTER_WEBHOOK_URL: 'https://discord.com/api/webhooks/3/d',
  },
  {
    record_type: 'congress_trade',
    source_fields: {
      amount: 75000,
      severity: 82,
      title: 'STOCK Act disclosure: Member · NVDA',
      summary: 'Amount field on record: 75000. purchase.',
    },
  },
)
assert.ok(hooks.some((row) => row.channelId === 'cases'))
assert.ok(hooks.some((row) => row.channelId === 'congress-and-insiders'))
assert.ok(hooks.some((row) => row.channelId === 'alpha-feed'))
assert.equal(hooks.length, new Set(hooks.map((row) => row.webhookUrl)).size)

// Without a dedicated cases webhook, cases falls back to alpha-feed URL (no duplicate posts).
const fallback = resolveCaseDiscordWebhooks(
  {
    DISCORD_ALPHA_FEED_WEBHOOK_URL: 'https://discord.com/api/webhooks/2/b',
    DISCORD_CONGRESS_INSIDERS_WEBHOOK_URL: 'https://discord.com/api/webhooks/1/a',
  },
  materialForm4,
)
assert.ok(fallback.some((row) => row.channelId === 'cases'))
assert.ok(!fallback.some((row) => row.channelId === 'alpha-feed'))

// Dedicated cases webhook missing: mass-layoffs covers the cases slot (layoff desk).
const massLayoffFallback = resolveCaseDiscordWebhooks(
  {
    DISCORD_MASS_LAYOFFS_WEBHOOK_URL: 'https://discord.com/api/webhooks/9/m',
    DISCORD_ALPHA_FEED_WEBHOOK_URL: 'https://discord.com/api/webhooks/2/b',
  },
  { record_type: 'warn_notice' },
)
assert.ok(massLayoffFallback.some((row) => row.channelId === 'cases'))
assert.equal(
  massLayoffFallback.find((row) => row.channelId === 'cases')?.webhookUrl,
  'https://discord.com/api/webhooks/9/m',
)
assert.ok(!massLayoffFallback.some((row) => row.channelId === 'mass-layoffs'))

assert.equal(discordCasesDeliveryConfigured({}), false)
assert.equal(
  discordCasesDeliveryConfigured({ DISCORD_CASES_WEBHOOK_URL: 'https://discord.com/api/webhooks/0/c' }),
  true,
)
assert.equal(
  discordCasesDeliveryConfigured({ DISCORD_MASS_LAYOFFS_WEBHOOK_URL: 'https://discord.com/api/webhooks/9/m' }),
  true,
)
assert.equal(
  discordCasesDeliveryConfigured({ DISCORD_ALPHA_FEED_WEBHOOK_URL: 'https://discord.com/api/webhooks/2/b' }),
  true,
)
assert.equal(
  discordCasesDeliveryConfigured({ DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/8/legacy' }),
  true,
)

assert.equal(substackConfigured({}), false)
assert.equal(substackConfigured({ SUBSTACK_SID: 's%3Atest' }), true)
assert.equal(substackAutoPublishRequested({}), false)
assert.equal(substackAutoPublishRequested({ SUBSTACK_PUBLISH_ON_APPROVE: 'true' }), true)
assert.equal(substackPublishOnApproveEnabled({}), false)
assert.equal(
  substackPublishOnApproveEnabled({ SUBSTACK_SID: 's%3Atest', SUBSTACK_PUBLISH_ON_APPROVE: 'false' }),
  false,
)
assert.equal(substackPublishOnApproveEnabled({ SUBSTACK_SID: 's%3Atest' }), true)
assert.match(plainTextToSubstackHtml('Hello\n\nWorld'), /<p>Hello<\/p><p>World<\/p>/)

console.log('case-discord-targets + substack helpers: ok')
