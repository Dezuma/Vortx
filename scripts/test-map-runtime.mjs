#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { projectRoot } from './lib/supabase-pg.mjs'

const root = projectRoot()
const runtime = readFileSync(resolve(root, 'frontend/public/vortx-map.js'), 'utf8')
const styles = readFileSync(resolve(root, 'frontend/public/vortx-map.css'), 'utf8')
const bundle = readFileSync(resolve(root, 'frontend/.prod-reference.js'), 'utf8')

assert.match(runtime, /https:\/\/tiles\.openfreemap\.org\/styles\/positron/)
assert.match(runtime, /https:\/\/tiles\.openfreemap\.org\/styles\/dark/)
assert.match(runtime, /center:\s*\[-96,\s*38\]/)
assert.match(runtime, /zoom:\s*3\.5/)
assert.match(runtime, /minZoom:\s*0/)
assert.match(runtime, /renderWorldCopies:\s*false/)
assert.match(runtime, /setProjection\(\{\s*type:\s*'globe'\s*\}\)/)
assert.match(runtime, /map\.setSky\(/)
assert.match(runtime, /vortx-map-clusters-glow/)
assert.match(runtime, /vortx-map-points-glow/)
assert.match(runtime, /distressCount/)
assert.match(runtime, /syncThemeLayers/)
assert.doesNotMatch(runtime, /maxBounds:\s*\[/)
assert.doesNotMatch(runtime, /center:\s*\[12,\s*20\]/)
assert.match(runtime, /map\.getBounds\(\)/)
assert.match(runtime, /'\/api\/map\/signals\?' \+ params\.toString\(\)/)
assert.match(runtime, /cluster:\s*true/)
assert.match(runtime, /clusterMaxZoom:\s*10/)
assert.match(runtime, /clusterRadius:\s*24/)
assert.match(runtime, /'text-padding':\s*0/)
assert.match(runtime, /'interpolate'[\s\S]*?\['get', 'point_count'\]/)
assert.match(runtime, /getClusterExpansionZoom/)
assert.match(runtime, /map\.easeTo\(\{\s*center:\s*coordinates,\s*zoom:\s*zoom,\s*duration:\s*650/)
assert.match(runtime, /map\.on\('moveend',\s*scheduleViewportLoad\)/)
assert.match(runtime, /setTimeout\(function \(\) \{[\s\S]*?\}, 180\)/)
assert.match(runtime, /fallbackFeatures:/)
assert.match(runtime, /map\.on\('click',\s*pointLayerId/)
assert.match(runtime, /onPointClick\(id\)/)
assert.match(runtime, /getViewport:\s*function/)
assert.match(runtime, /setAuthToken:\s*function/)
assert.match(runtime, /setFilters:\s*function/)
assert.match(runtime, /cross_only/)
assert.match(runtime, /if \(abortController\) abortController\.abort\(\)/)
assert.match(runtime, /#FF3366/)
assert.match(runtime, /#FEE2E2/)
assert.match(runtime, /#00FF87/)
assert.match(runtime, /#DCFCE7/)
assert.match(runtime, /#FFB800/)
assert.match(runtime, /#FEF3C7/)

assert.match(styles, /--map-bg:\s*#030712/)
assert.match(styles, /--map-bg:\s*#070b12/)
assert.match(styles, /\.vortx-map-page--dark/)
assert.match(styles, /\.vortx-map-canvas/)
assert.match(styles, /\.vortx-map-story/)
assert.match(styles, /\.vortx-map-brief/)
assert.match(styles, /\.vortx-map-verdict/)
assert.match(styles, /\.vortx-map-stat-chip/)
assert.match(styles, /\.vortx-map-hint/)
assert.match(styles, /radial-gradient/)
assert.match(styles, /\.vortx-map-drawer/)
assert.match(styles, /\.vortx-map-toolbar/)
assert.match(styles, /min-height:\s*20rem/)
assert.match(styles, /height:\s*min\(62svh,\s*34rem\)/)
assert.match(styles, /height:\s*min\(62dvh,\s*34rem\)/)
assert.match(styles, /position:\s*relative/)
assert.match(styles, /top:\s*auto/)
assert.match(styles, /\.vortx-map-cross-box/)
assert.match(styles, /\.vortx-map-loading/)
assert.match(styles, /\.vortx-map-fallback/)
assert.match(bundle, /\{ id: `map`, label: `Map` \}/)
assert.match(bundle, /See where those trades and layoffs landed/)
assert.match(bundle, /vortx-map-story/)
assert.match(bundle, /vortx-map-brief/)
assert.match(bundle, /vortx-map-verdict/)
assert.match(bundle, /Needs attention/)
assert.match(bundle, /LiveQuoteLinks/)
assert.match(bundle, /Open live quote/)
assert.match(bundle, /Trade live/)
assert.match(bundle, /function tapeHref\(/)
assert.match(bundle, /function liveQuoteHref\(/)
assert.match(bundle, /Trade pins/)
assert.match(bundle, /Not a signal/)
assert.match(bundle, /How this helps a trader/)
assert.match(bundle, /See Congress and insider stock trades/)
assert.match(bundle, /This is the list of trades Congress, insiders, and funds already reported/)
assert.match(bundle, /function homeTickerProduct\(/)
assert.match(bundle, /function isUsableGuestTrade\(/)
assert.match(bundle, /function splitMashedFilerName\(/)
assert.match(bundle, /if \(home\) return `home`/)
assert.match(bundle, /Ticker`, `Bought or sold`, `Amount`, `Who`/)
assert.match(bundle, /function FilerNameCell\(/)
assert.match(bundle, /vortx-filer__desk/)
assert.match(bundle, /Trade live opens a quote/)
assert.match(bundle, /function homeUseSteps\(/)
assert.match(bundle, /What to do/)
assert.match(bundle, /Type a ticker/)
assert.match(bundle, /See today's trades/)
assert.match(bundle, /Lawmaker stock trades/)
assert.doesNotMatch(bundle, /Catch the filing before the headline/)
assert.doesNotMatch(bundle, /Browse the tape/)
assert.match(bundle, /function mapCallingCard\(/)
assert.match(bundle, /Open the globe/)
assert.match(bundle, /vortx-site-header/)
assert.match(bundle, /trades in this list/)
assert.doesNotMatch(bundle, /filings in this refresh/)
assert.doesNotMatch(bundle, /hover:bg-sky-50 hover:text-ink/)
assert.doesNotMatch(bundle, /Political & Insider Trading/)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /color-scheme:dark/)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /\.vortx-use-steps\{/)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /\.vortx-check\{/)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /\.vortx-use-card\{/)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /\.vortx-site-footer\{position:relative/)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /\.vortx-app-main\{position:relative/)
assert.doesNotMatch(
  readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'),
  /\.vortx-app-shell > \*:not\(\.vortx-politician-stage\)/,
)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /\.vortx-desk-terminal \.vortx-trade-filter--active\{background:#0369a1/)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /\.vortx-pricing-card__cta:disabled\{[^}]*pointer-events:none/)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /\.vortx-politician-stage\{display:none/)
assert.doesNotMatch(bundle, /vortx-politician-portrait/)
assert.match(bundle, /vortx-stage/)
assert.match(bundle, /vortx-hero-character/)
assert.match(bundle, /theodore-roosevelt\.webp\?v=7/)
assert.match(
  readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'),
  /\.vortx-hero-character\{[^}]*background:#0b1220/,
)
assert.match(
  readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'),
  /\.vortx-filer-face__photo\{position:absolute;inset:0/,
)
assert.match(bundle, /Drag to flip/)
assert.match(bundle, /"aria-roledescription": `carousel`/)
assert.match(bundle, /"data-slot": slot/)
assert.match(bundle, /onPointerDown/)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /vortx-stage__stack--dragging/)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /data-slot="front"/)
assert.match(bundle, /function floatingTestimonials/)
assert.match(bundle, /function rotateQuoteLane\(/)
assert.match(bundle, /\[`--quote-ms`\]: `42s`/)
assert.match(bundle, /\[`--quote-delay`\]: `0s`/)
assert.doesNotMatch(bundle, /--float-ms/)
assert.match(bundle, /deskLiveTicker, \{ events: e, variant: `home` \}/)
assert.match(bundle, /id: `todays-trades`/)
assert.match(bundle, /className: terminal \? `vortx-live-board`/)
assert.match(bundle, /Green up is a buy/)
assert.match(bundle, /vortx-live-board__mast/)
assert.match(bundle, /vortx-trade-controls--compact/)
assert.match(bundle, /Click Their trades to open one person/)
assert.match(bundle, /GREEK_FIELD_COLORS/)
assert.match(bundle, /#1e293b/)
assert.match(bundle, /vortx-whale-layer/)
assert.match(bundle, /vortx-whale__backdrop/)
assert.match(bundle, /vortx-whale-open/)
assert.match(
  readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'),
  /html\.vortx-whale-open/,
)
assert.doesNotMatch(
  readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'),
  /glyph-color,#38bdf8/,
)
assert.doesNotMatch(
  readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'),
  /@keyframes vortx-quote-float/,
)
assert.match(
  readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'),
  /\.vortx-live-board\{/,
)
assert.doesNotMatch(
  readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'),
  /@media \(max-width:720px\)\{\.vortx-greek-field\{display:none\}/,
)
assert.match(bundle, /function floatingTestimonials\(/)
assert.match(bundle, /rotateQuoteLane\(chips, 0\)/)
assert.doesNotMatch(bundle, /\[0, 1, 2\]\.map\(\(laneIdx\) => rotateQuoteLane/)
assert.match(
  readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'),
  /\.vortx-quote-lane--echo\{display:none\}/,
)
assert.match(
  readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'),
  /animation-delay:var\(--quote-delay/,
)
assert.match(bundle, /CUSTOMER_TESTIMONIALS/)
assert.match(bundle, /vortx-quote-river/)
assert.match(bundle, /vortx-terminal-home relative z-10 pb-10/)
assert.match(bundle, /vortx-page-col/)
assert.doesNotMatch(bundle, /vortx-terminal-home relative z-10 mx-auto max-w-6xl/)
assert.match(
  readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'),
  /--vortx-page:min\(88rem/,
)
assert.doesNotMatch(
  readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'),
  /min-width:901px\)\{\.vortx-quote-river\{width:100vw/,
)
assert.match(bundle, /From customers/)
assert.match(bundle, /Sarah Jenkins/)
assert.match(bundle, /when executives actually buy shares/)
assert.match(bundle, /Reading big-fund holdings reports/)
{
  const testimonials = bundle.match(/CUSTOMER_TESTIMONIALS = \[([\s\S]*?)\],\s*\n  R = new Set/)
  assert.ok(testimonials, 'CUSTOMER_TESTIMONIALS array should sit before route set')
  assert.equal([...testimonials[1].matchAll(/\bquote:/g)].length, 4)
}
assert.match(bundle, /className: `vortx-live-block`[\s\S]*testimonialsBlock/)
assert.match(bundle, /Showing \$\{shownCount\} of \$\{tradingCount\} in this list/)
assert.doesNotMatch(bundle, /trades in this list · showing/)
assert.match(bundle, /vortx-nebula-tip/)
assert.match(bundle, /\/\?view=pricing&plan=nebula/)
assert.match(bundle, /Nebula is the \$150\/month Vortx plan/)
assert.match(bundle, /actionLabel: holdingsReport \? `Holdings report`/)
assert.match(
  readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'),
  /button\.vortx-nebula-tip\{background:none/,
)
assert.doesNotMatch(bundle, /Form 4 filings are notoriously noisy/)
assert.doesNotMatch(bundle, /15% outperformance/)
assert.doesNotMatch(bundle, /Smart Money/)
assert.doesNotMatch(bundle, /Druckenmiller/)
assert.doesNotMatch(bundle, /RSU vests/)
assert.doesNotMatch(bundle, /periodic transaction reports/)
assert.doesNotMatch(bundle, /via WebSockets/)
assert.doesNotMatch(bundle, /function filingRiverChips/)
assert.doesNotMatch(bundle, /GENERATED_TESTIMONIALS/)
assert.doesNotMatch(bundle, /On this tape/)
assert.doesNotMatch(bundle, /Overheard/)
assert.doesNotMatch(bundle, /Signed up because I was tired of finding out from a group chat/)
assert.doesNotMatch(bundle, /That is the whole product/)
assert.doesNotMatch(bundle, /From research desks/)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /vortx-quote-drift/)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /transparent 12%/)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /vortx-quote-chip\[data-copy="b"\]/)
assert.match(bundle, /Today's trades/)
assert.match(bundle, /function tapeHowToRead\(/)
assert.match(bundle, /function buildWhaleCard\(/)
assert.match(bundle, /function whaleWatchPanel\(/)
assert.match(bundle, /function useWhaleWho\(/)
assert.match(bundle, /Their trades/)
assert.match(bundle, /not a score of whether they made money/)
assert.match(bundle, /Person desk: every trade by one filer/)
assert.match(bundle, /Unusual size vs their own filings/)
assert.doesNotMatch(bundle, /win rate/i)
assert.doesNotMatch(bundle, /predictive success/i)
assert.match(
  readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'),
  /\.vortx-whale\{/,
)
assert.match(bundle, /Gray “Name hidden”/)
assert.match(bundle, /Biggest \/ most serious/)
assert.doesNotMatch(bundle, /Live coverage/)
assert.doesNotMatch(bundle, /Highest severity/)
assert.doesNotMatch(bundle, /Name locked/)
assert.doesNotMatch(bundle, /Search tickers & streams/)
assert.match(bundle, /function tradingTapeTable\(/)
assert.match(bundle, /function FilerFace\(/)
assert.match(bundle, /function entityFilerProps\(/)
assert.match(bundle, /function FilerNameCell\(/)
assert.match(bundle, /className: `vortx-filer__name`/)
assert.doesNotMatch(bundle, /vortx-filer__name vortx-tape-source-link/)
assert.match(bundle, /vortx-map-drawer__who/)
assert.match(bundle, /vortx-map-drawer__title/)
assert.match(bundle, /vortx-map-frame--open/)
assert.doesNotMatch(bundle, /heatMapTileClass/)
assert.doesNotMatch(bundle, /function se\(/)
assert.doesNotMatch(bundle, /Who's on the radar right now/)
assert.match(bundle, /\/api\/filer-portrait/)
assert.match(bundle, /wikimedia/)
assert.match(bundle, /financialmodelingprep/)
assert.match(bundle, /\/congress-bioguide\.json/)
assert.match(bundle, /unitedstates\/images\/gh-pages\/congress/)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /\.vortx-filer-face\{/)
assert.match(readFileSync(resolve(root, 'frontend/public/congress-bioguide.json'), 'utf8'), /april mcclain delaney/)
assert.doesNotMatch(bundle, /ui-avatars\.com|dicebear|pravatar/)
assert.match(bundle, /Search NVDA/)
assert.doesNotMatch(bundle, /vortx:\/\//)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /\.vortx-tape-guide\{/)
assert.match(readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8'), /\.glass-panel\{[^}]*background:#0b1220/)
assert.doesNotMatch(bundle, /!1 && e !== `admin` && e !== `map`/)
assert.match(bundle, /See where today's public trades landed/)
assert.doesNotMatch(bundle, /\(0, w\.jsx\)\(howItWorksSection/)
assert.doesNotMatch(bundle, /\(0, w\.jsx\)\(ke, \{ events: S \}\)/)
assert.match(runtime, /resetView:\s*function/)
assert.match(runtime, /focusLngLat:\s*function/)
assert.match(bundle, /function openMapView\(/)
assert.match(bundle, /searchParams.set\(`signal`/)
assert.match(bundle, /vortx-stack-mini__row--pin/)
assert.match(bundle, /focusLngLat/)
assert.match(bundle, /vortx-map-drawer__story/)
assert.match(styles, /repeat\(4,\s*minmax\(0,\s*1fr\)\)/)
assert.match(styles, /\.vortx-map-empty/)
assert.match(styles, /\.vortx-map-reset/)
assert.match(styles, /\.vortx-map-frame::after/)
assert.match(styles, /@media \(max-width: 900px\)/)
assert.match(styles, /\.vortx-map-toolbar \{\s*position: relative;\s*top: auto;\s*grid-template-columns: minmax\(0, 1fr\) auto;/)
assert.match(styles, /height: min\(62dvh, 34rem\)/)
assert.match(styles, /height: min\(72%, 32rem\)/)
assert.match(styles, /max-height: min\(70dvh, 32rem\)/)
assert.match(styles, /padding-bottom: max\(0\.65rem, env\(safe-area-inset-bottom\)\)/)
assert.match(styles, /grid-template-columns: minmax\(0, 1fr\)/)
assert.match(styles, /\.vortx-map-drawer__title/)
assert.match(styles, /\.vortx-map-frame--open/)
assert.match(bundle, /How this helps a trader/)
assert.match(bundle, /See Congress and insider stock trades/)
assert.match(bundle, /This is the list of trades Congress, insiders, and funds already reported/)
assert.match(bundle, /See today's trades/)
assert.match(bundle, /Lawmaker stock trades/)
assert.doesNotMatch(bundle, /Catch the filing before the headline/)
assert.doesNotMatch(bundle, /Browse the tape/)
assert.match(bundle, /Recenter globe/)
assert.match(bundle, /No resolved signals here/)
assert.match(bundle, /distressCount/)
assert.match(bundle, /Drag to spin/)
assert.match(bundle, /Interactive Vortx globe/)
assert.match(bundle, /function geographicSignalMapView\(\{/)
assert.match(bundle, /function mapSignalDrawer\(/)
assert.doesNotMatch(bundle, /Export signal CSV/)
assert.doesNotMatch(bundle, /Open filing source/)
assert.match(bundle, /See the name behind this trade → Vortx, \$150\/mo/)
assert.doesNotMatch(bundle, /Checkout will use \$\{authEmail\}/)
assert.doesNotMatch(bundle, /Checkout will use `/)
assert.doesNotMatch(bundle, /dgreatbusiness@gmail\.com/)
assert.match(bundle, /Checkout never shows your address on this page/)
assert.match(bundle, /You've beaten the news this month/)
assert.match(bundle, /function countBeatenTheNews\(/)
assert.match(bundle, /vortx-desk-card--early/)
assert.match(bundle, /Copy trade \(on Beat the news rows\) copies name/)
assert.match(bundle, /Worth watching this week/)
assert.doesNotMatch(bundle, /None were on your watchlist/)
assert.match(bundle, /Vortx names the lawmaker or insider/)
assert.match(runtime, /center: \[-96, 38\]/)
assert.match(runtime, /zoom: 3\.5/)
assert.doesNotMatch(runtime, /center: \[12, 20\]/)
assert.match(bundle, /See the names\. Get the next one in your inbox\./)
assert.match(bundle, /Same public homework/)
assert.match(bundle, /Timing is the product/)
assert.match(bundle, /Public tape\. Already filed\./)
assert.doesNotMatch(bundle, /Unlock who traded/)
assert.doesNotMatch(bundle, /—/)
assert.doesNotMatch(
  readFileSync(resolve(root, 'frontend/functions/lib/product-positioning.js'), 'utf8'),
  /—/,
)
assert.doesNotMatch(bundle, /Where that filing landed/)
assert.doesNotMatch(bundle, /Unlock who on Nebula/)
assert.doesNotMatch(bundle, /Subscribe to see who traded/)
assert.match(bundle, /See if Congress or insiders traded companies you follow/)
assert.match(bundle, /Sign in to see names, watch people, and get email alerts/)
assert.match(bundle, /Subscribe to see the person's name/)
assert.match(bundle, /Export visible map points \(CSV\)/)
assert.match(bundle, /Show overlapping pins only/)
assert.match(bundle, /vortx-map-toolbar/)
assert.match(bundle, /Visible signals list fallback/)
assert.match(bundle, /Read the Enterprise Map API docs/)
assert.match(
  bundle,
  /This shows the timing relationship between two public filings\. It is not evidence of insider knowledge, coordination, or wrongdoing\./,
)

console.log(
  JSON.stringify(
    {
      vector_styles: ['positron', 'dark'],
      bounds_query_on: ['load', 'moveend'],
      moveend_debounce_ms: 180,
      clustering: { enabled: true, max_zoom: 10, radius_px: 24 },
      cluster_expansion_animation_ms: 650,
      pin_drawer_callback: true,
      viewport_export_hook: true,
      filter_controls: ['types', 'search', 'cross_only'],
      tile_failure_list_fallback: true,
      pin_palette: ['#FF3366', '#FEE2E2', '#00FF87', '#DCFCE7', '#FFB800', '#FEF3C7'],
    },
    null,
    2,
  ),
)
console.log('Map runtime QA OK')
