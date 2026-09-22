/**
 * SSR landing page for /job-safety-score (consumer layoff filing check).
 */

import {
  JOB_SAFETY_DISCLAIMER,
  JOB_SAFETY_NO_RESULT_DISCLOSURE,
  JOB_SAFETY_SOURCE_LABELS,
} from '../frontend/functions/lib/job-safety-score.js'
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
.eyebrow{font:700 11px monospace;letter-spacing:.16em;text-transform:uppercase;color:#0f766e;margin:0}
h1{font-size:clamp(28px,5vw,40px);line-height:1.12;letter-spacing:-.03em;margin:10px 0 12px}
.lead{color:#334155;line-height:1.65;margin:0 0 22px;font-size:17px}
form{display:grid;gap:12px;margin-top:8px}
label{display:grid;gap:6px;font-size:13px;font-weight:600;color:#334155}
input,select{border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#0f172a;padding:14px 15px;font-size:16px}
input:focus,select:focus{outline:2px solid #5eead4;outline-offset:1px}
.btn{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:14px;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;padding:15px 18px;font-size:16px;font-weight:800;cursor:pointer;width:100%}
.btn:disabled{opacity:.65;cursor:wait}
.trust{margin-top:22px;display:grid;gap:10px}
.trust p{margin:0;color:#475569;font-size:14px;line-height:1.6}
.trust strong{color:#0f172a}
.panel{display:none;margin-top:28px;border:1px solid #e2e8f0;border-radius:24px;background:#fff;padding:24px;box-shadow:0 12px 40px rgba(15,23,42,.06)}
.panel.visible{display:block}
.panel .match-meta{margin:0 0 10px;font-size:13px;color:#475569}
.panel .match-meta.fuzzy{color:#b45309;font-weight:600}
.panel .match-meta.rejected{color:#991b1b;font-weight:600}
.panel h2{font-size:22px;margin:0 0 8px}
.panel p{margin:0 0 12px;color:#334155;line-height:1.6}
.notice{border:1px solid #fde68a;background:#fffbeb;color:#92400e;border-radius:14px;padding:12px 14px;font-size:14px;line-height:1.55}
.ok{border:1px solid #bbf7d0;background:#f0fdf4;color:#166534;border-radius:14px;padding:12px 14px;font-size:14px;line-height:1.55}
.disclosure{border:1px solid #cbd5e1;background:#f1f5f9;color:#334155;border-radius:14px;padding:14px 16px;font-size:14px;line-height:1.65;margin-top:12px}
.disclosure strong{color:#0f172a;display:block;margin-bottom:6px}
.record{border:1px solid #e2e8f0;border-radius:16px;padding:14px 16px;margin-top:10px;background:#f8fafc}
.record strong{display:block;font-size:15px}
.record span{display:block;margin-top:4px;color:#64748b;font-size:13px}
.record .unlock{margin-top:10px;font:700 11px monospace;letter-spacing:.08em;text-transform:uppercase;color:#0f766e}
.cta-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
.btn-secondary{border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#0f172a;padding:12px 16px;font-weight:700;cursor:pointer;text-decoration:none;font-size:14px}
.btn-secondary.primary{border-color:#0f766e;background:#ecfdf5;color:#0f766e}
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
    q: 'What is a WARN notice?',
    a: 'WARN stands for Worker Adjustment and Retraining Notification. In some states, certain employers must file a public notice of a large layoff or plant closure. Vortx indexes those filings where we ingest them. Coverage is not nationwide, and a filing is an administrative record, not a prediction.',
  },
  {
    q: 'Does a search tell me if my employer will lay people off?',
    a: 'No. There is no complete public database for every employer. When a WARN or similar notice is filed and we ingest it, it can appear here. A clean result means we did not find a matching public filing in our current sources, not that layoffs will not happen. Do not use this as an employment, credit, or other FCRA eligibility tool.',
  },
  {
    q: 'Are layoff notices public record?',
    a: 'Many mass-layoff notices are public when employers file with state workforce agencies. Coverage varies by state, employer size, and layoff size. Vortx currently ingests Texas and Oregon open-data feeds and adds more over time.',
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

export function jobSafetyScorePage() {
  const site = 'https://vortxmkt.com'
  const title = 'Layoff Search: WARN / Mass-Layoff Notices | Vortx'
  const description =
    'Search public WARN and mass-layoff notices by employer. $5 per search unlocks filing dates, locations, headcount, and source links. Research only; not a consumer report or employment decision tool.'
  const canonical = `${site}/layoff-search`
  const sourcesHtml = JOB_SAFETY_SOURCE_LABELS.map((line) => `<li>${esc(line)}</li>`).join('')
  const faqHtml = FAQ.map((item) => `<details><summary>${esc(item.q)}</summary><p>${esc(item.a)}</p></details>`).join('')
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
        <span>Layoff Search · $5 per search · research only</span>
      </div>
      <p class="fcra-banner">${esc(FCRA_PRODUCT_BANNER)}</p>
      <section class="hero">
        <p class="eyebrow">Public WARN search · not a consumer report</p>
        <h1>Search public layoff filings by employer.</h1>
        <p class="lead">Enter a company name. Free preview shows whether a WARN-style notice is in the sources we ingest. Unlock filing date, location, headcount, and source link for $5. Coverage is not nationwide, and a filing is not a prediction or employment decision.</p>
        <form id="jss-form" class="grid-2" novalidate>
          <label>Employer or company name
            <input id="jss-name" name="name" type="text" autocomplete="organization" placeholder="Example: Acme Manufacturing LLC" required />
          </label>
          <label>State
            <select id="jss-state" name="state" aria-label="State">
              <option value="">Any state</option>
              ${stateOptions}
            </select>
          </label>
          <button class="btn" id="jss-submit" type="submit">Search layoffs</button>
        </form>
        <div class="trust">
          <p><strong>How this works:</strong> Some employers must file public WARN-style notices. Vortx indexes those filings where we ingest them. A notice is an administrative record, not a guarantee that a layoff will occur or that none will.</p>
          <p><strong>What we check:</strong> Texas and Oregon open-data workforce feeds today, with more states added over time.</p>
          <p>${esc(JOB_SAFETY_DISCLAIMER)}</p>
        </div>
      </section>

      <section id="jss-results" class="panel" aria-live="polite">
        <h2 id="jss-result-headline">Results</h2>
        <p id="jss-match-meta" class="legal hidden"></p>
        <p id="jss-result-copy"></p>
        <div id="jss-result-banner"></div>
        <div id="jss-records"></div>
        <div id="jss-cta-row" class="cta-row hidden">
          <button type="button" class="btn-secondary primary" id="jss-unlock-btn">$5 for source documents and full filing details</button>
          <button type="button" class="btn-secondary" id="jss-alert-btn">Get notified if a new filing is recorded</button>
        </div>
        <aside id="jss-clear-upsell" class="scout-upsell hidden">
          <p><strong>No recent WARN hit is not the same as no layoff history.</strong></p>
          <p>Unlock a deeper lookback and source documents for $5, or start Scout to get alerted if a new filing appears later.</p>
        </aside>
        <aside id="jss-scout-upsell" class="scout-upsell hidden">
          <p><strong>${esc(SCOUT_SOFT_UPSELL.headline)}</strong></p>
          <p>${esc(SCOUT_SOFT_UPSELL.subcopy || '')}</p>
          <a href="${esc(SCOUT_SOFT_UPSELL.href)}">${esc(SCOUT_SOFT_UPSELL.cta)}</a>
        </aside>
        <div id="jss-no-result-extra" class="hidden">
          <div class="disclosure">
            <strong>Important: a clean result is not a guarantee</strong>
            ${esc(JOB_SAFETY_NO_RESULT_DISCLOSURE)}
          </div>
          <p class="legal">We check:</p>
          <ul>${sourcesHtml}</ul>
        </div>
      </section>

      <section class="faq">
        <h2>Common questions</h2>
        ${faqHtml}
      </section>

      <p class="legal">${esc(JOB_SAFETY_DISCLAIMER)} <a href="/legal">Legal</a> · <a href="/?view=sources">Data sources</a></p>
    </main>
    <script src="/analytics.js" defer></script>
    <script src="/job-safety-score.js"></script>
  </body>
</html>`

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-cache, no-store, must-revalidate',
    },
  })
}
