import {
  FREE_ALPHA_CHANNELS,
  FREE_ALPHA_CATEGORY,
  listFreeAlphaChannelIds,
  runAllFreeAlphaChannels,
  runFreeAlphaChannel,
} from './discord-free-alpha.js'
import {
  UNLOCK_QUEUE_CHANNELS,
  UNLOCK_QUEUE_CATEGORY,
  listUnlockQueueChannelIds,
  runAllUnlockQueueChannels,
  runUnlockQueueChannel,
} from './discord-unlock-queue.js'

const ALL_CHANNEL_MAP = {
  ...FREE_ALPHA_CHANNELS,
  ...UNLOCK_QUEUE_CHANNELS,
}

export function resolveDiscordChannelCategory(channelId) {
  if (FREE_ALPHA_CHANNELS[channelId]) return 'free-alpha'
  if (UNLOCK_QUEUE_CHANNELS[channelId]) return 'unlock-queue'
  return null
}

export function resolveDiscordRunsFromCron(cronExpression) {
  const cron = String(cronExpression || '').trim()
  const runs = []
  for (const channelId of listFreeAlphaChannelIds()) {
    if (FREE_ALPHA_CHANNELS[channelId].crons.includes(cron)) {
      runs.push({ category: 'free-alpha', channelId })
    }
  }
  for (const channelId of listUnlockQueueChannelIds()) {
    if (UNLOCK_QUEUE_CHANNELS[channelId].crons.includes(cron)) {
      runs.push({ category: 'unlock-queue', channelId })
    }
  }
  return runs
}

export function listAllDiscordChannelIds() {
  return [...listFreeAlphaChannelIds(), ...listUnlockQueueChannelIds()]
}

export function getDiscordChannelMeta(channelId) {
  return ALL_CHANNEL_MAP[channelId] || null
}

export async function runDiscordChannel(env, deps, options = {}) {
  const category = resolveDiscordChannelCategory(options.channelId)
  if (category === 'unlock-queue') {
    return runUnlockQueueChannel(env, deps, options)
  }
  if (category === 'free-alpha') {
    return runFreeAlphaChannel(env, deps, options)
  }
  return { ok: false, skipped: true, reason: `Unknown channel: ${options.channelId}` }
}

export async function runDiscordChannelsForCron(env, deps, options = {}) {
  const runs = resolveDiscordRunsFromCron(options.cron)
  if (!runs.length) {
    return { ok: true, skipped: true, reason: 'No Discord channels mapped to this cron.' }
  }
  const channels = {}
  for (const run of runs) {
    channels[run.channelId] = await runDiscordChannel(env, deps, {
      ...options,
      channelId: run.channelId,
    })
  }
  const posted = Object.values(channels).filter((row) => row.discord_status === 'posted').length
  const skipped = Object.values(channels).filter((row) => row.skipped).length
  return { ok: true, cron: options.cron, posted, skipped, channels }
}

export async function runAllDiscordChannels(env, deps, options = {}) {
  const [freeAlpha, unlockQueue] = await Promise.all([
    runAllFreeAlphaChannels(env, deps, options),
    runAllUnlockQueueChannels(env, deps, options),
  ])
  return {
    ok: true,
    posted: freeAlpha.posted + unlockQueue.posted,
    skipped: freeAlpha.skipped + unlockQueue.skipped,
    categories: {
      [FREE_ALPHA_CATEGORY]: freeAlpha,
      [UNLOCK_QUEUE_CATEGORY]: unlockQueue,
    },
  }
}

export { FREE_ALPHA_CATEGORY, UNLOCK_QUEUE_CATEGORY }
