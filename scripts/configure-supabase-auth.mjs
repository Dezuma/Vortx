#!/usr/bin/env node
/**
 * Push auth redirect URLs to hosted Supabase via Management API.
 * Requires SUPABASE_ACCESS_TOKEN (Account → Access Tokens) with auth write scope.
 * Never prints secret values.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const PROJECT_REF = 'gejjtdrqyahajtijvghb'

function readToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) return process.env.SUPABASE_ACCESS_TOKEN.trim()
  const paths = [
    resolve(process.env.HOME || '', '.config/supabase/access-token'),
    resolve(process.env.HOME || '', '.supabase/access-token'),
  ]
  for (const p of paths) {
    if (existsSync(p)) {
      const t = readFileSync(p, 'utf8').trim()
      if (t) return t
    }
  }
  return ''
}

function parseRedirectUrls() {
  const configPath = resolve(root, 'supabase/config.toml')
  const text = readFileSync(configPath, 'utf8')
  const siteMatch = text.match(/site_url\s*=\s*"([^"]+)"/)
  const siteUrl = siteMatch?.[1] || 'https://vortxmkt.com'
  const blockMatch = text.match(/additional_redirect_urls\s*=\s*\[([\s\S]*?)\]/)
  const urls = [siteUrl]
  if (blockMatch) {
    for (const m of blockMatch[1].matchAll(/"([^"]+)"/g)) urls.push(m[1])
  }
  return [...new Set(urls)]
}

function dashboardSteps() {
  console.log('\nManual Supabase dashboard steps (Authentication → URL Configuration):')
  console.log('  Site URL: https://vortxmkt.com')
  console.log('  Redirect URLs: copy each line from supabase/config.toml additional_redirect_urls')
  console.log('\nFor GitHub OAuth (Authentication → Providers → GitHub):')
  console.log('  Disable GitHub unless you need it: toggle off, or run:')
  console.log('  node scripts/configure-supabase-auth.mjs --disable-github  (requires SUPABASE_ACCESS_TOKEN)')
  console.log('  Callback URL: https://gejjtdrqyahajtijvghb.supabase.co/auth/v1/callback')
  try {
    const keys = readFileSync(resolve(root, '.dev.vars'), 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => line.split('=')[0].trim())
      .filter((name) => /^GITHUB_/i.test(name))
    if (keys.length) console.log(`\nGitHub-related keys in .dev.vars: ${keys.join(', ')} (Supabase dashboard still owns OAuth credentials)`)
    else console.log('\nNo GITHUB_* keys in .dev.vars — add GitHub OAuth credentials in Supabase dashboard.')
  } catch {}
}

async function main() {
  const token = readToken()
  const redirectUrls = parseRedirectUrls()

  if (!token) {
    console.log('SUPABASE_ACCESS_TOKEN not found — skipping Management API apply.')
    dashboardSteps()
    process.exit(0)
  }

  const disableGithub = process.argv.includes('--disable-github')

  const getRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!getRes.ok) {
    console.error(`Failed to read auth config: HTTP ${getRes.status}`)
    dashboardSteps()
    process.exit(1)
  }

  const current = await getRes.json()
  const merged = [...new Set([...(current.uri_allow_list || current.additional_redirect_urls || []), ...redirectUrls])]

  const patchBody = {
    site_url: 'https://vortxmkt.com',
    uri_allow_list: merged,
  }
  if (disableGithub) patchBody.external_github_enabled = false

  const patchRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(patchBody),
  })

  if (!patchRes.ok) {
    const body = await patchRes.text().catch(() => '')
    console.error(`Failed to update auth config: HTTP ${patchRes.status}`)
    if (body && !body.includes('secret')) console.error(body.slice(0, 400))
    dashboardSteps()
    process.exit(1)
  }

  console.log(`Auth config updated for ${PROJECT_REF}.`)
  console.log(`Redirect URLs on project: ${merged.length} entries`)
  if (disableGithub) console.log('GitHub OAuth provider disabled (external_github_enabled=false).')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
