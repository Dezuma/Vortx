/**
 * SSR pages for case stories: public index, story page, and the admin review
 * queue at /cases/drafts. The review page is a thin client over the admin API;
 * it reuses the Supabase session already stored by the main site.
 */

import { supabaseRest } from '../frontend/functions/lib/supabase-rest.js'
import { substackPublicationUrl } from '../frontend/functions/lib/case-stories.js'
import { consumerToolForRecordType, SCOUT_SOFT_UPSELL } from '../frontend/functions/lib/consumer-tools.js'
import { socialImageMetaTags } from '../frontend/functions/lib/social-card.js'

const PAGE_CSS = `
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
body{margin:0;min-height:100vh;background:#020617;color:#f8fafc}
a{color:#7dd3fc}
.wrap{max-width:880px;margin:0 auto;padding:40px 20px 64px}
.eyebrow{font:700 11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#50b4ff;margin:0}
h1{font-size:clamp(30px,5vw,52px);line-height:1.05;letter-spacing:-.03em;margin:12px 0 10px}
h2{font-size:22px;margin:0 0 8px}
.dek{color:#cbd5e1;font-size:17px;line-height:1.6;margin:0 0 22px}
.muted{color:#94a3b8;line-height:1.65}
.card{border:1px solid rgba(100,116,139,.4);border-radius:20px;background:linear-gradient(165deg,rgba(30,41,59,.9),rgba(2,6,23,.96));padding:22px;margin-top:18px;box-shadow:0 16px 48px rgba(0,0,0,.35)}
.body p{line-height:1.75;color:#e2e8f0}
.kv{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-top:14px}
.kv div{border:1px solid rgba(148,163,184,.22);border-radius:12px;background:rgba(0,0,0,.32);padding:11px}
.kv span{display:block;color:#94a3b8;font:700 10px monospace;text-transform:uppercase;letter-spacing:.12em}
.kv strong{display:block;margin-top:5px;font-size:13px;font-weight:600}
.pill{display:inline-block;border:1px solid rgba(80,180,255,.32);border-radius:999px;background:rgba(80,180,255,.1);color:#7dd3fc;padding:6px 10px;font:700 11px monospace;text-transform:uppercase;letter-spacing:.08em}
.btn{display:inline-block;border:1px solid rgba(125,211,252,.6);border-radius:11px;background:linear-gradient(135deg,#38bdf8,#7dd3fc);color:#020617;padding:10px 14px;font-weight:800;text-decoration:none;cursor:pointer;font-size:13px}
.btn-ghost{display:inline-block;border:1px solid rgba(148,163,184,.4);border-radius:11px;background:transparent;color:#e2e8f0;padding:10px 14px;font-weight:600;text-decoration:none;cursor:pointer;font-size:13px}
.btn-danger{display:inline-block;border:1px solid rgba(251,113,133,.55);border-radius:11px;background:rgba(251,113,133,.12);color:#fda4af;padding:10px 14px;font-weight:700;cursor:pointer;font-size:13px}
.row-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
textarea{width:100%;box-sizing:border-box;background:rgba(0,0,0,.4);border:1px solid rgba(148,163,184,.3);border-radius:10px;color:#f8fafc;padding:10px;font-family:inherit;font-size:13px;line-height:1.6}
.legal{font-size:12px;color:#94a3b8;margin-top:28px;line-height:1.6}
.status{font:700 11px monospace;letter-spacing:.1em;text-transform:uppercase}
.status-ok{color:#4ade80}.status-err{color:#fda4af}
`

const DISCLAIMER =
  'Records are allegations or administrative artifacts, not judgments. Vortx does not provide legal advice.'

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function page(title, inner, { extraHead = '', scriptSrc = '' } = {}) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta property="og:title" content="${esc(title)}" />
    ${socialImageMetaTags()}
    <style>${PAGE_CSS}</style>
    ${extraHead}
  </head>
  <body>
    <main class="wrap">
      <p class="eyebrow"><a href="/" style="text-decoration:none;color:inherit">Vortx</a> · Cases</p>
      ${inner}
      <p class="legal">${esc(DISCLAIMER)}</p>
    </main>
    ${scriptSrc ? `<script src="${esc(scriptSrc)}"></script>` : ''}
  </body>
</html>`
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function bodyToHtml(body) {
  return String(body || '')
    .split(/\n{2,}|\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${esc(paragraph)}</p>`)
    .join('\n')
}

function recordCard(sourceFields) {
  const fields = sourceFields || {}
  const rows = [
    ['Entity', fields.entity_name],
    ['Record type', fields.record_type],
    ['Jurisdiction', fields.jurisdiction],
    ['Filed', fields.filing_date],
    ['Docket', fields.docket_number],
    ['Source', fields.source_name],
    ['Severity', fields.severity],
  ]
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`)
    .join('')
  const partyRows = Array.isArray(fields.named_parties)
    ? fields.named_parties
        .map(
          (party) =>
            `<div><span>${esc(party.role || 'Named party')}</span><strong>${esc(party.name)}</strong></div>`,
        )
        .join('')
    : ''
  const sourceLink = fields.source_url
    ? `<p class="muted" style="margin-top:12px"><a href="${esc(fields.source_url)}" rel="noreferrer" target="_blank">View public source document</a></p>`
    : ''
  return `<div class="card"><p class="eyebrow">Source record</p><div class="kv">${rows}${partyRows}</div>${sourceLink}</div>`
}

function discussionLinks(env) {
  const substackUrl = substackPublicationUrl(env)
  const discordUrl = String(env.DISCORD_INVITE_URL || env.PUBLIC_DISCORD_INVITE_URL || '').trim()
  const parts = [
    `Get case files in your inbox: <a href="${esc(substackUrl)}" target="_blank" rel="noreferrer">subscribe on Substack</a>.`,
  ]
  if (discordUrl) {
    parts.push(
      `Discuss in Discord: <a href="${esc(discordUrl)}" target="_blank" rel="noreferrer">join the Vortx server</a>.`,
    )
  }
  return parts.map((line) => `<p class="muted">${line}</p>`).join('\n')
}

export async function casesIndexPage({ env }) {
  let stories = []
  try {
    stories = await supabaseRest(
      env,
      'case_stories?select=slug,headline,dek,record_type,published_at&status=eq.published&order=published_at.desc&limit=30',
    )
  } catch {
    stories = []
  }
  const list = (stories || [])
    .map(
      (story) => `<div class="card">
        <span class="pill">${esc(String(story.record_type || 'public record').replaceAll('_', ' '))}</span>
        <h2 style="margin-top:10px"><a href="/cases/${esc(story.slug)}" style="text-decoration:none;color:#f8fafc">${esc(story.headline)}</a></h2>
        <p class="muted">${esc(story.dek || '')}</p>
        <p class="muted" style="font-size:12px">${esc(String(story.published_at || '').slice(0, 10))}</p>
      </div>`,
    )
    .join('\n')
  return page(
    'Cases | Vortx',
    `<h1>Case files from the public record</h1>
     <p class="dek">Short factual stories built from filings in the Vortx feed. Every claim traces to a source field. Discussion happens on Substack and Discord, not in comments on these pages.</p>
     ${discussionLinks(env)}
     ${list || `<p class="muted">No published cases yet. Admins: review and approve drafts in <a href="/?view=admin#case-review-queue">Admin console</a> first.</p>`}`,
  )
}

export async function caseStoryPage({ request, env }) {
  const url = new URL(request.url)
  const slug = decodeURIComponent(url.pathname.replace(/^\/cases\//, '')).replace(/\/$/, '')
  if (!slug || slug === 'drafts') return null

  let story = null
  try {
    const rows = await supabaseRest(
      env,
      `case_stories?select=slug,headline,dek,body,record_type,source_fields,published_at&status=eq.published&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    )
    story = rows?.[0] || null
  } catch {
    story = null
  }
  if (!story) {
    return new Response('Case not found.', { status: 404, headers: { 'content-type': 'text/plain' } })
  }

  const tool = consumerToolForRecordType(
    story.record_type || story.source_fields?.record_type || '',
  )
  const discordUrl = String(env.DISCORD_INVITE_URL || env.PUBLIC_DISCORD_INVITE_URL || '').trim()

  return page(
    `${story.headline} | Vortx Cases`,
    `<span class="pill">${esc(String(story.record_type || 'public record').replaceAll('_', ' '))}</span>
     <h1>${esc(story.headline)}</h1>
     <p class="dek">${esc(story.dek || '')}</p>
     <p class="muted" style="font-size:12px">Published ${esc(String(story.published_at || '').slice(0, 10))} · <a href="/cases">All cases</a></p>
     <div class="body card">${bodyToHtml(story.body)}</div>
     ${recordCard(story.source_fields)}
     <div class="row-actions">
       <a class="btn" href="${esc(tool.href)}">${esc(tool.caseCta)}</a>
       <a class="btn-ghost" href="${esc(SCOUT_SOFT_UPSELL.href)}">${esc(SCOUT_SOFT_UPSELL.cta)}</a>
       <a class="btn-ghost" href="${esc(substackPublicationUrl(env))}" target="_blank" rel="noreferrer">Discuss on Substack</a>
       ${discordUrl ? `<a class="btn-ghost" href="${esc(discordUrl)}" target="_blank" rel="noreferrer">Discuss on Discord</a>` : ''}
     </div>`,
    {
      extraHead: `<meta name="description" content="${esc(story.dek || story.headline)}" />
    <meta property="og:title" content="${esc(story.headline)}" />
    <meta property="og:description" content="${esc(story.dek || '')}" />`,
    },
  )
}

const DRAFTS_SCRIPT = `
function readStorageToken() {
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (!key || key.indexOf('sb-') !== 0 || key.indexOf('-auth-token') < 1) continue;
      var raw = JSON.parse(localStorage.getItem(key) || 'null');
      if (!raw) continue;
      if (raw.access_token) return raw.access_token;
      if (raw.session && raw.session.access_token) return raw.session.access_token;
      if (raw.currentSession && raw.currentSession.access_token) return raw.currentSession.access_token;
    }
  } catch (e) {}
  return '';
}
async function resolveToken() {
  var token = readStorageToken();
  if (token) return token;
  try {
    var mod = await import('/assets/supabase-D4HD8mHW.js');
    if (mod && mod.supabase) {
      var sess = await mod.supabase.auth.getSession();
      return (sess.data && sess.data.session && sess.data.session.access_token) || '';
    }
  } catch (e) {}
  return '';
}
var root = document.getElementById('queue');
function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
function setStatus(node, ok, text) {
  node.innerHTML = '<span class="status ' + (ok ? 'status-ok' : 'status-err') + '">' + esc(text) + '</span>';
}
async function review(id, action, edits, statusNode, cardNode, token) {
  setStatus(statusNode, true, 'working...');
  var res = await fetch('/api/cases/review', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify({ id: id, action: action, edits: edits || undefined })
  });
  var data = await res.json().catch(function () { return {}; });
  if (res.ok && data.ok) {
    if (action === 'approve') {
      var bits = ['published'];
      if (data.discord && data.discord.posted) bits.push(data.discord.has_image ? 'Discord PNG' : 'Discord');
      else if (data.discord && data.discord.reason) bits.push('Discord: ' + data.discord.reason);
      if (data.x && data.x.posted) bits.push(data.x.has_image ? 'X PNG' : 'X');
      else if (data.x && data.x.reason) bits.push('X: ' + data.x.reason);
      setStatus(statusNode, true, bits.join(' · '));
    } else {
      setStatus(statusNode, true, 'rejected');
    }
    setTimeout(function () { cardNode.style.opacity = '.45'; }, 300);
  } else {
    setStatus(statusNode, false, (data.error || 'failed') + (data.issues ? ': ' + data.issues.join('; ') : ''));
  }
}
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(function () {
    var old = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = old; }, 1500);
  });
}
function draftCard(item, isPending, token) {
  var sf = item.source_fields || {};
  var card = el('<div class="card"></div>');
  card.appendChild(el('<span class="pill">' + esc((item.record_type || 'record').replace(/_/g, ' ')) + (isPending ? '' : ' · published') + '</span>'));
  card.appendChild(el('<h2 style="margin-top:10px">' + esc(item.headline) + '</h2>'));
  card.appendChild(el('<p class="muted">' + esc(item.dek || '') + '</p>'));
  var bodyBox = el('<textarea rows="10"></textarea>'); bodyBox.value = item.body || ''; bodyBox.readOnly = !isPending;
  card.appendChild(bodyBox);
  var scriptToggle = el('<p class="muted" style="margin:10px 0 4px;font-size:12px">Video script (60-90s narration)</p>');
  card.appendChild(scriptToggle);
  var scriptBox = el('<textarea rows="6"></textarea>'); scriptBox.value = item.video_script || ''; scriptBox.readOnly = !isPending;
  card.appendChild(scriptBox);
  card.appendChild(el(
    '<p class="muted" style="font-size:12px;margin-top:10px">Source: ' + esc(sf.entity_name || 'n/a') + ' · ' + esc(sf.record_type || '') + ' · filed ' + esc(sf.filing_date || 'n/a') + ' · ' + esc(sf.jurisdiction || '') +
    (sf.source_url ? ' · <a target="_blank" rel="noreferrer" href="' + esc(sf.source_url) + '">source doc</a>' : '') + '</p>'
  ));
  var actions = el('<div class="row-actions"></div>');
  var statusNode = el('<p style="margin:8px 0 0"></p>');
  if (isPending) {
    var approve = el('<button class="btn">Approve &amp; publish</button>');
    approve.onclick = function () {
      review(item.id, 'approve', { body: bodyBox.value, video_script: scriptBox.value }, statusNode, card, token);
    };
    var reject = el('<button class="btn-danger">Reject</button>');
    reject.onclick = function () { review(item.id, 'reject', null, statusNode, card, token); };
    actions.appendChild(approve);
    actions.appendChild(reject);
  } else {
    var view = el('<a class="btn-ghost" target="_blank" href="/cases/' + esc(item.slug) + '">View live</a>');
    actions.appendChild(view);
  }
  var copyBtn = el('<button class="btn-ghost">Copy video script</button>');
  copyBtn.onclick = function () { copyText(scriptBox.value, copyBtn); };
  actions.appendChild(copyBtn);
  if (item.substack_post) {
    var substackBtn = el('<button class="btn-ghost">Copy Substack post</button>');
    substackBtn.onclick = function () { copyText(item.substack_post.full_text, substackBtn); };
    actions.appendChild(substackBtn);
    if (window.__substackComposer) {
      var composer = el('<a class="btn-ghost" target="_blank" rel="noreferrer" href="' + esc(window.__substackComposer) + '">Open Substack composer</a>');
      actions.appendChild(composer);
    }
  }
  card.appendChild(actions);
  card.appendChild(statusNode);
  return card;
}
async function load() {
  var token = await resolveToken();
  if (!token) {
    root.innerHTML = '<div class="card"><p class="muted">No admin session found. <a href="/?view=admin">Sign in on the main site</a> as an admin, then reload this page.</p></div>';
    return;
  }
  var res = await fetch('/api/cases/drafts', { headers: { authorization: 'Bearer ' + token } });
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok || !data.ok) {
    root.innerHTML = '<div class="card"><p class="muted">Could not load queue: ' + esc(data.error || res.status) + '. Admin role required. Use <a href="/?view=admin">Admin console</a> for the in-app review queue.</p></div>';
    return;
  }
  root.innerHTML = '';
  window.__substackComposer = data.substack ? data.substack.composer_url : '';
  if (!data.pending.length) {
    root.appendChild(el('<div class="card"><p class="muted">No drafts waiting for review.</p></div>'));
  }
  data.pending.forEach(function (item) { root.appendChild(draftCard(item, true, token)); });
  if (data.recent_published.length) {
    root.appendChild(el('<h2 style="margin-top:28px">Recently published</h2>'));
    data.recent_published.forEach(function (item) { root.appendChild(draftCard(item, false, token)); });
  }
}
load();
`

export function caseDraftsPage() {
  return page(
    'Case drafts | Vortx admin',
    `<h1>Case review queue</h1>
     <p class="dek">AI drafts wait here until you approve them. Nothing publishes without a click. Edit inline, then approve, or reject to archive.</p>
     <div id="queue"><div class="card"><p class="muted">Loading...</p></div></div>`,
    { scriptSrc: '/cases/drafts.js' },
  )
}

export function caseDraftsScript() {
  return new Response(DRAFTS_SCRIPT, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
