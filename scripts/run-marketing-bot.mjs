import { readFileSync } from 'node:fs'
import { runMarketingBot } from '../worker/x-marketing-cron.js'

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
  MARKETING_BOT_ENABLED: process.env.MARKETING_BOT_ENABLED || 'true',
  MARKETING_BOT_DRY_RUN: process.env.MARKETING_BOT_DRY_RUN || 'true',
  MARKETING_IMAGE_MODE: process.env.MARKETING_IMAGE_MODE || 'teaser-card',
}

const result = await runMarketingBot(env, { force: true })
console.log(JSON.stringify(result, null, 2))
