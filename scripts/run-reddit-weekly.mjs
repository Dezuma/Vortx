import { readFileSync } from 'node:fs'
import { runRedditBot } from '../worker/x-marketing-cron.js'

function readDevVars() {
  const env = {}
  const text = readFileSync('.dev.vars', 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [key, ...parts] = line.split('=')
    env[key.trim()] = parts.join('=').trim()
  }
  return env
}

const env = {
  ...readDevVars(),
  ...process.env,
  REDDIT_BOT_ENABLED: process.env.REDDIT_BOT_ENABLED || 'true',
  REDDIT_BOT_DRY_RUN: process.env.REDDIT_BOT_DRY_RUN || 'true',
}

const forcePost = String(env.REDDIT_BOT_DRY_RUN).toLowerCase() === 'false'
const result = await runRedditBot(env, { force: true, forcePost, dryRun: !forcePost })
console.log(JSON.stringify(result, null, 2))
