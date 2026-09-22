import assert from 'node:assert/strict'
import {
  FREE_ALPHA_CATEGORY,
  FREE_ALPHA_CHANNELS,
  buildChannelCampaign,
  isModerateOrLowerSeverity,
  pickAlphaFeedLead,
  pickCongressInsidersLead,
  pickMassLayoffsLead,
  pickMarketChatterLead,
  resolveFreeAlphaChannelFromCron,
  signalScoreValue,
} from '../worker/discord-free-alpha.js'
import { formatDiscordReliefDrop } from '../worker/discord-signal-template.js'

assert.equal(FREE_ALPHA_CATEGORY, 'VORTX FREE INTELLIGENCE')
assert.equal(resolveFreeAlphaChannelFromCron('17 14 * * *'), 'alpha-feed')
assert.equal(resolveFreeAlphaChannelFromCron('17 14 * * 2,5'), 'mass-layoffs')
assert.equal(resolveFreeAlphaChannelFromCron('17 14 * * 3,6'), 'congress-and-insiders')
assert.equal(resolveFreeAlphaChannelFromCron('17 14 * * 4'), 'market-chatter')
assert.equal(resolveFreeAlphaChannelFromCron('0 0 * * *'), null)

assert.equal(signalScoreValue({ score: 72, confidence: 92 }), 72)
assert.equal(isModerateOrLowerSeverity({ score: 79 }), true)
assert.equal(isModerateOrLowerSeverity({ score: 80 }), false)

const stats = {
  signalCandidates: [
    { name: 'High Co', event_type: 'warn_notice', score: 88, filingDate: '2026-06-20' },
    {
      name: 'Starbucks Corporation',
      event_type: 'lien',
      score: 72,
      filingDate: '2026-06-22',
      confidence: 91,
    },
    { name: 'Low Co', event_type: 'notice_of_intent', score: 44, filingDate: '2026-06-24' },
    {
      name: 'Ford Motor Company',
      event_type: 'warn_notice',
      score: 68,
      filingDate: '2026-06-23',
      workers: '120',
      ticker: 'F',
    },
    {
      name: 'Jane Executive',
      event_type: 'form_4',
      score: 76,
      filingDate: '2026-06-25',
    },
    { name: 'Dock Co', event_type: 'bankruptcy_docket', score: 90, filingDate: '2026-06-21' },
  ],
  entityEventGroups: [
    {
      entity_id: 'w1',
      name: 'Republic National Distributing Company LLC',
      events: [{ event_type: 'warn_notice', filingDate: '2026-06-23', score: 68, workers: '120' }],
    },
  ],
}

const warnLead = pickMassLayoffsLead(stats)
assert.ok(warnLead)
assert.match(String(warnLead.event_type || ''), /warn/i)

const warnCampaign = buildChannelCampaign('mass-layoffs', warnLead, 'https://vortxmkt.com')
assert.match(warnCampaign.cardStakeLine, new RegExp(warnLead.workers || 'WARN'))

const compactWarnCampaign = buildChannelCampaign('mass-layoffs', warnLead, 'https://vortxmkt.com', {
  compact: true,
})
assert.equal(compactWarnCampaign.compactRender, true)

const congressLead = pickCongressInsidersLead({
  ...stats,
  signalCandidates: [
    {
      name: 'Apple Inc',
      event_type: 'form_4',
      score: 84,
      amount: 250000,
      filingDate: '2026-06-26',
      summary: 'Transaction code: P. Amount/shares field on record: 250000. Ticker on record: AAPL.',
    },
    {
      name: 'Unknown Person',
      event_type: 'congress_trade',
      score: 64,
      amount: 1000,
      filingDate: '2026-06-27',
      summary: 'PTR index row only.',
    },
  ],
})
assert.equal(congressLead?.event_type, 'form_4')

const chatterLead = pickMarketChatterLead(stats)
assert.ok(chatterLead)
assert.doesNotMatch(String(chatterLead.event_type || ''), /warn|bankruptcy/)

assert.equal(FREE_ALPHA_CHANNELS['mass-layoffs'].format, 'hero-card')
assert.equal(FREE_ALPHA_CHANNELS['congress-and-insiders'].format, 'hero-card')
assert.ok(FREE_ALPHA_CHANNELS['market-chatter'])

const alphaLead = pickAlphaFeedLead(stats)
assert.ok(alphaLead)

const reliefMessage = formatDiscordReliefDrop({
  signal: {
    name: 'Blue Harbor Construction LLC',
    event_type: 'warn_notice',
    recordType: 'warn notice',
    jurisdiction: 'US-IL',
    filingDate: '2026-05-12',
    score: 68,
    confidence: 88,
  },
  channelLabel: FREE_ALPHA_CHANNELS['mass-layoffs'].label,
  channelHashtag: FREE_ALPHA_CHANNELS['mass-layoffs'].hashtag,
  date: new Date('2026-05-29T12:00:00Z'),
})

assert.match(reliefMessage, /^📡 MASS LAYOFFS; May 29, 2026/m)
assert.match(reliefMessage, /Subscribers saw this before the headline\./)

console.log('discord-free-alpha: ok')
