#!/usr/bin/env node
/**
 * Wrangler pre-deploy: lock frontend/dist to the approved glassmorphic bundle.
 * Do not run `npm run build` from frontend/src here — src has diverged from production UI.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { SHARE_COPY } from '../frontend/functions/lib/product-positioning.js'
import { socialCardUrl } from '../frontend/functions/lib/social-card.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const frontendDir = path.join(root, 'frontend')
const distDir = path.join(frontendDir, 'dist')
const assetsDir = path.join(distDir, 'assets')
const publicSiteScript = path.join(frontendDir, 'public', 'vortx-site.js')
const distSiteScript = path.join(distDir, 'vortx-site.js')
const publicMapScript = path.join(frontendDir, 'public', 'vortx-map.js')
const distMapScript = path.join(distDir, 'vortx-map.js')
const publicMapStyles = path.join(frontendDir, 'public', 'vortx-map.css')
const distMapStyles = path.join(distDir, 'vortx-map.css')
const maplibreSourceDir = path.join(frontendDir, 'node_modules', 'maplibre-gl', 'dist')
const maplibreDistDir = path.join(distDir, 'maplibre')
const analyticsScript = path.join(frontendDir, 'public', 'analytics.js')
const distAnalyticsScript = path.join(distDir, 'analytics.js')

const approvedAssetPaths = [
  '/assets/rolldown-runtime-BYbx6iT9.js',
  '/assets/motion-CC24LwRe.js',
  '/assets/query-BjO_Fhx3.js',
  '/assets/react-Wp7kRcAp.js',
  '/assets/index-CHC0SQxE.css',
  '/assets/index-C-ubd9Cu.js',
  '/assets/supabase-D4HD8mHW.js',
  '/assets/supabase-BKR_xaUQ.js',
]

function assertAsset(assetPath) {
  const file = path.join(distDir, assetPath.replace(/^\//, ''))
  if (!fs.existsSync(file)) {
    throw new Error(
      `Missing approved UI asset: ${assetPath}\n` +
        'Run: node scripts/sync-prod-dist.mjs  (after approved bundle is live on vortxmkt.com)',
    )
  }
  const head = fs.readFileSync(file, 'utf8').slice(0, 80)
  if (/^\s*<!doctype html>/i.test(head)) {
    throw new Error(`Approved asset is HTML, not a real asset: ${assetPath}`)
  }
}

const syncBundle = spawnSync(process.execPath, ['scripts/sync-approved-bundle.mjs'], {
  cwd: root,
  stdio: 'inherit',
})
if (syncBundle.status !== 0) {
  throw new Error('sync-approved-bundle failed')
}

for (const assetPath of approvedAssetPaths) assertAsset(assetPath)

const mainBundle = path.join(assetsDir, 'index-C-ubd9Cu.js')
const bundleSource = fs.readFileSync(mainBundle, 'utf8')
if (bundleSource.includes('pretending they saw it coming')) {
  throw new Error('Refusing to deploy: bundle contains removed marketing hero copy')
}

const patchBundle = spawnSync(process.execPath, ['scripts/patch-prod-bundle.mjs', mainBundle], {
  cwd: root,
  stdio: 'inherit',
})
if (patchBundle.status !== 0) {
  throw new Error('patch-prod-bundle failed')
}

const patchPasskeys = spawnSync(process.execPath, ['scripts/patch-passkey-auth.mjs', mainBundle], {
  cwd: root,
  stdio: 'inherit',
})
if (patchPasskeys.status !== 0) {
  throw new Error('patch-passkey-auth failed')
}

const approvedHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/branding/favicon.ico?v=14" sizes="any" />
    <link rel="icon" type="image/svg+xml" href="/branding/favicon.svg?v=14" />
    <link rel="icon" type="image/png" sizes="512x512" href="/branding/favicon-512.png?v=14" />
    <link rel="icon" type="image/png" sizes="32x32" href="/branding/favicon-32.png?v=14" />
    <link rel="apple-touch-icon" href="/branding/apple-touch-icon.png?v=14" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#030712" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="description" content="${SHARE_COPY.description}" />
    <meta property="og:title" content="${SHARE_COPY.title}" />
    <meta property="og:description" content="${SHARE_COPY.description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://vortxmkt.com/" />
    <meta property="og:image" content="${socialCardUrl()}" />
    <meta property="og:image:alt" content="${SHARE_COPY.imageAlt}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${socialCardUrl()}" />
    <title>${SHARE_COPY.title}</title>
    <link rel="modulepreload" crossorigin href="/assets/rolldown-runtime-BYbx6iT9.js">
    <link rel="modulepreload" crossorigin href="/assets/motion-CC24LwRe.js">
    <link rel="modulepreload" crossorigin href="/assets/query-BjO_Fhx3.js">
    <link rel="modulepreload" crossorigin href="/assets/react-Wp7kRcAp.js">
    <link rel="stylesheet" crossorigin href="/assets/index-CHC0SQxE.css">
    <link rel="stylesheet" href="/maplibre/maplibre-gl.css">
    <link rel="stylesheet" href="/vortx-map.css?v=18">
    <script type="module" crossorigin src="/assets/index-C-ubd9Cu.js?v=map77"></script>
  </head>
  <body>
    <div id="root"></div>
    <script src="/analytics.js" defer></script>
    <script src="/vortx-map.js?v=11"></script>
    <script src="/vortx-site.js?v=94"></script>
  </body>
</html>
`

fs.writeFileSync(path.join(distDir, 'index.html'), approvedHtml)

if (!fs.existsSync(publicSiteScript)) {
  throw new Error(`Missing site bootstrap script: ${publicSiteScript}`)
}
fs.copyFileSync(publicSiteScript, distSiteScript)

if (!fs.existsSync(publicMapScript)) {
  throw new Error(`Missing map bootstrap script: ${publicMapScript}`)
}
fs.copyFileSync(publicMapScript, distMapScript)
if (!fs.existsSync(publicMapStyles)) {
  throw new Error(`Missing map styles: ${publicMapStyles}`)
}
fs.copyFileSync(publicMapStyles, distMapStyles)

fs.mkdirSync(maplibreDistDir, { recursive: true })
for (const name of [
  'maplibre-gl.mjs',
  'maplibre-gl-shared.mjs',
  'maplibre-gl-worker.mjs',
  'maplibre-gl.css',
]) {
  const srcFile = path.join(maplibreSourceDir, name)
  if (!fs.existsSync(srcFile)) {
    throw new Error(`Missing MapLibre runtime asset: ${srcFile}`)
  }
  fs.copyFileSync(srcFile, path.join(maplibreDistDir, name))
}

if (fs.existsSync(analyticsScript)) {
  fs.copyFileSync(analyticsScript, distAnalyticsScript)
}

for (const name of ['trusted-types.js', 'passkeys.js']) {
  const src = path.join(frontendDir, 'public', name)
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(distDir, name))
}

const contractorCheckScript = path.join(frontendDir, 'public', 'contractor-check.js')
const distContractorScript = path.join(distDir, 'contractor-check.js')
if (fs.existsSync(contractorCheckScript)) {
  fs.copyFileSync(contractorCheckScript, distContractorScript)
}

const jobSafetyScript = path.join(frontendDir, 'public', 'job-safety-score.js')
const distJobSafetyScript = path.join(distDir, 'job-safety-score.js')
if (fs.existsSync(jobSafetyScript)) {
  fs.copyFileSync(jobSafetyScript, distJobSafetyScript)
}

const statesmanWatermark = path.join(frontendDir, 'public', 'statesman-watermark.svg')
if (fs.existsSync(statesmanWatermark)) {
  fs.copyFileSync(statesmanWatermark, path.join(distDir, 'statesman-watermark.svg'))
}

const landlordCheckScript = path.join(frontendDir, 'public', 'landlord-check.js')
const distLandlordScript = path.join(distDir, 'landlord-check.js')
if (fs.existsSync(landlordCheckScript)) {
  fs.copyFileSync(landlordCheckScript, distLandlordScript)
}

const headersSrc = path.join(frontendDir, 'public', '_headers')
if (fs.existsSync(headersSrc)) {
  fs.copyFileSync(headersSrc, path.join(distDir, '_headers'))
}

const redirectsSrc = path.join(frontendDir, 'public', '_redirects')
if (fs.existsSync(redirectsSrc)) {
  fs.copyFileSync(redirectsSrc, path.join(distDir, '_redirects'))
}

for (const name of ['robots.txt', 'sitemap.xml']) {
  const seoSrc = path.join(frontendDir, 'public', name)
  if (fs.existsSync(seoSrc)) {
    fs.copyFileSync(seoSrc, path.join(distDir, name))
  }
}

for (const name of ['social-card.png', 'social-card.svg']) {
  const socialCardSrc = path.join(frontendDir, 'public', name)
  if (fs.existsSync(socialCardSrc)) {
    fs.copyFileSync(socialCardSrc, path.join(distDir, name))
  }
}

const congressMapSrc = path.join(frontendDir, 'public', 'congress-bioguide.json')
if (fs.existsSync(congressMapSrc)) {
  fs.copyFileSync(congressMapSrc, path.join(distDir, 'congress-bioguide.json'))
}

const brandingSrc = path.join(frontendDir, 'public', 'branding')
const brandingDist = path.join(distDir, 'branding')
if (fs.existsSync(brandingSrc)) {
  fs.mkdirSync(brandingDist, { recursive: true })
  for (const name of fs.readdirSync(brandingSrc)) {
    const srcFile = path.join(brandingSrc, name)
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, path.join(brandingDist, name))
    }
  }
}

const docsSrc = path.join(frontendDir, 'public', 'docs')
const docsDist = path.join(distDir, 'docs')
if (fs.existsSync(docsSrc)) {
  fs.mkdirSync(docsDist, { recursive: true })
  for (const name of fs.readdirSync(docsSrc)) {
    const srcFile = path.join(docsSrc, name)
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, path.join(docsDist, name))
    }
  }
}

const adminPatch = spawnSync(process.execPath, ['scripts/patch-admin-console.mjs', mainBundle], {
  cwd: root,
  stdio: 'inherit',
})
if (adminPatch.status !== 0) {
  console.warn('warn: admin console patch skipped (site bundle left without admin UI panels)')
}

const syntax = spawnSync(process.execPath, ['--check', mainBundle], { encoding: 'utf8' })
if (syntax.status !== 0) {
  throw new Error(`Main bundle failed syntax check: ${syntax.stderr || syntax.stdout}`)
}

fs.copyFileSync(mainBundle, path.join(frontendDir, '.prod-reference.js'))

console.log('frontend/dist verified and locked to approved glassmorphic UI bundle.')
