import { readFileSync } from 'node:fs'
import { runIngest } from '../worker/ingest-cron.js'

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

const result = await runIngest(readDevVars())
console.log(JSON.stringify(result, null, 2))
