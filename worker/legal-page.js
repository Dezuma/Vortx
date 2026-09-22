/**
 * Server-rendered /legal notice. Same copy as the SPA, readable without JavaScript.
 */

import {
  FCRA_PRODUCT_BANNER,
  LEGAL_PAGE,
  LEGAL_SECTIONS,
  legalSectionId,
} from '../frontend/functions/lib/product-positioning.js'
import { socialImageMetaTags } from '../frontend/functions/lib/social-card.js'

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const PAGE_CSS = `
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#020617;color:#e2e8f0}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#020617;color:#e2e8f0}
a{color:#7dd3fc}
.wrap{max-width:72rem;margin:0 auto;padding:2.25rem 1.25rem 4rem}
.brand{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:1.25rem}
.brand a{font-weight:800;font-size:20px;letter-spacing:-.03em;text-decoration:none;color:#f8fafc}
.brand span{font-size:13px;color:#94a3b8}
.shell{background:#020617;border:1px solid rgba(148,163,184,.32);border-radius:1.15rem;padding:1.25rem 1.3rem 1.45rem}
.kicker{margin:0;font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#7dd3fc}
h1{margin:.45rem 0 0;font-size:clamp(1.45rem,3vw,2rem);font-weight:700;letter-spacing:-.03em;line-height:1.15;color:#f8fafc}
.lead{margin:.7rem 0 0;max-width:46rem;font-size:.95rem;line-height:1.55;color:#e2e8f0}
.meta{margin:.55rem 0 0;font-size:.75rem;line-height:1.45;color:#94a3b8}
.banner{margin:1rem 0 0;padding:.85rem 1rem;border:1px solid rgba(125,211,252,.45);border-radius:.9rem;background:#0b1220;color:#f8fafc;font-size:.9rem;line-height:1.5;font-weight:650}
.toc{margin:1rem 0 0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:.45rem .7rem}
.toc a{font-size:.72rem;color:#94a3b8;text-decoration:none}
.toc a:hover,.toc a:focus{color:#7dd3fc;text-decoration:underline}
.grid{margin-top:1.15rem;display:grid;gap:.85rem}
@media (min-width:800px){.grid{grid-template-columns:1fr 1fr}}
article{margin:0;padding:1rem 1.05rem;border:1px solid rgba(148,163,184,.28);border-radius:.9rem;background:#0b1220}
article:target{outline:2px solid #7dd3fc;outline-offset:2px}
h2{margin:0;font-size:.78rem;font-weight:750;letter-spacing:.06em;text-transform:uppercase;color:#7dd3fc}
article p{margin:.55rem 0 0;font-size:.86rem;line-height:1.55;color:#e2e8f0}
.foot{margin:1.15rem 0 0;max-width:52rem;font-size:.8rem;line-height:1.55;color:#cbd5e1}
@media print{
  :root,body,.shell,article{background:#fff;color:#0f172a}
  h1,h2,.kicker,.brand a{color:#0f172a}
  article p,.lead,.foot{color:#0f172a}
  .toc{display:none}
  article{break-inside:avoid;border-color:#94a3b8}
}
`

export function renderLegalNoticeHtml({ site = 'https://vortxmkt.com' } = {}) {
  const canonical = `${site}/legal`
  const title = `${LEGAL_PAGE.title} | Vortx`
  const cards = LEGAL_SECTIONS.map((row) => {
    const id = legalSectionId(row.title)
    return `<article id="${esc(id)}">
          <h2>${esc(row.title)}</h2>
          <p>${esc(row.copy)}</p>
        </article>`
  }).join('\n        ')
  const toc = LEGAL_SECTIONS.map((row) => {
    const id = legalSectionId(row.title)
    return `<li><a href="#${esc(id)}">${esc(row.title)}</a></li>`
  }).join('')
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: LEGAL_PAGE.title,
    dateModified: '2026-09-10',
    url: canonical,
    description: LEGAL_PAGE.lead,
    publisher: {
      '@type': 'Organization',
      name: 'Vortx Data LLC',
      email: LEGAL_PAGE.contact,
      url: site,
    },
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${esc(LEGAL_PAGE.lead)}" />
    <meta name="robots" content="index,follow" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(LEGAL_PAGE.lead)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${esc(canonical)}" />
    ${socialImageMetaTags(site)}
    <title>${esc(title)}</title>
    <link rel="canonical" href="${esc(canonical)}" />
    <style>${PAGE_CSS}</style>
    <script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>
  </head>
  <body>
    <main class="wrap">
      <div class="brand">
        <a href="/">Vortx</a>
        <span>Legal notice</span>
      </div>
      <section class="shell" aria-labelledby="vortx-legal-title">
        <p class="kicker">${esc(LEGAL_PAGE.kicker)}</p>
        <h1 id="vortx-legal-title">${esc(LEGAL_PAGE.title)}</h1>
        <p class="lead">${esc(LEGAL_PAGE.lead)}</p>
        <p class="meta">Effective ${esc(LEGAL_PAGE.updated)} · Vortx Data LLC · <a href="mailto:${esc(LEGAL_PAGE.contact)}">${esc(LEGAL_PAGE.contact)}</a></p>
        <p class="banner">${esc(FCRA_PRODUCT_BANNER)}</p>
        <nav aria-label="Notice sections"><ul class="toc">${toc}</ul></nav>
        <div class="grid">
        ${cards}
        </div>
        <p class="foot">${esc(LEGAL_PAGE.closer)}</p>
      </section>
    </main>
  </body>
</html>`
}

export function legalPage() {
  const html = renderLegalNoticeHtml()
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300, must-revalidate',
    },
  })
}
