import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = resolve(import.meta.dirname, '..')

function readDevVars() {
  const env = {}
  const text = readFileSync(resolve(ROOT, '.dev.vars'), 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [key, ...parts] = line.split('=')
    env[key.trim()] = parts.join('=').trim()
  }
  return env
}

function requireEnv(env, key) {
  const value = String(env[key] || '').trim()
  if (!value) throw new Error(`Missing ${key} in .dev.vars`)
  return value
}

async function rest(env, path, init = {}) {
  const url = requireEnv(env, 'VITE_SUPABASE_URL').replace(/\/$/, '')
  const key = requireEnv(env, 'SUPABASE_SERVICE_ROLE_KEY')
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      accept: 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  return { ok: response.ok, status: response.status, payload }
}

function runStep(label, command, args, options = {}) {
  console.log(`\n==> ${label}`)
  const result = spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    stdio: 'inherit',
    env: process.env,
  })
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit ${result.status ?? 'unknown'}`)
  }
}

async function main() {
  const env = readDevVars()
  const report = { ok: true, steps: [] }

  const tickerProbe = await rest(env, 'entities?select=id,ticker&limit=5')
  report.steps.push({
    step: 'entities_ticker_probe',
    ok: tickerProbe.ok,
    sample_count: Array.isArray(tickerProbe.payload) ? tickerProbe.payload.length : 0,
  })
  if (!tickerProbe.ok) report.ok = false

  const companiesProbe = await rest(env, 'companies?select=id&limit=1')
  const viewsDeployed = companiesProbe.ok
  report.steps.push({
    step: 'views_deployed',
    ok: viewsDeployed,
    hint: viewsDeployed
      ? null
      : 'Run: SUPABASE_DB_PASSWORD=... npx supabase db push --linked (API fallback active until views exist)',
  })
  if (!viewsDeployed) {
    console.warn('warn: companies/signals views not deployed; trading page uses /api/trading-signals fallback')
  }

  try {
    runStep('Backfill tickers', 'npx', ['tsx', 'scripts/backfill-tickers.ts'])
    report.steps.push({ step: 'backfill_tickers', ok: true })
  } catch (error) {
    report.ok = false
    report.steps.push({
      step: 'backfill_tickers',
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  runStep('Ticker match unit tests', 'npm', ['run', 'ingest:test-ticker'])
  report.steps.push({ step: 'ticker_tests', ok: true })

  runStep('Frontend typecheck', 'npm', ['run', 'typecheck'], { cwd: resolve(ROOT, 'frontend') })
  report.steps.push({ step: 'frontend_typecheck', ok: true })

  runStep('Frontend build', 'npm', ['run', 'build'], { cwd: resolve(ROOT, 'frontend') })
  report.steps.push({ step: 'frontend_build', ok: true })

  const tickerRows = await rest(env, 'entities?select=id,ticker,canonical_name&ticker=not.is.null&limit=10')
  report.steps.push({
    step: 'ticker_entity_count_sample',
    ok: tickerRows.ok,
    count: Array.isArray(tickerRows.payload) ? tickerRows.payload.length : 0,
  })

  const site = String(env.PUBLIC_SITE_URL || 'https://vortxmkt.com').replace(/\/$/, '')
  const apiRes = await fetch(`${site}/api/trading-signals`)
  const apiPayload = apiRes.ok ? await apiRes.json() : { error: await apiRes.text() }
  report.steps.push({
    step: 'live_trading_api',
    ok: apiRes.ok,
    status: apiRes.status,
    count: apiPayload?.count ?? 0,
    source: apiPayload?.source ?? null,
  })
  if (!apiRes.ok) {
    report.ok = false
    report.steps[report.steps.length - 1].hint =
      'Deploy worker: cd vortx && set -a && source ./.dev.vars && set +a && npm run deploy'
  }

  console.log('\n' + JSON.stringify(report, null, 2))
  if (!report.ok) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
