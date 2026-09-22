/**
 * SSR landing page for /contractor-check (public-record research, not a background check).
 */

import { CONTRACTOR_DISCLAIMER, CONTRACTOR_SOURCE_LABELS } from '../frontend/functions/lib/contractor-check.js'
import { SCOUT_SOFT_UPSELL } from '../frontend/functions/lib/consumer-tools.js'
import { FCRA_PRODUCT_BANNER } from '../frontend/functions/lib/product-positioning.js'

const PAGE_CSS = `
:root{color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#f8fafc;color:#0f172a}
body{margin:0;min-height:100vh;background:linear-gradient(180deg,#f8fafc 0%,#fff 240px)}
a{color:#0369a1}
.wrap{max-width:760px;margin:0 auto;padding:36px 20px 72px}
.brand{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:28px}
.brand a{font-weight:800;font-size:20px;letter-spacing:-.03em;text-decoration:none;color:#0f172a}
.brand span{font-size:13px;color:#64748b}
.hero{border:1px solid #e2e8f0;border-radius:28px;background:#fff;box-shadow:0 20px 60px rgba(15,23,42,.08);padding:28px}
.eyebrow{font:700 11px monospace;letter-spacing:.16em;text-transform:uppercase;color:#0369a1;margin:0}
h1{font-size:clamp(28px,5vw,40px);line-height:1.12;letter-spacing:-.03em;margin:10px 0 12px}
.lead{color:#334155;line-height:1.65;margin:0 0 22px;font-size:17px}
form{display:grid;gap:12px;margin-top:8px}
label{display:grid;gap:6px;font-size:13px;font-weight:600;color:#334155}
input,select{border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#0f172a;padding:14px 15px;font-size:16px}
input:focus,select:focus{outline:2px solid #7dd3fc;outline-offset:1px}
.btn{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:14px;background:linear-gradient(135deg,#0284c7,#38bdf8);color:#fff;padding:15px 18px;font-size:16px;font-weight:800;cursor:pointer;width:100%}
.btn:disabled{opacity:.65;cursor:wait}
.trust{margin-top:22px;display:grid;gap:10px}
.trust p{margin:0;color:#475569;font-size:14px;line-height:1.6}
.trust strong{color:#0f172a}
.panel .match-meta{margin:0 0 10px;font-size:13px;color:#475569}
.panel .match-meta.fuzzy{color:#b45309;font-weight:600}
.panel .match-meta.rejected{color:#991b1b;font-weight:600}
.panel.visible{display:block}
.panel h2{font-size:22px;margin:0 0 8px}
.panel p{margin:0 0 12px;color:#334155;line-height:1.6}
.alert{border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:14px;padding:12px 14px;font-size:14px}
.ok{border:1px solid #bbf7d0;background:#f0fdf4;color:#166534;border-radius:14px;padding:12px 14px;font-size:14px}
.record{border:1px solid #e2e8f0;border-radius:16px;padding:14px 16px;margin-top:10px;background:#f8fafc}
.record strong{display:block;font-size:15px}
.record span{display:block;margin-top:4px;color:#64748b;font-size:13px}
.record .unlock{margin-top:10px;font:700 11px monospace;letter-spacing:.08em;text-transform:uppercase;color:#0369a1}
.cta-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
.btn-secondary{border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#0f172a;padding:12px 16px;font-weight:700;cursor:pointer;text-decoration:none;font-size:14px}
.btn-secondary.primary{border-color:#0284c7;background:#eff6ff;color:#0369a1}
.scout-upsell{margin-top:18px;border:1px solid #dbeafe;border-radius:16px;background:#f8fafc;padding:14px 16px}
.scout-upsell p{margin:0 0 8px;color:#334155;font-size:14px;line-height:1.55}
.scout-upsell a{font-weight:700;color:#0369a1;text-decoration:none}
.scout-upsell a:hover{text-decoration:underline}
.scout-upsell--primary{margin-top:20px;border:2px solid #0284c7;background:linear-gradient(135deg,#eff6ff,#f0f9ff);padding:18px 20px;box-shadow:0 10px 28px rgba(2,132,199,.12)}
.scout-upsell--primary a{display:inline-flex;align-items:center;justify-content:center;margin-top:8px;padding:10px 16px;border-radius:12px;background:#0284c7;color:#fff!important;text-decoration:none!important;font-size:14px}
.scout-upsell--primary a:hover{background:#0369a1}
.faq{margin-top:36px}
.faq h2{font-size:24px;margin:0 0 14px}
.faq details{border:1px solid #e2e8f0;border-radius:14px;background:#fff;padding:14px 16px;margin-top:10px}
.faq summary{cursor:pointer;font-weight:700;color:#0f172a}
.faq p{margin:10px 0 0;color:#475569;line-height:1.65;font-size:14px}
.legal{font-size:12px;color:#64748b;margin-top:28px;line-height:1.65}
.fcra-banner{margin:0 0 18px;border:1px solid #fecaca;background:#fef2f2;color:#7f1d1d;border-radius:14px;padding:12px 14px;font-size:14px;line-height:1.55;font-weight:650}
.hidden{display:none !important}
@media(min-width:640px){form.grid-2{grid-template-columns:1fr 160px}}
`

const FAQ = [
  {
    q: 'How do I research public filings on a contractor name?',
    a: 'Enter the contractor or business name and state on this page. Vortx searches public liens, bankruptcy filings, and court records we ingest. A match means a filing exists in our sources, not that the contractor is unfit to hire. Full filing details unlock with a one-time purchase or subscription.',
  },
  {
    q: 'Does a clean result mean the contractor is safe to hire?',
    a: 'No. A clean result means we did not find matching liens or bankruptcy filings in our current monitored sources for that name in that state. That is not a license check, reference check, consumer report, or guarantee of quality. Always verify licensing with your state board and check references separately. Do not use this page for hiring or other FCRA eligibility decisions.',
  },
  {
    q: 'What does a lien on a contractor mean?',
    a: 'A mechanics or construction lien is a public filing that often indicates a payment dispute on a project. It is an administrative record, not a judgment and not proof of wrongdoing. It is a research lead, not a consumer report.',
  },
]

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function faqSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
}

const STATE_OPTIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA',
  'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK',
  'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]

export function contractorCheckPage() {
  const site = 'https://vortxmkt.com'
  const title = 'Contractor Public-Records Search: Liens, Lawsuits and Bankruptcy Filings | Vortx'
  const description =
    'Research public liens, lawsuits, and bankruptcy filings tied to a contractor or business name. Not a consumer report. Not for hiring or other eligibility decisions.'
  const canonical = `${site}/contractor-check`
  const sourcesHtml = CONTRACTOR_SOURCE_LABELS.map((line) => `<li>${esc(line)}</li>`).join('')
  const faqHtml = FAQ.map(
    (item) => `<details><summary>${esc(item.q)}</summary><p>${esc(item.a)}</p></details>`,
  ).join('')
  const stateOptions = STATE_OPTIONS.map((abbr) => `<option value="${abbr}">${esc(abbr)}</option>`).join('')

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${esc(description)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${esc(canonical)}" />
    <meta property="og:image" content="${site}/social-card.png?v=16" />
    <meta name="twitter:card" content="summary_large_image" />
    <title>${esc(title)}</title>
    <link rel="canonical" href="${esc(canonical)}" />
    <style>${PAGE_CSS}</style>
    ${faqSchema()}
  </head>
  <body>
    <main class="wrap">
      <div class="brand">
        <a href="/">Vortx</a>
        <span>Contractor Check · research only</span>
      </div>
      <p class="fcra-banner">${esc(FCRA_PRODUCT_BANNER)}</p>
      <section class="hero">
        <p class="eyebrow">Public-record research · not a consumer report</p>
        <h1>Research public filings tied to this contractor name.</h1>
        <p class="lead">Enter a business name. Vortx searches public liens, bankruptcy filings, and court records we ingest. Results can be incomplete or mismatched and are not a hiring, licensing, or eligibility decision.</p>
        <form id="contractor-form" class="grid-2" novalidate>
          <label>Contractor or business name
            <input id="contractor-name" name="name" type="text" autocomplete="organization" placeholder="Example: Apex Roofing LLC" required />
          </label>
          <label>State
            <select id="contractor-state" name="state" aria-label="State">
              <option value="">Any state</option>
              ${stateOptions}
            </select>
          </label>
          <button class="btn" id="contractor-submit" type="submit">Check now</button>
        </form>
        <div class="trust">
          <p><strong>What we check:</strong> mechanics and construction liens, bankruptcy dockets, and related court records from sources we refresh daily.</p>
          <p><strong>How current:</strong> same ingestion pipeline as our Data Sources page; new filings surface as sources update (typically daily).</p>
          <p>${esc(CONTRACTOR_DISCLAIMER)}</p>
        </div>
      </section>

      <section id="contractor-results" class="panel" aria-live="polite">
        <h2 id="contractor-result-headline">Results</h2>
        <p id="contractor-match-meta" class="legal hidden"></p>
        <p id="contractor-result-copy"></p>
        <div id="contractor-result-banner"></div>
        <div id="contractor-records"></div>
        <div id="contractor-unlock" class="cta-row hidden">
          <button type="button" class="btn-secondary primary" id="contractor-unlock-btn">$5 to see full details</button>
        </div>
        <aside id="contractor-clear-upsell" class="scout-upsell hidden">
          <p><strong>Clear in the free 180-day window is not the same as clear for a year.</strong></p>
          <p>Older liens and bankruptcy filings often sit outside the free preview. Unlock a 12-month lookback for $5. This is still research only, not a consumer report.</p>
        </aside>
        <aside id="contractor-scout-upsell" class="scout-upsell hidden">
          <p><strong>${esc(SCOUT_SOFT_UPSELL.headline)}</strong></p>
          <p>${esc(SCOUT_SOFT_UPSELL.subcopy || '')}</p>
          <a id="contractor-subscribe-btn" href="${esc(SCOUT_SOFT_UPSELL.href)}">${esc(SCOUT_SOFT_UPSELL.cta)}</a>
        </aside>
        <div id="contractor-no-result-extra" class="hidden">
          <p class="legal">We check:</p><ul>${sourcesHtml}</ul><p class="legal">Absence of a record is not a guarantee. Always verify licensing separately with your state contractor board.</p>
        </div>
      </section>

      <section class="faq">
        <h2>Common questions</h2>
        ${faqHtml}
      </section>

      <p class="legal">${esc(CONTRACTOR_DISCLAIMER)} <a href="/legal">Legal</a> · <a href="/?view=sources">Data sources</a></p>
    </main>
    <script src="/analytics.js" defer></script>
    <script src="/contractor-check.js"></script>
  </body>
</html>`

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-cache, no-store, must-revalidate',
    },
  })
}
