import assert from 'node:assert/strict'
import { resolveDiscordRunsFromCron } from '../worker/discord-router.js'

const daily = resolveDiscordRunsFromCron('17 14 * * *')
assert.equal(daily.length, 2)
assert.deepEqual(
  daily.map((run) => run.channelId).sort(),
  ['alpha-feed', 'unfiltered-signals'],
)

const monday = resolveDiscordRunsFromCron('17 14 * * 1')
assert.deepEqual(monday.map((run) => run.channelId), ['death-spirals'])

const thursday = resolveDiscordRunsFromCron('17 14 * * 4')
assert.deepEqual(
  thursday.map((run) => run.channelId).sort(),
  ['data-dumps', 'market-chatter'],
)

const sunday = resolveDiscordRunsFromCron('17 14 * * 0')
assert.deepEqual(sunday.map((run) => run.channelId), ['tactical-playbook'])

console.log('discord-router: ok')
