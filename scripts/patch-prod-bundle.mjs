#!/usr/bin/env node
/**
 * Patch live production bundle strings (heat map disclaimer + customer login copy).
 * Used when dist is synced from production before deploy.
 */
import fs from 'node:fs'
import path from 'node:path'

const bundlePath = process.argv[2]
if (!bundlePath) {
  console.error('Usage: node scripts/patch-prod-bundle.mjs <path-to-index-*.js>')
  process.exit(1)
}

const file = path.resolve(bundlePath)
let source = fs.readFileSync(file, 'utf8')

const replacements = [
  [
    'A high score means faster review is warranted. It does not mean wrongdoing has been proven.',
    'Scores reflect record recency, severity, and source confidence. Higher scores indicate records that warrant earlier review. Scores are not predictions of legal outcomes. It does not mean wrongdoing has been proven.',
  ],
  [
    'Subscription features unlock only after Supabase Auth and Worker-side plan checks pass.',
    'Sign in to access your watchlists, alerts, and exports.',
  ],
  [
    'Supabase browser auth is not configured.',
    'Sign-in is not available right now. Please contact support.',
  ],
  ['enter email to continue', 'Start checkout'],
]

const checkoutPromptBlock =
  'if(!t){t=window.prompt(`Enter your email to continue checkout.`)||``;if(!t)return}'
if (source.includes(checkoutPromptBlock)) {
  source = source.replace(checkoutPromptBlock, '')
  console.log('Removed pre-checkout email prompt from bundle.')
}

for (const [from, to] of replacements) {
  if (!source.includes(from)) {
    console.warn(`warn: pattern not found: ${from.slice(0, 60)}...`)
    continue
  }
  source = source.replaceAll(from, to)
}

const standalonePathResetFrom = 'n.pathname === `/scan` && (n.pathname = `/`)'
const standalonePathResetTo =
  '(n.pathname === `/scan` || n.pathname === `/contractor-check` || n.pathname === `/job-safety-score`) && (n.pathname = `/`)'
if (source.includes(standalonePathResetFrom)) {
  source = source.replaceAll(standalonePathResetFrom, standalonePathResetTo)
  console.log('Patched SPA pathname reset for consumer tool pages.')
} else {
  console.warn('warn: SPA pathname reset anchor not found in bundle.')
}

fs.writeFileSync(file, source)
console.log(`patched ${file}`)
