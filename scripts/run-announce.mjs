import { readFileSync } from 'node:fs'
import { postAnnouncement } from '../worker/reach-distribution.js'

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
    /* local secrets file is optional */
  }
  return env
}

const env = { ...readDevVars(), ...process.env }
const kind = process.argv.includes('--live') ? 'live' : 'youtube'
const platform = process.argv.includes('--twitch') ? 'twitch' : process.argv.includes('--kick') ? 'kick' : 'youtube'
const titleIdx = process.argv.indexOf('--title')
const urlIdx = process.argv.indexOf('--url')
const title = titleIdx >= 0 ? process.argv[titleIdx + 1] : 'New ByBizu drop'
const url = urlIdx >= 0 ? process.argv[urlIdx + 1] : ''

const result = await postAnnouncement(
  env,
  { kind, platform, title, url },
  { force: true, dryRun: process.env.MARKETING_BOT_DRY_RUN !== 'false' },
)
console.log(JSON.stringify(result, null, 2))
