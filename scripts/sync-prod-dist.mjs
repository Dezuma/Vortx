#!/usr/bin/env node
/**
 * Download the live vortxmkt.com static bundle, apply copy patches, write frontend/dist.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const distDir = path.join(root, 'frontend', 'dist')
const site = process.env.PUBLIC_SITE_URL || 'https://vortxmkt.com'

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`)
  return res.text()
}

async function fetchBinary(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

function patchBundle(source) {
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
  ]
  let out = source
  for (const [from, to] of replacements) {
    if (!out.includes(from)) {
      console.warn(`warn: missing pattern: ${from.slice(0, 50)}...`)
    } else {
      out = out.replaceAll(from, to)
    }
  }
  return out
}

const html = await fetchText(`${site}/`)
const assetPaths = [...html.matchAll(/\/assets\/[^"'\s]+/g)].map((m) => m[0])
const uniqueAssets = [...new Set(assetPaths)]

fs.mkdirSync(path.join(distDir, 'assets'), { recursive: true })
fs.writeFileSync(path.join(distDir, 'index.html'), html)

const headersSrc = path.join(root, 'frontend', 'public', '_headers')
if (fs.existsSync(headersSrc)) {
  fs.copyFileSync(headersSrc, path.join(distDir, '_headers'))
}

for (const assetPath of uniqueAssets) {
  const url = `${site}${assetPath}`
  const outPath = path.join(distDir, assetPath.replace(/^\//, ''))
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  if (assetPath.endsWith('.js')) {
    const text = await fetchText(url)
    const patched = assetPath.includes('index-') && assetPath.endsWith('.js') ? patchBundle(text) : text
    fs.writeFileSync(outPath, patched)
    console.log(`wrote ${assetPath}${patched !== text ? ' (patched)' : ''}`)
  } else {
    fs.writeFileSync(outPath, await fetchBinary(url))
    console.log(`wrote ${assetPath}`)
  }
}

// Lazy chunks referenced from main bundle
const mainJs = uniqueAssets.find((p) => /\/assets\/index-.*\.js$/.test(p))
if (mainJs) {
  const mainPath = path.join(distDir, mainJs.replace(/^\//, ''))
  const mainSource = fs.readFileSync(mainPath, 'utf8')
  const lazy = [...mainSource.matchAll(/assets\/(supabase-[^"']+\.js)/g)].map((m) => `/assets/${m[1]}`)
  for (const assetPath of [...new Set(lazy)]) {
    if (uniqueAssets.includes(assetPath)) continue
    const url = `${site}${assetPath}`
    const outPath = path.join(distDir, assetPath.replace(/^\//, ''))
    fs.writeFileSync(outPath, await fetchBinary(url))
    console.log(`wrote lazy ${assetPath}`)
  }
}

console.log(`\nSynced ${uniqueAssets.length} assets to ${distDir}`)
