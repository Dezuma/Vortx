import { readFileSync } from 'node:fs'
import { runDiscordSignalBot } from '../worker/x-marketing-cron.js'

function readDevVars() {
  const env = {}
  try {
    const text = readFileSync('.dev.vars', 'utf8')
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#') || !line.includes('=')) continue
      const [key, ...parts] = line.split('=')
      env[key.trim()] = parts.join('=').trim()
    }
  } catch {
    // optional local secrets
  }
  return env
}

const args = process.argv.slice(2)
const allChannels = args.includes('--all')
const channelArg = args.find((arg) => arg.startsWith('--channel='))
const channelId = channelArg ? channelArg.slice('--channel='.length) : 'alpha-feed'

const env = {
  ...readDevVars(),
  ...process.env,
}

const dryRun = ['1', 'true', 'yes', 'on'].includes(
  String(env.DISCORD_BOT_DRY_RUN ?? process.env.DISCORD_BOT_DRY_RUN ?? 'true').toLowerCase(),
)
const enabled = ['1', 'true', 'yes', 'on'].includes(
  String(env.DISCORD_BOT_ENABLED ?? process.env.DISCORD_BOT_ENABLED ?? 'true').toLowerCase(),
)

if (!enabled) {
  console.error('error: set DISCORD_BOT_ENABLED=true')
  process.exit(1)
}

const result = await runDiscordSignalBot(env, {
  force: true,
  forcePost: !dryRun,
  ...(allChannels ? { allChannels: true } : { channelId }),
})

if (result.categories) {
  for (const [category, block] of Object.entries(result.categories)) {
    for (const [channel, row] of Object.entries(block.channels || {})) {
      if (row.discord_text) {
        console.log(`--- ${category} / ${channel} ---`)
        console.log(row.discord_text)
      }
    }
  }
  console.log('---')
} else if (result.channels) {
  for (const [channel, row] of Object.entries(result.channels)) {
    if (row.discord_text) {
      console.log(`--- ${channel} ---`)
      console.log(row.discord_text)
    }
  }
  console.log('---')
} else if (result.discord_text) {
  console.log(result.discord_text)
  console.log('---')
}
console.log(JSON.stringify(result, null, 2))

if (!result.ok && !result.skipped) {
  process.exit(1)
}
