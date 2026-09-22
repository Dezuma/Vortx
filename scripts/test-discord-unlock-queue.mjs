import assert from 'node:assert/strict'
import {
  UNLOCK_QUEUE_CATEGORY,
  buildDataDumpPreview,
  buildDeathSpiralStages,
  detectDeathSpirals,
  formatDeathSpiralStory,
  formatUnfilteredSignalsCaption,
  isHighSeveritySignal,
  isOrderedSpiral,
  pickUnfilteredSignalsLead,
  resolveUnlockQueueChannelFromCron,
} from '../worker/discord-unlock-queue.js'

assert.equal(UNLOCK_QUEUE_CATEGORY, 'THE VAULT')
assert.equal(resolveUnlockQueueChannelFromCron('17 14 * * *'), 'unfiltered-signals')
assert.equal(resolveUnlockQueueChannelFromCron('17 14 * * 1'), 'death-spirals')
assert.equal(resolveUnlockQueueChannelFromCron('17 14 * * 4'), 'data-dumps')
assert.equal(resolveUnlockQueueChannelFromCron('17 14 * * 0'), 'tactical-playbook')

const stats = {
  eventCount: 120,
  signalCandidates: [
    { name: 'High Co', event_type: 'warn_notice', score: 88, filingDate: '2026-06-20' },
    { name: 'Moderate Co', event_type: 'lien', score: 72, filingDate: '2026-06-22' },
  ],
  entityEventGroups: [
    {
      entity_id: 'e1',
      name: 'Spiral Holdings LLC',
      slug: 'sig-abc',
      events: [
        { event_type: 'mechanics_lien', filingDate: '2026-03-12', jurisdiction: 'US-TX', score: 70 },
        { event_type: 'warn_notice', filingDate: '2026-05-02', jurisdiction: 'US-TX', score: 78, workers: '240' },
        { event_type: 'bankruptcy_docket', filingDate: '2026-06-18', jurisdiction: 'US-Bankruptcy', score: 91 },
      ],
    },
    {
      entity_id: 'e2',
      name: 'Two Step Inc',
      slug: 'sig-def',
      events: [
        { event_type: 'bankruptcy_docket', filingDate: '2026-04-01', jurisdiction: 'US-Bankruptcy', score: 80 },
        { event_type: 'warn_notice', filingDate: '2026-05-01', jurisdiction: 'US-CA', score: 70 },
      ],
    },
  ],
  rawEvents: [
    {
      name: 'Sample Vendor LLC',
      jurisdiction: 'US-TX',
      event_type: 'warn_notice',
      filing_date: '2026-06-20',
      severity: 72,
    },
  ],
}

assert.equal(isHighSeveritySignal({ score: 80 }), true)
assert.equal(isHighSeveritySignal({ score: 79 }), false)

const unfiltered = pickUnfilteredSignalsLead(stats)
assert.equal(unfiltered?.name, 'High Co')

const stages = buildDeathSpiralStages(stats.entityEventGroups[0].events)
assert.equal(stages.length, 3)
assert.equal(isOrderedSpiral(stages), true)
assert.equal(isOrderedSpiral(buildDeathSpiralStages(stats.entityEventGroups[1].events)), false)

const spirals = detectDeathSpirals(stats)
assert.equal(spirals[0]?.name, 'Spiral Holdings LLC')
assert.equal(spirals[0]?.stageCount, 3)

const spiralStory = formatDeathSpiralStory(spirals[0], 'https://vortxmkt.com', {
  date: new Date('2026-06-26T12:00:00Z'),
})
assert.match(spiralStory, /DEATH SPIRAL; June 26, 2026/)
assert.match(spiralStory, /Spiral Holdings LLC · 3-stage distress pattern/)
assert.match(spiralStory, /Underlying source docs: LOCKED/)
assert.match(spiralStory, /Timeline export: LOCKED/)

const caption = formatUnfilteredSignalsCaption(unfiltered, 'https://vortxmkt.com')
assert.match(caption, /Your exposure window just opened\./)
assert.match(caption, /source \+ timeline locked on card/i)

const dump = buildDataDumpPreview(stats)
assert.match(dump.csvSample, /^entity,jurisdiction,event_type,filing_date,severity,source_url/m)
assert.match(dump.csvSample, /LOCKED/)
assert.match(dump.csvSample, /█+/)

console.log('discord-unlock-queue: ok')
