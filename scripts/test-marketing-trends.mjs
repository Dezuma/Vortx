import assert from 'node:assert/strict'
import {
  appendTrendHashtags,
  buildTrendHashtags,
  getCandidatePool,
  pickTrendAlignedLead,
  pickTrendyHashtag,
  scoreSignalAgainstTrends,
  toHashtag,
} from '../worker/marketing-trends.js'

const trends = {
  terms: ['layoffs in texas', 'commercial real estate', 'bankruptcy filings', 'car wash'],
}

const warnSignal = {
  name: 'Ford Motor Company',
  slug: 'ford-motor',
  ticker: 'F',
  event_type: 'warn_notice',
  recordType: 'warn notice',
  jurisdiction: 'US-TX',
  filingDate: '2026-05-28',
  score: 78,
  summary: 'Affected employees: 240',
}

const bankruptcySignal = {
  name: 'Bed Bath & Beyond Inc',
  slug: 'bed-bath-beyond',
  event_type: 'bankruptcy_chapter_11',
  recordType: 'bankruptcy chapter 11',
  jurisdiction: 'US-CO',
  filingDate: '2026-06-01',
  score: 90,
}

assert.ok(scoreSignalAgainstTrends(warnSignal, trends) > 0)
assert.ok(scoreSignalAgainstTrends(bankruptcySignal, { terms: ['car wash bankruptcy'] }) > 0)

const stats = {
  signalCandidates: [bankruptcySignal, warnSignal],
  warn: warnSignal,
  bankruptcy: bankruptcySignal,
  spotlight: bankruptcySignal,
}

const texasTrends = { terms: ['layoffs in texas', 'texas jobs', 'WARN notice texas'] }
assert.ok(
  scoreSignalAgainstTrends(warnSignal, texasTrends) >
    scoreSignalAgainstTrends(bankruptcySignal, texasTrends),
)
const lead = pickTrendAlignedLead(stats, texasTrends, () => bankruptcySignal, { rotationDay: 0 })
assert.equal(lead.slug, 'ford-motor')

const rotatedLead = pickTrendAlignedLead(stats, texasTrends, () => bankruptcySignal, { rotationDay: 1 })
assert.equal(rotatedLead.slug, 'bed-bath-beyond')

assert.equal(pickTrendyHashtag({ terms: ['layoffs in texas', 'nba finals'] }), '#Layoffs')

const tags = buildTrendHashtags(lead, trends, { maxTags: 2 })
assert.match(tags, /^#Layoffs|^#CommercialRealEstate|^#Bankruptcy/)
assert.match(tags, /#WARN/i)
assert.doesNotMatch(tags, /#signals/)
assert.ok(tags.split(/\s+/).length <= 2)

assert.equal(toHashtag('layoffs in texas'), '#LayoffsInTexas')

const post = appendTrendHashtags('Hook line\n\nBody\n\ncta → site', tags, 280)
assert.match(post, /#Layoffs|#WARN/)

console.log('marketing-trends: ok')
