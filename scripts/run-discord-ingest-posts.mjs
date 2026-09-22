import { readFileSync } from 'node:fs'
import { runDiscordIngestPosts } from '../worker/discord-ingest-posts.js'

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

const env = {
  ...readDevVars(),
  ...process.env,
  DISCORD_BOT_ENABLED: process.env.DISCORD_BOT_ENABLED || 'true',
  DISCORD_INGEST_POSTS_ENABLED: process.env.DISCORD_INGEST_POSTS_ENABLED || 'true',
}

const dryRun = ['1', 'true', 'yes', 'on'].includes(
  String(env.DISCORD_BOT_DRY_RUN ?? 'true').toLowerCase(),
)

const result = await runDiscordIngestPosts(env, { force: true, dryRun })
console.log(JSON.stringify(result, null, 2))
if (!result.ok && !result.skipped) process.exit(1)
