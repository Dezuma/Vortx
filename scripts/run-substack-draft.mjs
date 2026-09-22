import { readFileSync } from 'node:fs'
import { draftMarketingSubstack } from '../worker/reach-distribution.js'

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
const nameIdx = process.argv.indexOf('--name')
const spotlight = {
  name: nameIdx >= 0 ? process.argv[nameIdx + 1] : 'Public record',
  event_type: 'public_record',
  jurisdiction: 'US',
}
const result = await draftMarketingSubstack(env, spotlight, {
  force: true,
  dryRun: process.env.MARKETING_BOT_DRY_RUN !== 'false',
})
console.log(JSON.stringify(result, null, 2))
