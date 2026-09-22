import assert from 'node:assert/strict'
import {
  discordScoreBar,
  discordScoreLabel,
  discordSignalSource,
  discordSignalState,
  discordSignalType,
  formatDiscordSignalDrop,
  maskEntityName,
} from '../worker/discord-signal-template.js'

assert.equal(discordSignalType('warn_notice', ''), 'WARN Notice')
assert.equal(discordSignalType('bankruptcy_chapter_11', ''), 'Bankruptcy docket')
assert.equal(discordSignalType('mechanics_lien', ''), 'Lien cluster')
assert.equal(discordSignalState('US-CA'), 'CA')
assert.equal(discordSignalSource('warn_notice', ''), 'State DOL')
assert.equal(discordSignalSource('mechanics_lien', ''), 'County recorder')
assert.equal(discordScoreLabel(82), 'Urgent review')
assert.equal(discordScoreLabel(70), 'Building pressure')
assert.equal(discordScoreLabel(40), 'Monitor')
assert.equal(discordScoreBar(80), '▓▓▓▓▓▓▓▓░░')
assert.match(maskEntityName('Blue Harbor Construction LLC'), /^█+ LLC$/)

const message = formatDiscordSignalDrop({
  signal: {
    name: 'Blue Harbor Construction LLC',
    recordType: 'warn notice',
    event_type: 'warn_notice',
    jurisdiction: 'US-IL',
    filingDate: '2026-05-12',
    score: 84,
    confidence: 91,
  },
  date: new Date('2026-05-29T12:00:00Z'),
})

assert.match(message, /^⚡ SIGNAL DROP; May 29, 2026/m)
assert.match(message, /TYPE: WARN Notice/)
assert.match(message, /STATE: IL/)
assert.match(message, /SOURCE: State DOL · Verified/)
assert.match(message, /SCORE: 84 \/ 100 · Urgent review/)
assert.match(message, /CONFIDENCE: 91%/)
assert.match(message, /▓▓▓▓▓▓▓▓░░/)
assert.match(message, /Entity name: █+ LLC/)
assert.match(message, /→ Unlock at vortxmkt\.com/)
assert.match(message, /#signals #publicrecord/)

console.log('discord-signal-template: ok')
