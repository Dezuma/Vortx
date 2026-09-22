const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = ["assets/supabase-D4HD8mHW.js", "assets/supabase-BKR_xaUQ.js"]),
) => i.map((i) => d[i]);
import { a as e } from "./rolldown-runtime-BYbx6iT9.js";
import { i as t, n, r, t as i } from "./motion-CC24LwRe.js";
import { t as a } from "./react-Wp7kRcAp.js";
import { n as o, r as s, t as c } from "./query-BjO_Fhx3.js";
(function () {
  let e = document.createElement(`link`).relList;
  if (e && e.supports && e.supports(`modulepreload`)) return;
  for (let e of document.querySelectorAll(`link[rel="modulepreload"]`)) n(e);
  new MutationObserver((e) => {
    for (let t of e)
      if (t.type === `childList`)
        for (let e of t.addedNodes)
          e.tagName === `LINK` && e.rel === `modulepreload` && n(e);
  }).observe(document, { childList: !0, subtree: !0 });
  function t(e) {
    let t = {};
    return (
      e.integrity && (t.integrity = e.integrity),
      e.referrerPolicy && (t.referrerPolicy = e.referrerPolicy),
      e.crossOrigin === `use-credentials`
        ? (t.credentials = `include`)
        : e.crossOrigin === `anonymous`
          ? (t.credentials = `omit`)
          : (t.credentials = `same-origin`),
      t
    );
  }
  function n(e) {
    if (e.ep) return;
    e.ep = !0;
    let n = t(e);
    fetch(e.href, n);
  }
})();
var l = e(t(), 1),
  u = a();
async function d(e, t) {
  let n = await fetch(e, {
      headers: t ? { authorization: `Bearer ${t}` } : void 0,
    }),
    r = await n.json();
  if (!n.ok) throw Error(`Request failed: ${n.status}`);
  return r;
}
function f(e) {
  let t = readBonusPreviewIds(),
    n = t.length ? `?bonus_preview=${encodeURIComponent(t.join(`,`))}` : ``;
  return d(`/api/friction-feed${n}`, e);
}
const FEED_CACHE_PREFIX = `vortx_friction_feed_v1:`,
  FEED_CACHE_MS = 15 * 60 * 1000;
function isUsableFeedPayload(data) {
  return Boolean(
    data &&
      Array.isArray(data.events) &&
      data.events.length > 0 &&
      Array.isArray(data.entities),
  );
}
function readCachedFrictionFeed(scope) {
  if (typeof sessionStorage > `u`) return void 0;
  try {
    let raw = sessionStorage.getItem(FEED_CACHE_PREFIX + scope);
    if (!raw) return void 0;
    let parsed = JSON.parse(raw);
    if (!parsed || Date.now() - Number(parsed.savedAt || 0) > FEED_CACHE_MS) return void 0;
    return isUsableFeedPayload(parsed.payload) ? parsed.payload : void 0;
  } catch {
    return void 0;
  }
}
function writeCachedFrictionFeed(scope, payload) {
  if (typeof sessionStorage > `u` || !isUsableFeedPayload(payload)) return;
  try {
    sessionStorage.setItem(
      FEED_CACHE_PREFIX + scope,
      JSON.stringify({ savedAt: Date.now(), payload }),
    );
  } catch {}
}
const DESK_CACHE_PREFIX = `vortx_desk_dash_v1:`,
  DESK_CACHE_MS = 10 * 60 * 1000;
function isUsableDeskPayload(data) {
  return Boolean(
    data &&
      data.ok &&
      (Array.isArray(data.trading_feed) || Array.isArray(data.live_feed)),
  );
}
function readCachedDeskDashboard(userId) {
  if (typeof sessionStorage > `u`) return void 0;
  try {
    let raw = sessionStorage.getItem(DESK_CACHE_PREFIX + (userId || `session`));
    if (!raw) return void 0;
    let parsed = JSON.parse(raw);
    if (!parsed || Date.now() - Number(parsed.savedAt || 0) > DESK_CACHE_MS) return void 0;
    return isUsableDeskPayload(parsed.payload) ? parsed.payload : void 0;
  } catch {
    return void 0;
  }
}
function writeCachedDeskDashboard(userId, payload) {
  if (typeof sessionStorage > `u` || !isUsableDeskPayload(payload)) return;
  try {
    sessionStorage.setItem(
      DESK_CACHE_PREFIX + (userId || `session`),
      JSON.stringify({ savedAt: Date.now(), payload }),
    );
  } catch {}
}
function p() {
  return d(`/api/source-transparency`);
}
function m() {
  return d(`/api/entitlements`);
}
function ps() {
  return d(`/api/public-stats`);
}
async function h(e, t, n = {}) {
  let r = await fetch(e, {
      ...n,
      headers: {
        authorization: `Bearer ${t}`,
        ...(n.body ? { "content-type": `application/json` } : {}),
        ...(n.headers || {}),
      },
    }),
    i = await r.json();
  if (!r.ok) throw Error(i.message || i.error || `Request failed: ${r.status}`);
  return i;
}
function g(e) {
  return h(`/api/me`, e);
}
function _(e) {
  return h(`/api/customer/dashboard`, e);
}
function v(e) {
  return h(`/api/admin/dashboard`, e);
}
function y(e, t) {
  return h(`/api/admin/sources`, e, {
    method: `PATCH`,
    body: JSON.stringify(t),
  });
}
function b(e, t) {
  return h(`/api/customer/service-requests`, e, {
    method: `POST`,
    body: JSON.stringify(t),
  });
}
function x(e, t) {
  return h(`/api/admin/service-requests`, e, {
    method: `PATCH`,
    body: JSON.stringify(t),
  });
}
function adminStreamPulseApi(e) {
  return h(`/api/admin/stream-pulse`, e);
}
function adminCasesDraftsApi(e) {
  return h(`/api/cases/drafts`, e);
}
function adminCaseReviewApi(e, t) {
  return h(`/api/cases/review`, e, {
    method: `POST`,
    body: JSON.stringify(t),
  });
}
function adminCasesGenerateApi(e, t = {}) {
  return h(`/api/cases/generate`, e, {
    method: `POST`,
    body: JSON.stringify(t),
  });
}
async function S(e) {
  let t = await fetch(`/api/request-access`, {
      method: `POST`,
      headers: { "content-type": `application/json` },
      body: JSON.stringify(e),
    }),
    n = await t.json();
  if (!t.ok || !n.ok) throw Error(n.message || n.error || `Request failed.`);
  return n;
}
async function scanPostJson(e, t) {
  let n = await fetch(e, {
      method: `POST`,
      headers: { "content-type": `application/json` },
      body: JSON.stringify(t),
    }),
    r = await n.json();
  if (!n.ok) throw Error(r.message || r.error || `Request failed: ${n.status}`);
  return r;
}
function scanMatchApi(e, t) {
  return scanPostJson(`/api/scan/match`, { names: e, mode: t });
}
function scanResultsApi(e) {
  return scanPostJson(`/api/scan/results`, { entity_ids: e });
}
function scanUnlockApi(e, t, n) {
  return scanPostJson(`/api/scan/unlock`, { email: e, entity_ids: t, mode: n });
}
function scanParseNames(e) {
  return String(e || ``)
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}
function scanEventLabel(e) {
  return String(e || ``).replaceAll(`_`, ` `);
}
const SCAN_COPY = {
  eyebrow: `Company scan`,
  headline: `See if Congress or insiders traded companies you follow`,
  placeholder: `Rival Corp, Acme Industries, Northstar LLC… (name or ticker)`,
  helper: `Enter up to 10 company names or tickers. We search the same public Congress, insider, and fund filings the big desks already read. Research only, not trading or investment advice.`,
};
const SCAN_WATCHLIST_KEY = `vortx:scan-watchlist-entities`;
function saveScanWatchlistIds(e) {
  try {
    sessionStorage.setItem(SCAN_WATCHLIST_KEY, JSON.stringify(e));
  } catch {}
}
function readScanWatchlistIds() {
  try {
    let e = sessionStorage.getItem(SCAN_WATCHLIST_KEY);
    if (!e) return [];
    let t = JSON.parse(e);
    return Array.isArray(t) ? t.filter(Boolean) : [];
  } catch {
    return [];
  }
}
const FREE_PREVIEW_BONUS_KEY = `vortx:bonus-preview-ids`,
  FREE_PREVIEW_BONUS_MAX = 1;
function readBonusPreviewIds() {
  try {
    let e = localStorage.getItem(FREE_PREVIEW_BONUS_KEY);
    if (!e) return [];
    let t = JSON.parse(e);
    return Array.isArray(t) ? t.filter(Boolean).slice(0, FREE_PREVIEW_BONUS_MAX) : [];
  } catch {
    return [];
  }
}
function saveBonusPreviewId(e) {
  let t = readBonusPreviewIds();
  if (t.includes(e) || t.length >= FREE_PREVIEW_BONUS_MAX) return t;
  let n = [...t, e].slice(0, FREE_PREVIEW_BONUS_MAX);
  try {
    localStorage.setItem(FREE_PREVIEW_BONUS_KEY, JSON.stringify(n));
  } catch {}
  return n;
}
function scrollToLivePulse() {
  document.getElementById(`live-pulse`)?.scrollIntoView({ behavior: `smooth`, block: `start` });
}
async function C(e, t, n, r) {
  if (e === `custom`) {
    let e = new URLSearchParams({
      subject: `Vortx custom access`,
      body: `I want to discuss custom access for Vortx.`,
    });
    window.location.assign(`mailto:sales@vortxmkt.com?${e.toString()}`);
    return;
  }
  trackMarketingStep(`checkout_click`, e);
  typeof window.vortxTrack === `function` && window.vortxTrack(`Checkout Started`, { plan: e });
  let i = await fetch(`/api/stripe-checkout`, {
      method: `POST`,
      headers: {
        "content-type": `application/json`,
        ...(n ? { authorization: `Bearer ${n}` } : {}),
      },
      body: JSON.stringify({
        plan: e,
        owner_email: t,
        acceptable_use_accepted: r?.accepted ?? !1,
        acceptable_use_accepted_at: r?.acceptedAt,
        scan_entity_ids: readScanWatchlistIds(),
      }),
    }),
    a = await i.json();
  if (!i.ok || !a.ok) {
    let code = String(a.error || a.message || `checkout_failed`),
      friendly = {
        acceptable_use_required: `Accept the acceptable-use terms to continue checkout.`,
        missing_price: `That plan is temporarily unavailable. Try Nebula or contact support.`,
        missing_stripe_secret: `Checkout is temporarily unavailable. Please try again in a few minutes.`,
        invalid_plan: `That plan is not available. Choose Nebula from Pricing.`,
        checkout_failed: `Checkout could not start. Please try again.`,
      }[code];
    throw Error(friendly || a.message || `Checkout could not start. Please try again.`);
  }
  window.location.assign(a.url);
}
var w = r(),
  T = `modulepreload`,
  ee = function (e) {
    return `/` + e;
  },
  E = {},
  D = function (e, t, n) {
    let r = Promise.resolve();
    if (t && t.length > 0) {
      let e = document.getElementsByTagName(`link`),
        i = document.querySelector(`meta[property=csp-nonce]`),
        a = i?.nonce || i?.getAttribute(`nonce`);
      function o(e) {
        return Promise.all(
          e.map((e) =>
            Promise.resolve(e).then(
              (e) => ({ status: `fulfilled`, value: e }),
              (e) => ({ status: `rejected`, reason: e }),
            ),
          ),
        );
      }
      r = o(
        t.map((t) => {
          if (((t = ee(t, n)), t in E)) return;
          E[t] = !0;
          let r = t.endsWith(`.css`),
            i = r ? `[rel="stylesheet"]` : ``;
          if (n)
            for (let n = e.length - 1; n >= 0; n--) {
              let i = e[n];
              if (i.href === t && (!r || i.rel === `stylesheet`)) return;
            }
          else if (document.querySelector(`link[href="${t}"]${i}`)) return;
          let o = document.createElement(`link`);
          if (
            ((o.rel = r ? `stylesheet` : T),
            r || (o.as = `script`),
            (o.crossOrigin = ``),
            (o.href = t),
            a && o.setAttribute(`nonce`, a),
            document.head.appendChild(o),
            r)
          )
            return new Promise((e, n) => {
              (o.addEventListener(`load`, e),
                o.addEventListener(`error`, () =>
                  n(Error(`Unable to preload CSS for ${t}`)),
                ));
            });
        }),
      );
    }
    function i(e) {
      let t = new Event(`vite:preloadError`, { cancelable: !0 });
      if (((t.payload = e), window.dispatchEvent(t), !t.defaultPrevented))
        throw e;
    }
    return r.then((t) => {
      for (let e of t || []) e.status === `rejected` && i(e.reason);
      return e().catch(i);
    });
  },
  O = `Vortx shows public or licensed filings (Form 4, STOCK Act, 13F, WARN, court, and related administrative records). Research only. Not trading, financial, investment, tax, legal, credit, employment, or housing advice. Not a consumer report.`,
  CONSUMER_TOOLS = [
    {
      id: `layoff_search`,
      title: `Layoff Search`,
      href: `/layoff-search`,
      description: `Search public WARN / mass-layoff notices by employer. $5 per search unlocks dates, locations, headcount, and source links. Research only; not a consumer report or employment decision tool.`,
      prompt: `Need a WARN check?`,
      reportPrice: `$5`,
      reportLabel: `One-time Layoff Search report`,
      cta: `Search layoffs`,
    },
  ],
  CONSUMER_TRUST_QUOTE = {
    quote: `I knew a member of Congress had traded before it hit the news.`,
    name: `Sam K.`,
    title: `Retail trader`,
    company: `Options desk`,
  },
  RESEARCHER_TRUST_QUOTE = {
    quote: `Vortx is the first place I see congressional and insider filings with the date and source trail in one screen, not just a screenshot thread.`,
    name: `Alex R.`,
    title: `Independent researcher`,
    company: `Equities desk`,
  },
  HERO_COPY = {
    eyebrow: `Public tape. Already filed.`,
    headline: `See Congress and insider stock trades`,
    stageSub: `This is the list of trades Congress, insiders, and funds already reported. Type a ticker. Green is a buy. Red is a sell. Click Their trades to open one person. Research only, not a buy or sell call.`,
    subcopy: `The free list is the same public homework. Vortx names the person and emails you when they file again, so the next move does not slip by.`,
    pulseSocialProof: `Start with ticker, side, and date. That is free.`,
    pulseHint: `Names and the next-trade email show after you subscribe.`,
  },
  PRICING_COPY = {
    eyebrow: `Don't miss the next filing`,
    headline: `See the names. Get the next one in your inbox.`,
    subcopy: `Ticker, buy or sell, and company stay free. That is the same public homework the big desks already read. Vortx names the lawmaker or insider and emails you when they file again, cleaner and faster than digging through government sites.`,
    levelTitle: `Same public homework`,
    levelCopy: `They already filed. You get the same record on one screen, not buried in a government database.`,
    timingTitle: `Timing is the product`,
    timingCopy: `A filing has a clock. Pay monthly so the name and the email are there when the next one posts, not after you hear about it.`,
    investorToggle: `Need this as a data feed for a team?`,
    investorSubcopy: `Team plans add downloadable spreadsheets, links to the original filings, and more watchlist slots.`,
  },
  k = [
    { id: `overview`, label: `Today's Trades` },
    { id: `map`, label: `Map` },
    { id: `browse`, label: `Browse` },
    { id: `pricing`, label: `Pricing` },
    { id: `customer`, label: `Login` },
  ],
  A = [
    {
      title: `Company insider trades (Form 4)`,
      copy: `Corporate officers and large owners must report purchases and sales on Form 4. Vortx surfaces these SEC filings so you can see insider activity as it hits the public record.`,
    },
    {
      title: `Congress trades (STOCK Act)`,
      copy: `Members of Congress file trade disclosures under the STOCK Act. House and Senate portals are the source of truth; Vortx indexes them for search and alerts.`,
    },
    {
      title: `Big fund holdings (13F)`,
      copy: `Large investment managers report quarterly holdings on Form 13F. Use Fund Holdings to watch position changes as filings clear the SEC.`,
    },
    {
      title: `Layoff Search (WARN notices)`,
      copy: `State WARN / mass-layoff notices remain available as a standalone $5 per-search product. They are not the primary homepage feed.`,
    },
  ],
  j = [
    {
      title: `Data origin and source of truth`,
      copy: `Vortx Data LLC aggregates public or licensed records, including SEC EDGAR Form 4 and 13F filings, House and Senate STOCK Act disclosures, state WARN / layoff notices, and court or lien metadata where ingested. We do not create those filings. The issuing agency or court file is the source of truth. Always open the original record before you act. Parsed fields, titles, maps, and summaries can be incomplete, delayed, or wrong.`,
    },
    {
      title: `Not advice of any kind`,
      copy: `Vortx is a research index, not an adviser. We do not provide trading, financial, investment, tax, legal, HR, housing, tenant, contractor-licensing, or medical advice. Presence or absence of a filing is not a buy, sell, hold, hire, fire, rent, lend, or contract signal. Decisions you make are yours alone.`,
    },
    {
      title: `Not a consumer report (FCRA)`,
      copy: `Vortx is not a consumer reporting agency and does not furnish consumer reports under the Fair Credit Reporting Act. Do not use Vortx data, scores, scans, Contractor Check, Landlord Check, Job Safety Score, Layoff Search, watchlists, or case files to make eligibility decisions about credit, insurance, employment, housing, or another FCRA-covered purpose. Using Vortx for an FCRA-covered purpose is a material breach of this notice. If you need a legally permitted background or credit check, use a qualified CRA and follow FCRA procedures.`,
    },
    {
      title: `Not a broker, RIA, or credit agency`,
      copy: `Vortx Data LLC is not a broker-dealer, investment adviser, municipal advisor, bank, law firm, or credit bureau. Nothing on the site is an offer, solicitation, or recommendation of any security. 13F rows are delayed holdings reports, not live trades. STOCK Act amounts are often ranges. Form 4 amount fields may be shares, units, or dollars as filed.`,
    },
    {
      title: `No guilt, liability, or predicted outcome`,
      copy: `A Form 4, STOCK Act disclosure, 13F, WARN notice, lien, bankruptcy docket, or other record is an administrative or public filing, not a verdict. It does not mean a person or company committed wrongdoing, will fail, will lay people off, or that a price will move. Do not treat proximity on the map, timing between filings, or a case narrative as proof of coordination, insider knowledge, or causation.`,
    },
    {
      title: `Accuracy, matching, and delays`,
      copy: `Government feeds lag, omit amendments, and disagree with each other. Entity resolution, ticker mapping, geocoding, OCR, and XML parsing can attach the wrong issuer, address, person, or amount. Coverage is not nationwide for every record type. Silence in Vortx is not proof that no filing exists. Refresh, source links, and timestamps can fail. Use at your own risk, as-is, without warranty of merchantability, fitness, or non-infringement to the fullest extent permitted by law.`,
    },
    {
      title: `Maps, cases, and generated copy`,
      copy: `Map pins are geocoded from addresses on filings, usually an issuer, facility, or counsel address, not proof someone stood there. Case files and some summaries may be drafted with automated assistance and always require human review before you rely on them. They are not official government publications and not a complete legal file.`,
    },
    {
      title: `Activity counts and marketing`,
      copy: `Watcher counts, ranking boards, and similar activity metrics may mix real watchlist members with modeled heat so empty boards do not read as zero. They are not audited unique-user counts. Quotes and testimonials are individual opinions, not typical results, and not a representation of past or future trading performance.`,
    },
    {
      title: `Acceptable use`,
      copy: `Vortx data is licensed for informational and research purposes only. You may not use it to manipulate securities prices, coordinate trading, evade securities, privacy, or consumer-protection law, scrape or bulk-copy the service beyond your plan, share logins, bypass rate limits or paywalls, train models on Vortx outputs without a written license, or republish Vortx pages as if they were the original government record. You may not use Vortx as a tenant screen, employment screen, credit decision, insurance underwriting file, or other eligibility tool. Redistributing outputs as verified fact, investment advice, or a finding of liability is prohibited.`,
    },
    {
      title: `Accounts, watchlists, and privacy`,
      copy: `Watchlists, scans, and exports are for your internal review unless your plan says otherwise. We collect account, payment (via Stripe), usage, and support data needed to run the service. Do not upload data you are not allowed to share. We may retain logs for security, billing, and abuse prevention. See also product-specific notices on Scan, Contractor Check, Landlord Check, Job Safety Score, and Layoff Search.`,
    },
    {
      title: `Limitation of liability`,
      copy: `To the fullest extent permitted by law, Vortx Data LLC and its officers, contractors, and suppliers are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, trading losses, missed filings, or business interruption, even if advised of the possibility. Our total liability for a claim relating to the service is limited to the fees you paid to Vortx Data LLC for the product at issue in the three months before the claim, and that amount is your sole and exclusive monetary remedy. Except where prohibited, you must bring any claim within one year after it arises. Some jurisdictions do not allow certain limits; in those places our liability is limited to the maximum permitted.`,
    },
    {
      title: `No government affiliation`,
      copy: `Vortx Data LLC is a private company. We are not the SEC, Congress, a court, a state labor agency, or any other government body, and those bodies do not endorse this site. Form names, agency names, and similar labels identify public records. A Vortx page is not an official filing, docket, or government publication. Always open the original record.`,
    },
    {
      title: `Indemnification`,
      copy: `You will defend, indemnify, and hold harmless Vortx Data LLC and its officers, contractors, and suppliers from claims, damages, losses, and reasonable legal fees arising from your use of the service, your outputs, your content, your violation of this notice or law, or any use of Vortx data as a consumer report or for an FCRA-covered eligibility decision. We may assume exclusive defense of a claim at your expense.`,
    },
    {
      title: `Availability, security, and accounts`,
      copy: `The service may be delayed, incomplete, rate-limited, or offline. We do not promise uptime, completeness, or that a filing will appear before you need it. You are responsible for account credentials and for activity under your login. We may suspend or terminate access for abuse, nonpayment, security risk, or legal risk. Force majeure and third-party outages (including government feeds, Cloudflare, Stripe, and Supabase) can interrupt the product without liability.`,
    },
    {
      title: `Privacy, processors, and children`,
      copy: `We process account identifiers, watchlists, search queries, payment metadata via Stripe, and technical logs such as IP address, user-agent, and timestamps. Infrastructure may include Cloudflare, Supabase, and Stripe. We do not sell personal information for money. We may retain logs for security, billing, and abuse prevention. Email contact@vortxmkt.com to request access, correction, or deletion of account data we control; we may keep records required for billing, tax, security, or law. The service is not directed to children under 16. Do not use it if you are under 18.`,
    },
    {
      title: `Changes, contact, and law`,
      copy: `We may update this notice; the date above is the current version. Continued use after a change is acceptance of the update. Electronic notice on this page is sufficient. Contact Vortx Data LLC at contact@vortxmkt.com. This notice is governed by the laws of the United States and the state of Vortx Data LLC's principal place of business, without regard to conflict-of-law rules, except where a subscriber agreement specifies otherwise. If a court finds a term unenforceable, the rest remains in effect. No third-party beneficiaries are created except as needed to enforce indemnification and liability limits.`,
    },
  ],
  M = [
    {
      title: `Retail traders`,
      relief: `See the disclosure before the thread.`,
      copy: `Form 4, STOCK Act, and 13F filings surface dated activity while it is still on the public record.`,
      reach: `X · Reddit · StockTwits`,
    },
    {
      title: `Quantitative researchers`,
      relief: `Cleaned filing fields, not PDF archaeology.`,
      copy: `API and export tiers deliver parsed filer, ticker, date, and amount fields for research pipelines.`,
      reach: `Notebooks · backtests · screens`,
    },
    {
      title: `Financial media`,
      relief: `Source-linked filings for the story.`,
      copy: `Open the disclosure URL, quote the filing date, and keep the disclaimer intact.`,
      reach: `News desks · newsletters`,
    },
    {
      title: `Politically engaged investors`,
      relief: `Congressional trades, same-day public record.`,
      copy: `STOCK Act disclosures are indexed beside insider and institutional flows  -  research only, not advice.`,
      reach: `Civic · policy · markets`,
    },
  ],
  TEAM_USE_CASES = M.slice(1),
  PRIMARY_BUYER = M[0],
  BEFORE_AFTER = [
    {
      before: `The Form 4 cleared EDGAR while you were still refreshing Twitter.`,
      after: `You saw the insider filing the same day it hit the public record.`,
    },
    {
      before: `A STOCK Act disclosure posted while the vote was still being priced in.`,
      after: `You had the member trade on your feed before the narrative hardened.`,
    },
    {
      before: `The 13F drop was six weeks old before it reached your screen.`,
      after: `You had the institutional filing, the source, and the date.`,
    },
  ],
  N = {
    entity: `Example Form 4 issuer`,
    short_title: `Insider sold shares · example issuer`,
    source: `SEC EDGAR Form 4 Filings`,
    sourceUrl: `https://www.sec.gov/`,
    filingDate: `2026-07-28`,
    signal: `An executive sold shares. Form 4 cleared EDGAR the same day.`,
    routedAs: `Insider trade · Form 4`,
    score: 88,
    urgency: `Filed today`,
    action: `Open the source filing before you trade on rumor alone.`,
  },
  te = [
    `SEC EDGAR Form 4 Filings / daily`,
    `House STOCK Act disclosures / when clerk PTR clears`,
    `Senate STOCK Act disclosures / reconnecting (not live daily yet)`,
    `SEC EDGAR 13F Filings / daily`,
  ],
  P = [
    [`They file`, `A lawmaker, insider, or fund report hits a public government site`],
    [`You read it here`, `Same record, cleaned: ticker, buy or sell, company. A few names are open. The rest show after you subscribe.`],
    [`You catch the next one`, `Watch them. We email you when they file again.`],
  ],
  F = {
    scout: {
      name: `Scout`,
      value: `Watch one name`,
      outcome: `For following one person or ticker.`,
      copy: `1 watchlist and 2 email alerts a month. A few names stay open on the public tape. Full names on every row are on the $150/month plan.`,
      subAlert: `You see the trade type and date. A few names stay open. Full names on every row are on the $150/month plan.`,
    },
    sentinel: {
      name: `Sentinel`,
      value: `Small watchlist`,
      outcome: `For a short list of people or tickers you already follow.`,
      copy: `3 watchlists and 5 email alerts a month, updated daily. A few names stay open on the public tape. Full names on every row are on the $150/month plan.`,
      subAlert: `You see the trade type, where it was filed, and the date. A few names stay open. Full names on every row are on the $150/month plan.`,
    },
    nebula: {
      name: `Nebula`,
      value: `Don't miss the next name`,
      outcome: `See who filed, and get pinged when they file again, before the record sits unread in a government archive.`,
      copy: `Names on the live feed, 5 watchlists, 10 email alerts a month, updated daily.`,
    },
    supernova: {
      name: `Professional`,
      value: `API + team workflows`,
      outcome: `For fintech and research desks shipping on cleaned filing data.`,
      copy: `25 watchlists, 100 alerts per month, CSV export, entity timelines, and rate-limited API access.`,
    },
    pulsar: {
      name: `Operator`,
      value: `Source-linked data feed`,
      outcome: `For hedge funds and platforms that need parsed filings in their stack.`,
      copy: `12 watchlists, 40 alerts per month, source links, entity timelines, and lightweight CSV export.`,
    },
    galactic: {
      name: `Enterprise`,
      value: `Full API and bulk delivery`,
      outcome: `For teams where missing a disclosure has real downstream cost.`,
      copy: `Unlimited watchlists, unlimited alerts, full API access, bulk export, and priority support.`,
    },
    custom: {
      name: `Custom`,
      value: `Custom integrations`,
      outcome: `For jurisdiction packs, SLAs, and private deployment.`,
      copy: `Custom filing packs, SLAs, integrations, and private deployment support.`,
    },
  },
  I = [`scout`, `sentinel`, `nebula`, `pulsar`, `supernova`, `galactic`, `custom`],
  PRICING_CARD_PLANS = [`nebula`, `sentinel`, `scout`, `pulsar`, `supernova`, `galactic`],
  PRICING_RETAIL_PLANS = [`nebula`, `sentinel`, `scout`],
  PRICING_LIMITED_PLANS = [`sentinel`, `scout`],
  PRICING_API_PLANS = [`pulsar`, `supernova`, `galactic`],
  FEATURED_PLAN_ID = `nebula`,
  PLAN_LIMIT_FALLBACKS = {
    scout: { watchlist_limit: 1, alert_limit: 2 },
    sentinel: { watchlist_limit: 3, alert_limit: 5 },
    nebula: { watchlist_limit: 5, alert_limit: 10 },
    pulsar: { watchlist_limit: 12, alert_limit: 40 },
    supernova: { watchlist_limit: 25, alert_limit: 100 },
    galactic: { watchlist_limit: null, alert_limit: null },
  },
  PRICING_CARD_TAGLINES = {
    nebula: `The name, plus an email when they trade again`,
    sentinel: `Small watchlist. Names stay hidden.`,
    scout: `Starter watchlist. Names stay hidden.`,
    pulsar: `Parsed feed for funds & fintech`,
    supernova: `Team workflows with export & API`,
    galactic: `Unlimited scale for large desks`,
    custom: `Private deployment & filing packs`,
  },
  PRICING_CARD_CHECKLIST = [
    {
      label: `Live Congress, insider, and fund trade feed`,
      has: (e) => pricingTierHas(e.plan, `live_feed`),
    },
    {
      label: (e) =>
        e.plan === `galactic`
          ? `Unlimited watchlists`
          : `${e.watchlist_limit ?? 0} watchlist${Number(e.watchlist_limit) === 1 ? `` : `s`}`,
      has: (e) => pricingTierHas(e.plan, `live_feed`),
    },
    {
      label: (e) =>
        e.plan === `galactic`
          ? `Unlimited alerts`
          : `${e.alert_limit ?? 0} alerts per month`,
      has: (e) => pricingTierHas(e.plan, `live_feed`),
    },
    {
      label: (e) => (e.plan === `scout` ? `Weekly record refresh` : `Daily record refresh`),
      has: (e) => pricingTierHas(e.plan, `live_feed`),
    },
    {
      label: `Filer names (who bought or sold)`,
      has: (e) => pricingTierHas(e.plan, `full_names`),
    },
    {
      label: `Person desk: every trade by one filer`,
      has: (e) => pricingTierHas(e.plan, `live_feed`),
    },
    {
      label: `Unusual size vs their own filings`,
      has: (e) => pricingTierHas(e.plan, `full_names`),
    },
    {
      label: `How often a filing showed here before news`,
      has: (e) => pricingTierHas(e.plan, `full_names`),
    },
    {
      label: `Names unlock on alert trigger`,
      has: (e) => pricingTierHas(e.plan, `names_on_alert`),
    },
    {
      label: `Trade type and filing place only`,
      has: (e) => pricingTierHas(e.plan, `signal_meta`),
    },
    {
      label: `Source document URLs`,
      has: (e) => pricingTierHas(e.plan, `source_urls`),
    },
    {
      label: `CSV export`,
      has: (e) => pricingTierHas(e.plan, `csv_export`),
    },
    {
      label: `API / data-feed access`,
      has: (e) => pricingTierHas(e.plan, `api_access`),
    },
    {
      label: `Unlimited watchlists & alerts`,
      has: (e) => pricingTierHas(e.plan, `unlimited`),
    },
    {
      label: `Custom SLA & deployment`,
      has: (e) => pricingTierHas(e.plan, `custom_sla`),
    },
  ],
  L = {
    scout: `$20/mo`,
    sentinel: `$50/mo`,
    nebula: `$150/mo`,
    pulsar: `$450/mo`,
    supernova: `$1,500/mo`,
    galactic: `$5,000/mo`,
  },
  ENTRY_PRICE = `$20/mo`,
  FEATURED_PLAN_LABEL = `Nebula`,
  FEATURED_PLAN_PRICE = `$150/mo`,
  STARTER_PRICE = `$150/mo`,
  CUSTOMER_TESTIMONIALS = [
    {
      quote: `Alerts when members of Congress report stock trades have been invaluable for my reporting. I can see right away if a committee member traded a company tied to their work.`,
      name: `Sarah Jenkins`,
      title: `Independent Journalist`,
      company: `Media`,
      segment: `Congress`,
    },
    {
      quote: `I use the Congress list to see what industries politicians are buying. Following unusual trades from specific representatives has helped me notice sectors I was ignoring.`,
      name: `Marcus T.`,
      title: `Retail Investor`,
      company: `Individual`,
      segment: `Congress`,
    },
    {
      quote: `Company insider reports mix automatic stock grants with real buys. This list highlights when executives actually buy shares with their own money. A massive time saver.`,
      name: `Amanda B.`,
      title: `Senior Equity Analyst`,
      company: `Hedge Fund`,
      segment: `Insiders`,
    },
    {
      quote: `Reading big-fund holdings reports used to take us a week every quarter. Now we get a clear breakdown of what large funds reported, minutes after the deadline.`,
      name: `Michael D.`,
      title: `CIO`,
      company: `Family Office`,
      segment: `Funds`,
    },
  ],
  R = new Set([
    `overview`,
    `map`,
    `browse`,
    `congress`,
    `insider`,
    `thirteenf`,
    `scan`,
    `cases`,
    `sources`,
    `pricing`,
    `customer`,
    `admin`,
    `legal`,
  ]),
  BROWSE_STREAMS = [`congress`, `insider`, `thirteenf`],
  CANONICAL_SITE = `https://vortxmkt.com`;
function isBrowseStream(id) {
  return BROWSE_STREAMS.includes(String(id || ``));
}
function parseBrowseType(raw) {
  let value = String(raw || ``).trim().toLowerCase();
  return isBrowseStream(value) ? value : `congress`;
}
function browseHref(type = `congress`) {
  return `/?view=browse&type=${encodeURIComponent(parseBrowseType(type))}`;
}
function sanitizeTapeQuery(raw) {
  return String(raw || ``)
    .trim()
    .replace(/[^\w.\-/& ]+/g, ``)
    .slice(0, 32);
}
function tapeEventStream(eventType) {
  let value = String(eventType || ``).trim().toLowerCase();
  if (value === `congress_trade` || value === `congress`) return `congress`;
  if (value === `form_4` || value === `insider`) return `insider`;
  if (value === `institutional_13f` || value === `thirteenf`) return `thirteenf`;
  return ``;
}
function tapeHref({ ticker, eventType } = {}) {
  let q = sanitizeTapeQuery(ticker),
    stream = tapeEventStream(eventType);
  if (stream)
    return q ? `${browseHref(stream)}&q=${encodeURIComponent(q)}` : browseHref(stream);
  return q ? `/?q=${encodeURIComponent(q)}` : `/`;
}
function readTapeQueryFromLocation() {
  if (typeof window > `u`) return ``;
  return sanitizeTapeQuery(new URLSearchParams(window.location.search).get(`q`));
}
function TickerTapeLink({
  ticker,
  eventType,
  onFilter,
  className = `vortx-ticker-link`,
  children,
}) {
  let symbol = sanitizeTapeQuery(ticker);
  if (!symbol) return null;
  let label = children == null ? symbol : children;
  if (typeof onFilter === `function`)
    return (0, w.jsx)(`button`, {
      type: `button`,
      className,
      onClick: (event) => {
        event.stopPropagation();
        onFilter(symbol);
      },
      "aria-label": `Show trades for ${symbol}`,
      children: label,
    });
  return (0, w.jsx)(`a`, {
    href: tapeHref({ ticker: symbol, eventType }),
    className,
    onClick: (event) => event.stopPropagation(),
    children: label,
  });
}
function usableTradeTicker(raw) {
  let symbol = sanitizeTapeQuery(raw).toUpperCase();
  if (!/^[A-Z][A-Z0-9]{0,4}(?:[.-][A-Z0-9]{1,2})?$/.test(symbol)) return ``;
  return symbol;
}
function yahooQuoteSymbol(ticker) {
  let symbol = usableTradeTicker(ticker);
  return symbol ? symbol.replace(/\./g, `-`) : ``;
}
function liveQuoteHref(ticker) {
  let symbol = yahooQuoteSymbol(ticker);
  return symbol ? `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}` : ``;
}
function robinhoodTradeHref(ticker) {
  let symbol = usableTradeTicker(ticker);
  return symbol ? `https://robinhood.com/stocks/${encodeURIComponent(symbol)}` : ``;
}
function fidelityQuoteHref(ticker) {
  let symbol = usableTradeTicker(ticker);
  return symbol
    ? `https://digital.fidelity.com/prgw/digital/research/quote/dashboard/summary?symbol=${encodeURIComponent(symbol)}`
    : ``;
}
const GREEK_FIELD_ALPHABET = [
  `Α`,
  `Β`,
  `Γ`,
  `Δ`,
  `Ε`,
  `Ζ`,
  `Η`,
  `Θ`,
  `Ι`,
  `Κ`,
  `Λ`,
  `Μ`,
  `Ν`,
  `Ξ`,
  `Ο`,
  `Π`,
  `Ρ`,
  `Σ`,
  `Τ`,
  `Υ`,
  `Φ`,
  `Χ`,
  `Ψ`,
  `Ω`,
  `α`,
  `β`,
  `γ`,
  `δ`,
  `ε`,
  `ζ`,
  `η`,
  `θ`,
  `ι`,
  `κ`,
  `λ`,
  `μ`,
  `ν`,
  `ξ`,
  `ο`,
  `π`,
  `ρ`,
  `σ`,
  `τ`,
  `υ`,
  `φ`,
  `χ`,
  `ψ`,
  `ω`,
];
const GREEK_FIELD_COLORS = [`#1e293b`, `#334155`, `#1e3a4f`, `#0f2744`, `#1e3a5f`];
function greekFieldColumn(count) {
  return Array.from({ length: count }, () => ({
    ch: GREEK_FIELD_ALPHABET[Math.floor(Math.random() * GREEK_FIELD_ALPHABET.length)],
    x: 6 + Math.floor(Math.random() * 78),
    delay: (Math.random() * 28).toFixed(2),
    duration: (16 + Math.random() * 18).toFixed(2),
    size: (0.72 + Math.random() * 0.88).toFixed(2),
    drift: ((Math.random() - 0.5) * 22).toFixed(1),
    rot: ((Math.random() - 0.5) * 32).toFixed(1),
    color: GREEK_FIELD_COLORS[Math.floor(Math.random() * GREEK_FIELD_COLORS.length)],
    opacity: (0.06 + Math.random() * 0.1).toFixed(3),
  }));
}
function greekLetterField() {
  let columns = (0, l.useMemo)(
    () => ({ left: greekFieldColumn(20), right: greekFieldColumn(20) }),
    [],
  );
  function renderColumn(side, glyphs) {
    return (0, w.jsx)(`div`, {
      className: `vortx-greek-field__col vortx-greek-field__col--${side}`,
      children: glyphs.map((glyph, index) =>
        (0, w.jsx)(
          `span`,
          {
            className: `vortx-greek-field__glyph`,
            style: {
              left: `${glyph.x}%`,
              animationDelay: `-${glyph.delay}s`,
              animationDuration: `${glyph.duration}s`,
              fontSize: `${glyph.size}rem`,
              "--glyph-color": glyph.color,
              "--glyph-opacity": glyph.opacity,
              "--drift": `${glyph.drift}px`,
              "--rot": `${glyph.rot}deg`,
            },
            children: glyph.ch,
          },
          `${side}-${index}`,
        ),
      ),
    });
  }
  return (0, w.jsxs)(`div`, {
    className: `vortx-greek-field`,
    "aria-hidden": `true`,
    children: [renderColumn(`left`, columns.left), renderColumn(`right`, columns.right)],
  });
}
function LiveQuoteLinks({ ticker, compact = !1, className = ``, children }) {
  let symbol = usableTradeTicker(ticker),
    yahoo = liveQuoteHref(symbol),
    robinhood = robinhoodTradeHref(symbol),
    fidelity = fidelityQuoteHref(symbol);
  if (!yahoo) return null;
  if (compact)
    return (0, w.jsx)(`a`, {
      href: yahoo,
      target: `_blank`,
      rel: `noopener noreferrer`,
      className: className || `vortx-live-quote`,
      onClick: (event) => event.stopPropagation(),
      "aria-label": `Open live ${symbol} quote to trade in your broker`,
      title: `Live quote. You place the order.`,
      children: children == null ? `Trade live` : children,
    });
  return (0, w.jsxs)(`div`, {
    className: `vortx-live-trade`,
    children: [
      (0, w.jsx)(`a`, {
        href: yahoo,
        target: `_blank`,
        rel: `noopener noreferrer`,
        className: className || `vortx-map-action vortx-map-action--primary`,
        children: `Open live quote`,
      }),
      (0, w.jsxs)(`div`, {
        className: `vortx-live-trade__brokers`,
        children: [
          robinhood
            ? (0, w.jsx)(`a`, {
                href: robinhood,
                target: `_blank`,
                rel: `noopener noreferrer`,
                className: `vortx-live-trade__broker`,
                children: `Robinhood`,
              })
            : null,
          fidelity
            ? (0, w.jsx)(`a`, {
                href: fidelity,
                target: `_blank`,
                rel: `noopener noreferrer`,
                className: `vortx-live-trade__broker`,
                children: `Fidelity`,
              })
            : null,
        ],
      }),
      (0, w.jsx)(`p`, {
        className: `vortx-live-trade__hint`,
        children: `You place the order. Research only. Not a buy or sell call.`,
      }),
    ],
  });
}
const HOUSE_PTR_SEARCH_HREF = `https://disclosures-clerk.house.gov/FinancialDisclosure#Search`,
  SENATE_EFD_HREF = `https://efdsearch.senate.gov/search/`;
function isGenericSourceDeskUrl(raw) {
  let url = String(raw || ``).trim();
  if (!url) return !0;
  if (/PublicDisclosure\/FinancialDisclosure\/?(\?|#|$)/i.test(url) && !/ptr-pdfs/i.test(url))
    return !0;
  if (/browse-edgar/i.test(url)) return !0;
  return !1;
}
function allowlistedActionHref(raw) {
  try {
    let url = new URL(String(raw || ``).trim());
    if (url.protocol !== `https:`) return ``;
    let host = url.hostname.replace(/^www\./, ``).toLowerCase();
    let href = url.toString();
    if (isGenericSourceDeskUrl(href)) return ``;
    if (host === `sec.gov`) {
      if (String(url.pathname || ``).includes(`/Archives/edgar/`)) return href;
      if (/^\/cgi-bin\/own-disp(?:\.plx)?$/i.test(String(url.pathname || ``))) {
        let cik = String(url.searchParams.get(`CIK`) || ``).replace(/\D/g, ``);
        let action = String(url.searchParams.get(`action`) || ``).toLowerCase();
        return action === `getowner` ? edgarOwnerDispUrl(cik) : ``;
      }
      return ``;
    }
    if (host === `disclosures-clerk.house.gov` || host === `efdsearch.senate.gov`) return href;
    return ``;
  } catch {
    return ``;
  }
}
function padSecCik(cik) {
  let digits = String(cik || ``).replace(/\D/g, ``);
  if (digits.length < 6 || digits.length > 10) return ``;
  return digits.padStart(10, `0`);
}
function edgarOwnerDispUrl(cik) {
  let padded = padSecCik(cik);
  if (!padded) return ``;
  return `https://www.sec.gov/cgi-bin/own-disp?CIK=${padded}&action=getowner`;
}
function edgarFilingIndexUrl(cik, accession) {
  let cikDigits = String(cik || ``).replace(/\D/g, ``);
  let accessionDigits = String(accession || ``).replace(/\D/g, ``);
  if (!cikDigits || accessionDigits.length !== 18) return ``;
  let dashed = `${accessionDigits.slice(0, 10)}-${accessionDigits.slice(10, 12)}-${accessionDigits.slice(12)}`;
  return `https://www.sec.gov/Archives/edgar/data/${Number(cikDigits)}/${accessionDigits}/${dashed}-index.htm`;
}
function accessionFromTapeRow(row) {
  let text = `${row?.accession || ``} ${row?.accessionNumber || ``} ${row?.source_record_id || ``} ${row?.title || ``} ${row?.summary || ``}`;
  let tagged = text.match(/accession-number=([0-9-]{18,})/i);
  if (tagged?.[1]) return tagged[1];
  let labeled = text.match(/\bAccession:\s*([0-9-]{18,})/i);
  if (labeled?.[1]) return labeled[1];
  let dashed = text.match(/\b(\d{10}-\d{2}-\d{6})\b/);
  return dashed?.[1] || ``;
}
function ownerCikFromTapeRow(row) {
  let direct = String(row?.owner_cik || row?.ownerCik || ``).replace(/\D/g, ``);
  if (direct.length >= 6 && direct.length <= 10) return direct;
  let tagged = String(row?.summary || row?.title || ``).match(/\bCIK(?:\s+on record)?:\s*(\d{6,10})\b/i);
  if (tagged?.[1]) return tagged[1].replace(/\D/g, ``);
  let fromUrl = String(row?.source_url || row?.link || ``).match(/\/Archives\/edgar\/data\/(\d{6,10})\//i);
  if (fromUrl?.[1]) return fromUrl[1];
  let cik = String(row?.cik || ``).replace(/\D/g, ``);
  return cik.length >= 6 && cik.length <= 10 ? cik : ``;
}
function form4OwnerHref(row) {
  return allowlistedActionHref(edgarOwnerDispUrl(ownerCikFromTapeRow(row)));
}
function filingReceiptHref(row) {
  let fromRow = allowlistedActionHref(row?.source_url);
  if (fromRow) return fromRow;
  let cik = String(row?.cik || row?.issuer_cik || row?.owner_cik || ``).replace(/\D/g, ``);
  if (!cik) {
    let tagged = String(row?.summary || row?.title || ``).match(/\bCIK(?:\s+on record)?:\s*(\d{6,10})\b/i);
    cik = tagged?.[1] ? tagged[1].replace(/\D/g, ``) : ``;
  }
  return allowlistedActionHref(edgarFilingIndexUrl(cik, accessionFromTapeRow(row)));
}
function congressDisclosureHref(card, row) {
  let fromRow = allowlistedActionHref(row?.source_url);
  if (fromRow) return fromRow;
  if (card?.filerLocked) return ``;
  return card?.chamber === `Senate` ? SENATE_EFD_HREF : HOUSE_PTR_SEARCH_HREF;
}
function filingActionHref(row, card) {
  let type = String(card?.type || row?.event_type || row?.source_record_type || ``).toLowerCase();
  if (type === `form_4` || type === `insider`) {
    let owner = form4OwnerHref(row);
    if (owner) return owner;
  }
  return filingReceiptHref(row);
}
function TapeNextAction({ card, row, compact = !0 }) {
  if (usableTradeTicker(card?.ticker))
    return (0, w.jsx)(LiveQuoteLinks, { ticker: card.ticker, compact });
  let href = ``,
    label = ``;
  if (card?.type === `congress_trade`) {
    href = congressDisclosureHref(card, row);
    label = /ptr-pdfs/i.test(href)
      ? `Open PTR PDF`
      : card.chamber === `Senate`
        ? `Open Senate eFD`
        : href
          ? `Search House PTR`
          : ``;
  } else if (card?.type === `institutional_13f`) {
    href = filingActionHref(row, card);
    label = href ? `Open 13F filing` : ``;
  } else if (card?.type === `form_4`) {
    href = filingActionHref(row, card);
    label = href ? `Open Form 4` : ``;
  }
  if (!href || !label) return null;
  return (0, w.jsx)(`a`, {
    href,
    target: `_blank`,
    rel: `noopener noreferrer`,
    className: `vortx-live-quote`,
    onClick: (event) => event.stopPropagation(),
    title: /ptr-pdfs/i.test(href)
      ? `Official House PTR PDF. Research only.`
      : /own-disp/i.test(href)
        ? `SEC reporting owner filings. Research only.`
        : `Official filing document. Research only.`,
    children: label,
  });
}
function browseTypeFromLocation() {
  if (typeof window > `u`) return `congress`;
  let path = String(window.location.pathname || `/`).replace(/\/+$/, ``) || `/`,
    params = new URLSearchParams(window.location.search),
    view = String(params.get(`view`) || ``).toLowerCase();
  if (path === `/congress-trades` || view === `congress`) return `congress`;
  if (path === `/insider-trades` || view === `insider`) return `insider`;
  if (path === `/fund-holdings` || view === `thirteenf`) return `thirteenf`;
  return parseBrowseType(params.get(`type`));
}
function customerNoticeLabel(e) {
  return e === `workforce`
    ? `Workforce notice`
    : e === `financial`
      ? `Financial filing`
      : e === `insider`
        ? `Form 4`
        : e === `congress`
          ? `STOCK Act`
          : e === `institutional`
            ? `13F`
            : `Court record`;
}
function isTradingDeskEvent(e) {
  let t = String(e?.event_type || e?.notice_kind || ``).toLowerCase();
  return (
    t === `form_4` ||
    t === `congress_trade` ||
    t === `institutional_13f` ||
    t === `insider` ||
    t === `congress` ||
    t === `institutional` ||
    /form_4|congress|stock_act|13f|insider/.test(t)
  );
}
function recordTypeDotColor(e) {
  let t = String(e || ``).toLowerCase();
  return /congress|stock.?act/.test(t)
    ? `#38bdf8`
    : /form_4|insider/.test(t)
      ? `#a78bfa`
      : /13f|institutional/.test(t)
        ? `#34d399`
        : /warn|layoff/.test(t)
          ? `#fb923c`
          : /receivership/.test(t)
            ? `#fbbf24`
            : /lien/.test(t)
              ? `#2dd4bf`
              : /bankruptcy|chapter|adversary/.test(t)
                ? `#c4b5fd`
                : /notice_of_intent|regulatory/.test(t)
                  ? `#f472b6`
                  : `#94a3b8`;
}
function customerLockLabel(e) {
  return (
    {
      entity_names: `Entity name unlock`,
      source_url: `Source document URLs`,
      csv_export: `CSV export`,
      api_access: `API access`,
    }[e] || e
  );
}
function customerUrgencyLabel(e) {
  return e === `urgent`
    ? `Urgent review`
    : e === `review`
      ? `Building pressure`
      : `Monitoring`;
}
function B(e) {
  return e >= 85
    ? `Urgent review`
    : e >= 65
      ? `Building pressure`
      : `Monitored; no action needed`;
}
function legalInlineNote(e) {
  return (0, w.jsxs)(`p`, {
    className: `mt-4 text-xs leading-5 text-soft`,
    children: [
      `Public record, not a verdict; `,
      (0, w.jsx)(`button`, {
        type: `button`,
        onClick: e,
        className: `underline underline-offset-4 transition hover:text-ink`,
        children: `see Legal for details`,
      }),
      `.`,
    ],
  });
}
function trackMarketingStep(e, t) {
  fetch(`/api/marketing/track`, {
    method: `POST`,
    headers: { "content-type": `application/json` },
    body: JSON.stringify({ step: e, detail: t || `` }),
  }).catch(() => {});
  typeof window.vortxTrack === `function` && window.vortxTrack(e, t ? { detail: t } : void 0);
}
function trackMarketingStepOnce(storageKey, step, detail) {
  try {
    if (typeof sessionStorage == `undefined`) {
      trackMarketingStep(step, detail);
      return;
    }
    let key = `vortx_track_${storageKey || step}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, `1`);
    trackMarketingStep(step, detail);
  } catch {
    trackMarketingStep(step, detail);
  }
}
function openNebulaPricing(onOpenPricing, detail = `nebula`) {
  trackMarketingStep(`unlock_cta_click`, detail);
  if (onOpenPricing) onOpenPricing();
  else window.location.assign(`/?view=pricing&plan=nebula`);
}
  function ctaReassureLine({ className: cls = `mt-2 text-xs leading-5 text-muted` } = {}) {
  return (0, w.jsx)(`p`, {
    className: cls,
        children: `Try Vortx free for 7 days, then ${FEATURED_PLAN_PRICE}. Cancel anytime.`,
  });
}
function lockedUnlockLabel(_card) {
  return `See the name · ${FEATURED_PLAN_PRICE}`;
}
function primaryUnlockCta() {
  return [`Start 7-day trial → `, FEATURED_PLAN_PRICE];
}
function pickPublicProofExample(events = [], entities = []) {
  let trading = [`form_4`, `congress_trade`, `institutional_13f`],
    entityMap = new Map((entities || []).map((e) => [e.id, e])),
    rows = (events || []).filter((e) => trading.includes(String(e.event_type || ``)));
  for (let row of rows) {
    let card = parseTradingCardFields(row),
      ent = entityMap.get(row.entity_id);
    if (card.filerLocked && ent?.preview_unlocked) {
      card = {
        ...card,
        filerName: V(ent.canonical_name),
        filerLocked: !1,
        showCompany:
          Boolean(card.issuer) &&
          V(ent.canonical_name).toLowerCase() !== String(card.issuer).toLowerCase(),
      };
    }
    if (!card.filerLocked && card.filerName) {
      return {
        mode: `unlocked`,
        row,
        card,
        fomo: tradingProofFomoLine(card, {
          amountLabel: card.amountLabel,
          filingDate: row.filing_date,
          locked: !1,
        }),
      };
    }
  }
  let tease = rows[0] ? parseTradingCardFields(rows[0]) : null;
  return tease
    ? {
        mode: `tease`,
        row: rows[0],
        card: tease,
        fomo: tradingProofFomoLine(tease, {
          amountLabel: tease.amountLabel,
          filingDate: rows[0].filing_date,
          locked: !0,
        }),
      }
    : null;
}
function publicProofSpotlight({ events, entities, onOpenPricing }) {
  let proof = (0, l.useMemo)(
    () => pickPublicProofExample(events, entities),
    [events, entities],
  );
  (0, l.useEffect)(() => {
    if (proof) trackMarketingStep(`public_proof_view`, `${proof.mode}:${proof.row?.id || ``}`);
  }, [proof?.mode, proof?.row?.id]);
  if (!proof) return null;
  let unlocked = proof.mode === `unlocked`;
  return (0, w.jsxs)(`aside`, {
    className: `vortx-public-proof glass-panel mt-4 overflow-hidden rounded-2xl border border-terminal-green/30 p-4`,
    children: [
      (0, w.jsx)(`p`, {
        className: `data-font text-[11px] uppercase tracking-[0.12em] text-terminal-green`,
        children: unlocked
          ? `Public filing · name visible`
          : `Public filing · name locked here`,
      }),
      (0, w.jsx)(`p`, {
        className: `display-font mt-2 text-xl leading-snug text-ink md:text-2xl`,
        children: proof.fomo,
      }),
      (0, w.jsxs)(`p`, {
        className: `mt-2 text-xs leading-5 text-muted`,
        children: [
          proof.card.sourceMeta,
          proof.card.amountLabel
            ? (0, w.jsxs)(`span`, {
                className: `text-terminal-green`,
                children: [` · `, proof.card.amountLabel],
              })
            : null,
          unlocked
            ? ` · This is the line a Vortx plan unlocks on every row.`
            : ` · A Vortx plan unlocks the name on rows like this.`,
        ],
      }),
      (0, w.jsx)(`button`, {
        type: `button`,
        onClick: () => openNebulaPricing(onOpenPricing, `public_proof`),
        className: `terminal-button-solid mt-3 rounded-xl px-4 py-2.5 text-sm font-semibold`,
        children: unlocked ? primaryUnlockCta() : lockedUnlockLabel(proof.card),
      }),
      ctaReassureLine(),
    ],
  });
}
function congressAlertCapture() {
  // Digest waitlist removed until a real free digest ships (Phase 3).
  return null;
}
function V(e) {
  return e
    .replace(/\s*\(In re .+?\)$/i, ``)
    .replace(/^In re\s+/i, ``)
    .trim();
}
function truncateWord(e, t = 72) {
  let n = String(e || ``).trim();
  if (!n || n.length <= t) return n;
  let r = n.slice(0, t),
    i = r.lastIndexOf(` `);
  return `${(i > Math.floor(t * 0.5) ? r.slice(0, i) : r).trim()}…`;
}
function partyFromCap(e) {
  let t = String(e || ``).trim();
  if (!t) return ``;
  let n = t.split(/\s+v\.?\s+/i);
  if (n.length < 2) return V(t);
  for (let e of [n[1], n[0]]) {
    let r = V(e);
    if (/\b(llc|inc|corp|company|holdings|lp|facility|corporation)\b/i.test(r)) return r;
  }
  return V(n[n.length - 1]);
}
function featuredShortTitle(e) {
  if (!e) return `Public record filing`;
  if (e.short_title) return e.short_title;
  let t = V(e.entity || ``),
    n = e.event_type || `record`,
    r =
      {
        bankruptcy_docket: `bankruptcy filing`,
        bankruptcy_chapter_11: `Chapter 11 bankruptcy filing`,
        bankruptcy_chapter_7: `Chapter 7 bankruptcy filing`,
        warn_notice: `workforce layoff notice`,
        mechanics_lien: `lien filing`,
        receivership: `receivership filing`,
      }[n] || `public record filing`;
  if (t && !/\s+v\.?\s+/i.test(t)) return truncateWord(`${t} ${r}`);
  let i = partyFromCap(e.raw_caption || e.entity || ``);
  return i ? truncateWord(`${i} ${r}`) : truncateWord(r.charAt(0).toUpperCase() + r.slice(1));
}
function diversePulseSample(e, t = 5) {
  let trading = [`form_4`, `congress_trade`, `institutional_13f`],
    n = [],
    r = new Set(),
    i = new Set(),
    ordered = (e || []).filter((a) => trading.includes(String(a.event_type || ``)));
  for (let a of ordered) {
    if (n.length >= t) break;
    let o = a.event_type || `record`;
    if (r.has(o) || i.has(a.entity_id)) continue;
    (n.push(a), r.add(o), i.add(a.entity_id));
  }
  for (let a of ordered) {
    if (n.length >= t) break;
    n.includes(a) || n.push(a);
  }
  return n;
}
function H(e) {
  return (
    {
      mechanics_lien: `Lien record`,
      notice_of_intent: `Pre-suit notice`,
      bankruptcy_adversary: `Bankruptcy dispute`,
      civil_docket: `Court record`,
      warn_notice: `Workforce notice`,
      regulatory_notice: `Agency record`,
      form_4: `Form 4 insider filing`,
      congress_trade: `STOCK Act disclosure`,
      institutional_13f: `13F institutional filing`,
    }[e] || e.replaceAll(`_`, ` `)
  );
}
function U(e) {
  let t = H(e.event_type);
  return e.event_type === `form_4`
    ? `Form 4 insider filing detected`
    : e.event_type === `congress_trade`
      ? `STOCK Act disclosure detected`
      : e.event_type === `institutional_13f`
        ? `13F institutional filing detected`
        : e.event_type === `warn_notice`
          ? `Workforce notice detected`
          : e.event_type === `notice_of_intent`
            ? `Pre-suit notice detected`
            : e.event_type === `mechanics_lien`
              ? `Lien signal detected`
              : e.event_type === `bankruptcy_adversary`
                ? `Bankruptcy dispute detected`
                : `${t.charAt(0).toUpperCase()}${t.slice(1)} detected`;
}
function W() {
  return `Locked entity`;
}
function pricingTierHas(e, t) {
  if (e === `galactic` || e === `custom`) return !0;
  if (t === `live_feed`) return !0;
  if (t === `names_on_alert`)
    return [`scout`, `nebula`, `pulsar`, `supernova`].includes(e);
  if (t === `signal_meta`)
    return [`sentinel`, `nebula`, `pulsar`, `supernova`].includes(e);
  if (t === `full_names`) return [`nebula`, `pulsar`, `supernova`].includes(e);
  if (t === `source_urls`) return [`pulsar`, `supernova`].includes(e);
  if (t === `csv_export`) return [`pulsar`, `supernova`].includes(e);
  if (t === `api_access`) return e === `supernova`;
  if (t === `unlimited`) return !1;
  if (t === `custom_sla`) return !1;
  return !1;
}
function cleanSummaryText(e) {
  return String(e || ``)
    .replace(/https?:\/\/\S+/g, ``)
    .replace(/\s+/g, ` `)
    .trim();
}
function publicReasonLabel(e) {
  let t = String(e || ``).split(`:`)[0]?.trim();
  return t ? `${t}: subscriber-only detail` : `Public record signal: subscriber-only detail`;
}
function formatPublicElapsed(filingDate, stillLocked, ingestedAt) {
  let raw = String(filingDate || ``).trim(),
    dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw),
    ingested = String(ingestedAt || ``).trim(),
    filed = Date.parse(
      dateOnly && ingested.startsWith(raw) ? ingested : dateOnly ? `${raw}T12:00:00` : raw,
    );
  if (!Number.isFinite(filed))
    return stillLocked
      ? `${filingDate || `Filing date pending`} · still locked`
      : String(filingDate || `Filing date pending`);
  let elapsed;
  if (dateOnly && !ingested.startsWith(raw)) {
    let start = new Date(),
      filedDay = new Date(`${raw}T12:00:00`),
      startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()),
      filedMid = new Date(filedDay.getFullYear(), filedDay.getMonth(), filedDay.getDate()),
      days = Math.max(0, Math.round((startDay - filedMid) / 86400000));
    elapsed =
      days === 0
        ? `Today`
        : days === 1
          ? `Yesterday`
          : days < 14
            ? `${days}d ago`
            : `Filed ${raw}`;
  } else {
    let ms = Math.max(0, Date.now() - filed),
      hours = Math.floor(ms / 3600000),
      days = Math.floor(ms / 86400000);
    elapsed =
      hours < 1
        ? `Just filed`
        : hours < 24
          ? `${hours}h ago`
          : days === 1
            ? `1 day ago`
            : days < 14
              ? `${days}d ago`
              : `Filed ${raw.slice(0, 10)}`;
  }
  return stillLocked ? `${elapsed} · locked` : elapsed;
}
function featuredExample(e) {
  return e?.featured || N;
}
function marketingTimeline(e) {
  return Array.isArray(e?.how_it_works_timeline) && e.how_it_works_timeline.length
    ? e.how_it_works_timeline
    : P;
}
function useCaseCopy(e, t) {
  if (!t) return e.copy;
  if (/journalist/i.test(e.title) && t.journalism) return t.journalism;
  if (/HR & workforce/i.test(e.title) && t.hr) return t.hr;
  if (/Small business/i.test(e.title) && t.smb) return t.smb;
  return e.copy;
}
function alignMarketingFeaturedWithFeed(marketing, entities, events) {
  if (!marketing?.featured?.source_live || !entities?.length) return marketing;
  let ranked = [...entities]
    .filter((row) => !/^locked entity$/i.test(String(row.canonical_name || ``).trim()))
    .sort((a, b) => (Number(b.latest_score) || 0) - (Number(a.latest_score) || 0));
  let top = ranked[0];
  if (!top) return marketing;
  let event = (events || []).find((row) => row.entity_id === top.id),
    shortTitle = featuredShortTitle({
      entity: V(top.canonical_name),
      event_type: event?.event_type || marketing.featured.event_type,
      raw_caption: event?.title || top.canonical_name,
    }),
    filingDate = event?.filing_date || marketing.featured.filingDate,
    score = Number(top.latest_score) || Number(marketing.featured.score) || 0,
    featured = {
      ...marketing.featured,
      entity_id: top.id,
      entity: V(top.canonical_name),
      short_title: shortTitle,
      raw_caption: event?.title || marketing.featured.raw_caption || null,
      score,
      event_type: event?.event_type || marketing.featured.event_type,
      jurisdiction: formatJurisdictionLabel(top.jurisdiction || event?.jurisdiction) || marketing.featured.jurisdiction,
      filingDate,
      selection_basis: `highest_severity_score`,
    };
  return {
    ...marketing,
    featured,
  };
}
function feedMarketingFallback(stats, entities, events) {
  if (!entities?.length) return null;
  let named =
    entities.find(
      (row) =>
        row.preview_unlocked && !/^locked entity$/i.test(String(row.canonical_name || ``)),
    ) ||
    entities.find((row) => !/^locked entity$/i.test(String(row.canonical_name || ``)));
  if (!named) return null;
  let event = (events || []).find((row) => row.entity_id === named.id),
    featured = {
      entity: V(named.canonical_name),
      short_title: featuredShortTitle({
        entity: V(named.canonical_name),
        event_type: event?.event_type || `record`,
        raw_caption: event?.title || named.canonical_name,
      }),
      raw_caption: event?.title || null,
      source: event?.source_name || `Public source feed`,
      sourceUrl: event?.source_url || null,
      filingDate: event?.filing_date || null,
      signal:
        event?.summary && !/subscribe for/i.test(String(event.summary))
          ? event.summary
          : `${U(event || { event_type: `record` })} · ${formatJurisdictionLabel(named.jurisdiction)} · filed ${event?.filing_date || `recent`}`,
      score: Number(named.latest_score) || Number(event?.severity) || 0,
      urgency: B(named.latest_score),
      action: N.action,
      event_type: event?.event_type || `record`,
      jurisdiction: formatJurisdictionLabel(named.jurisdiction),
      source_live: !0,
    },
    records7d = Number(stats?.records_surfaced_7d) || 0,
    companies7d = Number(stats?.companies_flagged_7d) || 0,
    feeds = stats?.source_feeds || [];
  return {
    featured,
    hero_relief: /bankruptcy|receivership|chapter/i.test(String(featured.event_type))
      ? `${featured.short_title || featured.entity} was public ${featured.filingDate || `recent`}, before the restructuring story ran.`
      : `${featured.short_title || featured.entity} hit the public record on ${featured.filingDate || `recent`} in ${featured.jurisdiction}, before the narrative hardened.`,
    hero_copy: feeds.length
      ? `${feeds.slice(0, 3).join(` · `)} · ${Number(stats?.active_sources) || feeds.length} active feeds · ${(records7d || Number(stats?.records_surfaced) || 0).toLocaleString()} filings in the live queue.`
      : PRIMARY_BUYER.copy,
    stats_headline: `Lawmakers · insiders · funds. Updated as filings clear`,
    how_it_works_subcopy: `They already filed. Search the company. See the name. Watch them so the next disclosure hits your inbox.`,
    how_it_works_timeline: P,
    sources_intro: feeds.length
      ? `${feeds.slice(0, 4).join(` · `)} · ${Number(stats?.active_sources) || feeds.length} active feeds refreshed daily.`
      : void 0,
    desk_teaser_locked: (() => {
      let lockedEvent =
        (events || []).find((row) =>
          /bankruptcy|receivership|chapter/i.test(String(row.event_type || ``)),
        ) || (events || [])[0];
      if (!lockedEvent) return void 0;
      return {
        title: U(lockedEvent),
        copy: `${formatJurisdictionLabel(lockedEvent.jurisdiction)} · filed ${lockedEvent.filing_date || `recent`} · the name shows after you subscribe`,
      };
    })(),
    segment_hooks: {
      journalism: `Latest queue filing: ${featured.filingDate || `recent`} · ${featured.jurisdiction} · ${H(featured.event_type)}.`,
      hr:
        Number(stats?.warn_notices_7d) > 0
          ? `${Number(stats.warn_notices_7d).toLocaleString()} WARN notices flagged this week across monitored state workforce feeds.`
          : void 0,
      smb:
        Number(stats?.bankruptcy_dockets_7d) > 0
          ? `${Number(stats.bankruptcy_dockets_7d).toLocaleString()} bankruptcy dockets surfaced this week. Run counterparty checks before you sign.`
          : void 0,
    },
  };
}
function Ze(e) {
  return /^https?:\/\//i.test(String(e || ``).trim());
}
const COURT_SLUG_LABELS = {
  scb: `Court of Chancery of Delaware`,
  deb: `U.S. Bankruptcy Court, District of Delaware`,
  nysd: `U.S. District Court, Southern District of New York`,
  cand: `U.S. District Court, Northern District of California`,
  txed: `U.S. District Court, Eastern District of Texas`,
  ilnd: `U.S. District Court, Northern District of Illinois`,
};
function courtSlugFromUrl(e) {
  let t = String(e || ``).match(/\/courts\/([^/?#]+)/i);
  return t?.[1]?.replace(/\/$/, ``) || ``;
}
function formatJurisdictionLabel(e, t) {
  let n = String(e || ``).trim();
  if (!n) return t ? `${t} jurisdiction` : `Jurisdiction on file`;
  if (!Ze(n)) return n;
  let r = courtSlugFromUrl(n);
  if (r && COURT_SLUG_LABELS[r]) return COURT_SLUG_LABELS[r];
  if (/courtlistener/i.test(n))
    return r ? `Court record (${r.toUpperCase()})` : `Federal or state court record`;
  try {
    return `${new URL(n).hostname.replace(/^www\./, ``)} public source`;
  } catch {
    return `Public court jurisdiction`;
  }
}
function eventMetaLine(e, t = !1) {
  let n = e.jurisdiction_display || formatJurisdictionLabel(e.jurisdiction, e.source_name);
  return t && e.source_url && !Ze(String(e.source_url))
    ? [n, `Filed ${e.filing_date || `recent`}`, e.source_url].filter(Boolean)
    : [
        n,
        `Filed ${e.filing_date || `recent`}`,
        e.source_access_label || `Source document · subscriber access`,
      ];
}
function publicEventCopy(e) {
  let type = String(e.event_type || ``),
    t = H(e.event_type),
    n = formatJurisdictionLabel(e.jurisdiction_display || e.jurisdiction, e.source_name),
    r = e.filing_date ? ` Filed ${e.filing_date}.` : ``;
  if ([`form_4`, `congress_trade`, `institutional_13f`].includes(type)) {
    let card = parseTradingCardFields(e);
    return {
      title: tradingPlainHeadline(card),
      summary: card.sourceMeta,
    };
  }
  return {
    title: U(e),
    summary:
      e.event_type === `warn_notice`
        ? `A WARN workforce notice surfaced${r} WARN disclosures often precede layoff headlines by days or weeks.`
        : String(e.event_type || ``).includes(`bankruptcy`) || e.event_type === `receivership`
          ? `A financial-distress court record appeared${n ? ` in ${n}` : ``}.${r} These public filings often precede restructuring news and vendor-payment delays.`
          : `A ${t.toLowerCase()} appeared in the public feed.${r} Subscribe for entity-linked source documents and timelines.`,
  };
}
function G(e) {
  return e >= 1e9 ? `$${(e / 1e9).toFixed(2)}B` : `$${Math.round(e / 1e6)}M`;
}
function K(e) {
  return e.ticker
    ? G((e.vulnerability_score ?? e.latest_score) * 37e6 + 44e7)
    : `gated feed`;
}
function q(e) {
  return e.enabled
    ? `Active`
    : e.terms_status === `approved` || e.terms_status === `licensed`
      ? `Ready, not enabled`
      : `Under review`;
}
function commandPaletteHitFromEvent(row, privileged = !1) {
  let card = parseTradingCardFields(row),
    stream = tapeEventStream(card.type);
  if (!stream) return null;
  if (card.holdingsReport && !card.ticker) {
    if (!privileged || !card.filerName) return null;
    return {
      id: row.id,
      stream,
      query: sanitizeTapeQuery(card.filerName) || card.filerName,
      ticker: ``,
      issuer: card.issuer || ``,
      title: card.filerName,
      detail: `${card.formLabel || `13F`} · ${card.periodLabel || `holdings report`}`,
    };
  }
  if (!card.ticker) return null;
  return {
    id: row.id,
    stream,
    query: card.ticker,
    ticker: card.ticker,
    issuer: card.issuer || ``,
    title: card.ticker,
    detail: [
      card.actionLabel || ``,
      privileged && card.filerName ? card.filerName : card.issuer || ``,
      stream === `insider` ? `Insider` : stream === `congress` ? `Congress` : `Fund`,
    ]
      .filter(Boolean)
      .join(` · `),
  };
}
function X({
  open: e,
  onClose: t,
  events: events = [],
  onSelect: r,
  feedAccess: feedAccess = null,
}) {
  let [a, o] = (0, l.useState)(``),
    paletteLimit = feedAccess?.browse_limits?.commandPalette ?? 8,
    privileged = Boolean(feedAccess?.subscriber),
    s = (0, l.useMemo)(() => {
      let q = a.trim().toLowerCase(),
        hits = [],
        seen = new Set(),
        rows = [...(events || [])].sort((left, right) =>
          String(right.filing_date || right.created_at || ``).localeCompare(
            String(left.filing_date || left.created_at || ``),
          ),
        );
      for (let row of rows) {
        let hit = commandPaletteHitFromEvent(row, privileged);
        if (!hit) continue;
        let key = `${hit.stream}|${hit.query}`;
        if (seen.has(key)) continue;
        if (q) {
          let blob = `${hit.ticker} ${hit.query} ${hit.title} ${hit.detail} ${hit.issuer || ``}`.toLowerCase();
          if (!blob.includes(q)) continue;
        } else if (!hit.ticker) continue;
        seen.add(key);
        hits.push(hit);
        if (hits.length >= paletteLimit) break;
      }
      return hits;
    }, [events, a, paletteLimit, privileged]);
  return (
    (0, l.useEffect)(() => {
      if (!e) return;
      let n = (e) => {
        e.key === `Escape` && t();
      };
      return (
        window.addEventListener(`keydown`, n),
        () => window.removeEventListener(`keydown`, n)
      );
    }, [t, e]),
    e
      ? (0, w.jsx)(`div`, {
          className: `vortx-command-palette fixed inset-0 z-50 bg-black/70 px-4 py-24`,
          role: `dialog`,
          "aria-modal": `true`,
          children: (0, w.jsxs)(`div`, {
            className: `vortx-command-palette__panel mx-auto max-w-2xl rounded-lg border border-metallic p-3`,
            children: [
              (0, w.jsxs)(`div`, {
                className: `flex items-center gap-3 border-b border-white/10 px-3 py-2`,
                children: [
                  (0, w.jsx)(`input`, {
                    autoFocus: !0,
                    value: a,
                    onChange: (e) => o(e.target.value),
                    onKeyDown: (e) => {
                      if (e.key !== `Enter`) return;
                      e.preventDefault();
                      if (s[0]) {
                        r(s[0]);
                        return;
                      }
                      let typed = sanitizeTapeQuery(a);
                      if (typed) r({ id: `typed`, stream: ``, query: typed, ticker: typed, title: typed, detail: `` });
                    },
                    placeholder: `Search ticker or name…`,
                    className: `data-font flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-soft`,
                  }),
                  (0, w.jsx)(`button`, {
                    type: `button`,
                    onClick: t,
                    className: `data-font text-xs text-soft underline underline-offset-4 transition hover:text-ink`,
                    children: `esc`,
                  }),
                ],
              }),
              (0, w.jsx)(i.div, {
                initial: `hidden`,
                animate: `show`,
                variants: {
                  hidden: {},
                  show: { transition: { staggerChildren: 0.06 } },
                },
                className: `p-2`,
                children: s.length
                  ? s.map((hit) =>
                      (0, w.jsxs)(
                        i.button,
                        {
                          type: `button`,
                          variants: {
                            hidden: { opacity: 0, y: 10 },
                            show: { opacity: 1, y: 0 },
                          },
                          onClick: () => r(hit),
                          className: `group flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition duration-200 hover:bg-white/[0.06]`,
                          children: [
                            (0, w.jsxs)(`span`, {
                              children: [
                                (0, w.jsx)(`span`, {
                                  className: `block text-sm text-ink`,
                                  children: hit.title,
                                }),
                                (0, w.jsx)(`span`, {
                                  className: `data-font mt-1 block text-xs text-soft`,
                                  children: hit.detail,
                                }),
                              ],
                            }),
                            (0, w.jsx)(`span`, {
                              className: `data-font text-terminal-blue`,
                              children: hit.stream === `insider` ? `Insider` : hit.stream === `congress` ? `Congress` : `13F`,
                            }),
                          ],
                        },
                        hit.id,
                      ),
                    )
                  : (0, w.jsx)(`p`, {
                      className: `px-3 py-4 text-sm text-muted`,
                      children: a.trim()
                        ? `No matching trades in this list.`
                        : `Type a ticker to filter the list.`,
                    }),
              }),
            ],
          }),
        })
      : null
  );
}
function Z({ onOpen: e, entities: t = [] }) {
  let [n, r] = (0, l.useState)(0),
    a = (0, l.useMemo)(
      () =>
        [...t]
          .filter((e) => e.preview_unlocked)
          .sort((e, t) => t.latest_score - e.latest_score)
          .map((e) => V(e.canonical_name))
          .filter(Boolean)
          .slice(0, 1),
      [t],
    );
  (0, l.useEffect)(() => {
    if (a.length < 2) return;
    let e = setInterval(() => r((e) => (e + 1) % a.length), 3200);
    return () => clearInterval(e);
  }, [a.length]);
  return (0, w.jsxs)(`button`, {
      type: `button`,
      onClick: e,
      className: `vortx-hero-search terminal-button-solid group flex w-full max-w-2xl flex-1 items-center justify-between gap-4 rounded-2xl px-6 py-4 text-left shadow-sm transition hover:opacity-95`,
      children: [
        (0, w.jsxs)(`span`, {
          className: `flex items-center gap-3`,
          children: [
            (0, w.jsx)(`span`, {
              className: `data-font rounded-lg border border-white/20 bg-black/30 px-2.5 py-1 text-xs text-white/90`,
              children: `Cmd+K`,
            }),
            (0, w.jsxs)(`span`, {
              children: [
                (0, w.jsx)(`span`, {
                  className: `vortx-hero-search__title block text-base font-semibold text-white`,
                  children: `Search a ticker or company`,
                }),
                (0, w.jsx)(`span`, {
                  className: `data-font mt-1 block text-xs opacity-90`,
                    children: a.length
                    ? renderJargonText(`Try ${a[n]} · names show after you subscribe`)
                    : `Type a ticker to see its trades`,
                }),
              ],
            }),
          ],
        }),
        (0, w.jsx)(`span`, {
          className: `text-sm font-semibold text-white`,
          children: `Search →`,
        }),
      ],
    });
}
function re({
  events: e,
  entities: t,
  onOpenPricing: n,
  variant: variant = `rail`,
  authToken: authToken,
  starIds: starIds = [],
  watchFlashId: watchFlashId = ``,
  onToggleWatch: onToggleWatch,
  watchRefreshKey: watchRefreshKey = 0,
  feedLoading: feedLoading = !1,
}) {
  let terminal = variant === `terminal`,
    prefs = readTradeListPrefs(`overview`),
    [sortMode, setSortMode] = (0, l.useState)(prefs.sort || `recent`),
    [sideFilter, setSideFilter] = (0, l.useState)(prefs.side || `all`),
    [tickerQuery, setTickerQuery] = (0, l.useState)(
      () => readTapeQueryFromLocation() || prefs.query || ``,
    ),
    [typeFilter, setTypeFilter] = (0, l.useState)(
      prefs.typeFilter === `institutional_13f` ? `all` : prefs.typeFilter || `all`,
    ),
    [whaleId, openWhale, closeWhale] = useWhaleWho(),
    coverageMap = useCoverageEnrich(e),
    starSet = (0, l.useMemo)(() => new Set(starIds || []), [starIds]);
  (0, l.useEffect)(() => {
    writeTradeListPrefs(`overview`, {
      sort: sortMode,
      side: sideFilter,
      query: tickerQuery,
      typeFilter,
    });
  }, [sortMode, sideFilter, tickerQuery, typeFilter]);
  let typedRows = (0, l.useMemo)(() => {
      let trading = (e || []).filter((row) =>
        [`form_4`, `congress_trade`, `institutional_13f`].includes(String(row.event_type || ``)),
      );
      if (terminal) trading = trading.filter(isUsableGuestTrade);
      if (typeFilter !== `all`) {
        trading = trading.filter((row) => String(row.event_type || ``) === typeFilter);
      }
      return trading.map((row) => mergeCoverageOntoEvent(row, coverageMap));
    }, [e, typeFilter, coverageMap, terminal]),
    overviewStreamKey =
      typeFilter === `form_4`
        ? `insider`
        : typeFilter === `congress_trade`
          ? `congress`
          : typeFilter === `institutional_13f`
            ? `thirteenf`
            : `overview`,
    sideOptions = actionFilterOptions(typedRows, overviewStreamKey);
  (0, l.useEffect)(() => {
    let allowed = new Set(sideOptions.map(([id]) => id));
    if (sideFilter !== `all` && !allowed.has(sideFilter)) setSideFilter(`all`);
  }, [sideFilter, sideOptions]);
  let filteredEvents = (0, l.useMemo)(
      () =>
        applyTradeListControls(typedRows, {
          sort: sortMode,
          side: sideFilter,
          query: tickerQuery,
        }),
      [typedRows, sortMode, sideFilter, tickerQuery],
    ),
    r = (0, l.useMemo)(() => new Map((t || []).map((e) => [e.id, e])), [t]),
    exemplar = (0, l.useMemo)(() => pickLockedExemplar(filteredEvents), [filteredEvents]),
    a = (0, l.useMemo)(() => {
      let sample = diversePulseSample(filteredEvents, terminal ? 24 : 12);
      if (!exemplar?.row?.id) return sample;
      return sample.filter((row) => row.id !== exemplar.row.id);
    }, [filteredEvents, terminal, exemplar]),
    tapeRows = (0, l.useMemo)(() => {
      let list = [];
      if (exemplar?.row) list.push(exemplar.row);
      for (let row of a) list.push(row);
      return list;
    }, [a, exemplar]),
    tradingCount = filteredEvents.length,
    shownCount = tapeRows.length,
    openPricing = (detail = `live_pulse`) => openNebulaPricing(n, detail);
  return (0, w.jsxs)(terminal ? `section` : `aside`, {
    id: `live-pulse`,
    className: terminal
      ? `vortx-live-pulse vortx-live-pulse--terminal vortx-tape-panel scroll-mt-20`
      : `vortx-live-pulse vortx-tape-panel scroll-mt-20 lg:sticky lg:top-20`,
    children: [
      (0, w.jsxs)(`div`, {
        className: terminal ? `vortx-live-board` : `vortx-live-pulse__body`,
        children: [
      terminal
        ? (0, w.jsxs)(`div`, {
            className: `vortx-live-board__mast`,
            children: [
              (0, w.jsx)(`h3`, {
                className: `vortx-live-board__title display-font`,
                children: `Today's trades`,
              }),
              (0, w.jsx)(`p`, {
                className: `vortx-proof-chip`,
                children: feedLoading
                  ? `Loading today's trades`
                  : tradingCount
                    ? `${shownCount} of ${tradingCount}`
                    : `No trades in this list`,
              }),
            ],
          })
        : null,
      terminal
        ?               (0, w.jsx)(`p`, {
                className: `vortx-live-board__legend`,
                children: `Type a ticker. Green buy, red sell. Trade live opens a quote. Their trades opens that person.`,
              })
        : null,
      terminal
        ? null
        : (0, w.jsxs)(`div`, {
        className: `vortx-trade-filters vortx-trade-filters--category flex flex-wrap items-center justify-between gap-3`,
        children: [
          (0, w.jsxs)(`div`, {
            className: `vortx-trade-filters__chips`,
            children: [
              [
                [`all`, `All`],
                [`form_4`, `Insiders`],
                [`congress_trade`, `Congress`],
              ].map(([id, label]) =>
                (0, w.jsx)(
                  `button`,
                  {
                    type: `button`,
                    onClick: () => setTypeFilter(id),
                    className:
                      typeFilter === id
                        ? `vortx-trade-filter vortx-trade-filter--active`
                        : `vortx-trade-filter`,
                    children: filterChipLabel(id, label),
                  },
                  `overview-type-${id}`,
                ),
              ),
            ],
          }),
          (0, w.jsx)(`p`, {
            className: `vortx-proof-chip`,
            children: feedLoading
              ? `Loading today's trades`
              : tradingCount
                ? `Showing ${shownCount} of ${tradingCount} in this list`
                : `No trades in this list`,
          }),
        ],
      }),
      (0, w.jsx)(tradeListControlBar, {
        streamKey: `overview`,
        sort: sortMode,
        side: sideFilter,
        query: tickerQuery,
        onSort: setSortMode,
        onSide: setSideFilter,
        onQuery: setTickerQuery,
        sideOptions,
        showSideFilter: sideOptions.length > 1,
        compact: terminal,
        typeFilter,
        onType: setTypeFilter,
        typeOptions: terminal
          ? [
              [`all`, `All`],
              [`form_4`, `Insiders`],
              [`congress_trade`, `Congress`],
            ]
          : null,
      }),
      terminal ? (0, w.jsx)(deskLiveTicker, { events: e, variant: `home` }) : null,
      feedLoading
        ? (0, w.jsx)(`div`, {
            className: `mt-4`,
            children: (0, w.jsx)(tapeSkeleton, {
              rows: 8,
              columnMode: tapeColumnMode({ typeFilter, rows: tapeRows, home: terminal }),
            }),
          })
        : tapeRows.length
          ? (0, w.jsx)(tradingTapeTable, {
              rows: tapeRows,
              onOpenPricing: n,
              starSet,
              watchFlashId,
              onToggleWatch,
              canWatch: Boolean(onToggleWatch),
              featuredId: exemplar?.row?.id,
              featuredEntityId: readBonusPreviewIds()[0],
              columnMode: tapeColumnMode({ typeFilter, rows: tapeRows, home: terminal }),
              onFilterTicker: setTickerQuery,
              onOpenWhale: openWhale,
            })
          : (0, w.jsxs)(`div`, {
              className: `mt-4 rounded-lg border border-dashed border-white/15 p-4`,
              children: [
                (0, w.jsx)(`p`, {
                  className: `text-sm leading-6 text-muted`,
                  children: `No trades in this list yet. Type a ticker like NVDA to see who bought or sold it. A few names stay open. The rest show after you subscribe.`,
                }),
                traderPlaybook({ compact: !0 }),
              ],
            }),
        ],
      }),
      whaleId
        ? (0, w.jsx)(whaleWatchPanel, {
            entityId: whaleId,
            events: e,
            onClose: closeWhale,
            onOpenPricing: n,
            onToggleWatch,
            starred: starSet.has(whaleId),
            canWatch: Boolean(onToggleWatch),
          })
        : null,
      (() => {
        let bonusId = readBonusPreviewIds()[0],
          freeRow = bonusId
            ? filteredEvents.find((row) => row.entity_id === bonusId)
            : null;
        if (!freeRow?.entity_id || starSet.has(freeRow.entity_id)) return null;
        return (0, w.jsxs)(`div`, {
          className: `vortx-free-watch-prompt mt-4 rounded-lg border border-white/15 p-3`,
          children: [
            (0, w.jsx)(`p`, {
              className: `text-sm font-semibold text-ink`,
              children: `Unlocked on the highlighted row`,
            }),
            (0, w.jsx)(`p`, {
              className: `mt-1 text-xs leading-5 text-muted`,
              children: `Watch them to get an email when they file again. Works signed out; syncs when you sign in.`,
            }),
            (0, w.jsx)(`button`, {
              type: `button`,
              className: `vortx-desk-watch-btn mt-2`,
              onClick: () => {
                trackMarketingStep(`watch_suggest_click`, `free_preview`);
                if (onToggleWatch) void onToggleWatch(freeRow.entity_id);
                else openPricing(`free_watch`);
              },
              children: `Watch this person`,
            }),
          ],
        });
      })(),
      (0, w.jsxs)(`details`, {
        className: `vortx-more-block`,
        open: !0,
        children: [
          (0, w.jsx)(`summary`, { children: `Most watched today` }),
          (0, w.jsx)(mostWatchedModule, {
            scope: `overview`,
            title: `Most watched today`,
            refreshKey: watchRefreshKey,
            onOpenWhale: openWhale,
          }),
        ],
      }),
      (0, w.jsx)(`a`, {
        href: browseHref(`congress`),
        className: `mt-4 inline-block text-sm text-muted underline-offset-4 hover:text-ink hover:underline`,
        children: `Browse Congress, insiders, and funds`,
      }),
    ],
  });
}
function testimonialInitials(e) {
  return String(e || ``)
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((e) => e[0]?.toUpperCase() || ``)
    .join(``);
}
function testimonialSlot({ item: e }) {
  let [shown, setShown] = (0, l.useState)(e),
    [opaque, setOpaque] = (0, l.useState)(!0);
  (0, l.useEffect)(() => {
    if (e.name === shown.name && e.quote === shown.quote) return;
    setOpaque(!1);
    let n = setTimeout(() => {
      (setShown(e), setOpaque(!0));
    }, 280);
    return () => clearTimeout(n);
  }, [e, shown.name, shown.quote]);
  return (0, w.jsxs)(`article`, {
    className: `vortx-testimonial-card glass-panel flex min-h-[272px] flex-col rounded-2xl p-6`,
    children: [
      (0, w.jsxs)(`div`, {
        className: `vortx-testimonial-card__top flex items-center justify-between gap-3`,
        children: [
          (0, w.jsx)(`p`, {
            className: `text-sm tracking-wide text-terminal-green`,
            children: `★★★★★`,
          }),
          (0, w.jsx)(`span`, {
            className: `data-font shrink-0 rounded-full border border-terminal-blue/35 bg-terminal-blue/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-accent`,
            children: shown.segment,
          }),
        ],
      }),
      (0, w.jsxs)(`div`, {
        className: `vortx-testimonial-body flex flex-1 flex-col transition-opacity duration-200 ease-out ${opaque ? `opacity-100` : `opacity-0`}`,
        "aria-live": `polite`,
        children: [
          (0, w.jsxs)(`blockquote`, {
            className: `vortx-testimonial-quote mt-5 text-base leading-7 text-ink`,
            children: [`“`, shown.quote, `”`],
          }),
          (0, w.jsxs)(`footer`, {
            className: `vortx-testimonial-author mt-auto flex items-center gap-3 pt-4`,
            children: [
              (0, w.jsx)(`span`, {
                className: `vortx-testimonial-avatar data-font flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/40 text-xs font-semibold text-terminal-blue`,
                "aria-hidden": `true`,
                children: testimonialInitials(shown.name),
              }),
              (0, w.jsxs)(`div`, {
                className: `vortx-testimonial-author-text min-w-0`,
                children: [
                  (0, w.jsx)(`p`, {
                    className: `vortx-testimonial-name text-sm font-semibold leading-snug text-ink`,
                    children: shown.name,
                  }),
                  (0, w.jsxs)(`p`, {
                    className: `vortx-testimonial-role mt-1 text-xs leading-5 text-muted`,
                    children: [shown.title, ` · `, shown.company],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
function testimonialsBlock({ eyebrow: e = `From customers`, className: t = `` } = {}) {
  return (0, w.jsxs)(`section`, {
    className: [`vortx-quote-river`, t].filter(Boolean).join(` `),
    "aria-label": e,
    children: [
      (0, w.jsx)(`p`, { className: `vortx-quote-river__kicker`, children: e }),
      (0, w.jsx)(floatingTestimonials, {}),
    ],
  });
}
function rotateQuoteLane(items, offset) {
  let n = items.length;
  if (!n) return [];
  let start = ((offset % n) + n) % n,
    rotated = items.slice(start).concat(items.slice(0, start));
  return offset % 2 ? rotated.slice().reverse() : rotated;
}
function floatingTestimonials() {
  let chips = CUSTOMER_TESTIMONIALS,
    lane = rotateQuoteLane(chips, 0);
  return (0, w.jsx)(`div`, {
    className: `vortx-quote-lanes`,
    "aria-hidden": `true`,
    children: (0, w.jsx)(`div`, {
      className: `vortx-quote-lane`,
      style: {
        [`--quote-ms`]: `42s`,
        [`--quote-delay`]: `0s`,
      },
      children: (0, w.jsx)(`div`, {
        className: `vortx-quote-lane__track`,
        children: [`a`, `b`].flatMap((copy) =>
          lane.map((item, itemIdx) =>
            (0, w.jsxs)(
              `article`,
              {
                className: `vortx-quote-chip`,
                "data-copy": copy,
                children: [
                  (0, w.jsx)(`p`, {
                    className: `vortx-quote-chip__text`,
                    children: item.quote,
                  }),
                  (0, w.jsxs)(`p`, {
                    className: `vortx-quote-chip__who`,
                    children: [
                      item.segment ? `${item.segment} · ` : ``,
                      item.name,
                      ` · `,
                      item.title,
                    ],
                  }),
                ],
              },
              `${copy}-${item.name}-${itemIdx}`,
            ),
          ),
        ),
      }),
    }),
  });
}
function formatTradeAmount(amount) {
  let n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1e9) return `$${Math.round(n / 1e9)}B`;
  if (n >= 1e6) return `$${Math.round(n / 1e6)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}
function tradingProofFomoLine(card, { amountLabel, filingDate, locked } = {}) {
  let date = filingDate || `recently`,
    target = card.ticker || card.issuer || `a public issuer`,
    amountBit = amountLabel ? ` ${amountLabel} of` : ``,
    who = locked || !card.filerName ? null : card.filerName;
  if (who) {
    return `${who} ${card.actionVerb}${amountBit} ${target} · filed ${date}`;
  }
  let role =
    card.type === `congress_trade`
      ? `A member of Congress`
      : card.type === `form_4`
        ? `An insider`
        : card.type === `institutional_13f`
          ? `A fund`
          : `A filer`;
  return `${role} ${card.actionVerb}${amountBit} ${target} · filed ${date}. Name hidden until you subscribe`;
}
function tradingProofExamples(events = []) {
  let order = [`congress_trade`, `form_4`, `institutional_13f`],
    pool = events || [],
    out = [],
    used = new Set();
  for (let type of order) {
    let row = pool.find(
      (e) => !used.has(e.id) && String(e.event_type || ``) === type,
    );
    if (!row) {
      row = pool.find(
        (e) =>
          !used.has(e.id) &&
          order.includes(String(e.event_type || ``)),
      );
    }
    if (!row) continue;
    used.add(row.id);
    let card = parseTradingCardFields(row),
      amountLabel = card.amountLabel || formatTradeAmount(row.amount),
      locked = card.filerLocked;
    out.push({
      key: row.id || `${card.type}-${out.length}`,
      who: locked ? `Name hidden` : card.filerName || `Filer`,
      action: card.actionVerb,
      issuer: card.issuer || `Issuer on filing`,
      ticker: card.ticker,
      meta: card.sourceMeta,
      locked,
      amountLabel,
      fomo: tradingProofFomoLine(card, {
        amountLabel,
        filingDate: row.filing_date,
        locked,
      }),
    });
    if (out.length >= 3) break;
  }
  while (out.length < 3) {
    let samples = [
      {
        key: `ex-congress`,
        who: `Name hidden`,
        action: `bought shares`,
        issuer: `a public issuer`,
        ticker: null,
        meta: `STOCK Act · Congress · filed recently`,
        locked: !0,
        amountLabel: null,
        fomo: `A member of Congress bought shares of a public issuer · filed recently. Name hidden until you subscribe`,
      },
      {
        key: `ex-form4`,
        who: `Name hidden`,
        action: `sold shares`,
        issuer: `a public issuer`,
        ticker: null,
        meta: `Form 4 · SEC EDGAR · filed recently`,
        locked: !0,
        amountLabel: null,
        fomo: `An insider sold shares of a public issuer · filed recently. Name hidden until you subscribe`,
      },
      {
        key: `ex-13f`,
        who: `Name hidden`,
        action: `reported holdings`,
        issuer: `Manager on record`,
        ticker: null,
        meta: `13F · SEC EDGAR · filed recently`,
        locked: !0,
        amountLabel: null,
        fomo: `A fund reported holdings · filed recently. Name hidden until you subscribe`,
      },
    ];
    out.push(samples[out.length]);
  }
  return out;
}
function ke({ events: events = [] } = {}) {
  let examples = tradingProofExamples(events);
  return (0, w.jsxs)(`section`, {
    className: `vortx-stats-section mx-auto max-w-6xl px-6 py-6`,
    children: [
      (0, w.jsx)(`p`, { className: `eyebrow`, children: `From the public record` }),
      (0, w.jsx)(`h2`, {
        className: `display-font mt-3 max-w-3xl text-4xl text-ink`,
        children: `Who bought or sold, and when`,
      }),
      (0, w.jsx)(`p`, {
        className: `mt-3 max-w-2xl text-sm leading-6 text-muted`,
        children: renderJargonText(`The line that matters: who bought or sold, which company, and when. Names show after you subscribe.`),
      }),
      (0, w.jsxs)(`div`, {
        className: `mt-5 flex flex-wrap items-center gap-3`,
        children: [
          (0, w.jsx)(`span`, {
            className: `data-font rounded-full border border-terminal-green/30 bg-terminal-green/10 px-4 py-2 text-sm text-terminal-green`,
            children: `Updated as trades clear`,
          }),
          (0, w.jsx)(`span`, {
            className: `data-font rounded-full border border-terminal-blue/30 bg-terminal-blue/10 px-4 py-2 text-sm text-terminal-blue`,
            children: renderJargonText(`Names show after you subscribe`),
          }),
          (0, w.jsx)(`span`, {
            className: `data-font rounded-full border border-metallic bg-black/40 px-4 py-2 text-sm text-muted`,
            children: `Alerts on watched names`,
          }),
        ],
      }),
      (0, w.jsx)(`div`, {
        className: `mt-6 grid gap-3 md:grid-cols-3`,
        children: examples.map((row) =>
          (0, w.jsxs)(
            `article`,
            {
              className: `glass-panel rounded-2xl p-4`,
              children: [
                (0, w.jsx)(`p`, {
                  className: `text-sm font-semibold leading-6 text-ink`,
                  children: row.fomo,
                }),
                (0, w.jsxs)(`p`, {
                  className: `mt-2 text-xs leading-5 text-muted`,
                  children: [
                    row.locked
                      ? (0, w.jsx)(`span`, {
                          className: `vortx-trade-locked-chip`,
                          children: `Name hidden`,
                        })
                      : null,
                    row.locked ? ` ` : null,
                    renderJargonText(row.meta),
                    row.amountLabel
                      ? (0, w.jsxs)(`span`, {
                          className: `text-terminal-green`,
                          children: [` · `, row.amountLabel],
                        })
                      : null,
                  ],
                }),
              ],
            },
            row.key,
          ),
        ),
      }),
      (0, w.jsx)(`div`, {
        className: `mt-5 flex flex-wrap gap-2`,
        children: te.map((e) =>
          (0, w.jsx)(
            `span`,
            {
              className: `data-font rounded-full border border-metallic bg-black/40 px-3 py-1 text-xs text-muted`,
              children: e.replace(/\s*\/\s*daily.*/i, ``).trim(),
            },
            e,
          ),
        ),
      }),
    ],
  });
}
function beforeAfterStrip({ embedded: e = !1 } = {}) {
  let t = e ? `vortx-section-air mt-6` : `mx-auto max-w-6xl px-6 pt-2 pb-6`,
    n = e ? `mt-3 grid gap-3 md:grid-cols-3` : `mt-4 grid gap-4 md:grid-cols-3`,
    r = e ? `vortx-panel-mist glass-panel rounded-2xl p-4` : `vortx-panel-mist glass-panel rounded-2xl p-5`,
    i = e ? `text-xs leading-6` : `text-sm leading-6`;
  return (0, w.jsxs)(e ? `div` : `section`, {
    className: t,
    children: [
      (0, w.jsx)(`p`, { className: `eyebrow`, children: `Before / After` }),
      (0, w.jsx)(`div`, {
        className: n,
        children: BEFORE_AFTER.map((e) =>
          (0, w.jsxs)(
            `article`,
            {
              className: r,
              children: [
                (0, w.jsxs)(`p`, {
                  className: `${i} text-muted`,
                  children: [
                    (0, w.jsx)(`span`, {
                      className: `text-soft`,
                      children: `Before: `,
                    }),
                    e.before,
                  ],
                }),
                (0, w.jsxs)(`p`, {
                  className: `mt-3 ${i} text-ink`,
                  children: [
                    (0, w.jsx)(`span`, {
                      className: `text-terminal-green`,
                      children: `After: `,
                    }),
                    e.after,
                  ],
                }),
              ],
            },
            e.before,
          ),
        ),
      }),
    ],
  });
}
function mapCallingCard({ onOpenMap } = {}) {
  return (0, w.jsxs)(`div`, {
    className: `vortx-map-inline mt-5 flex flex-wrap items-center gap-3`,
    "aria-label": `Open the Vortx globe`,
    children: [
      (0, w.jsx)(`p`, {
        className: `text-sm text-muted`,
        children: `See where today's public trades landed, while they are still on the record.`,
      }),
      (0, w.jsx)(`button`, {
        type: `button`,
        className: `vortx-text-link`,
        onClick: () => onOpenMap?.(),
        children: `Open the globe`,
      }),
    ],
  });
}
function isUsableGuestTrade(row) {
  let card = parseTradingCardFields(row);
  if (card.holdingsReport) return false;
  if (!sanitizeTapeQuery(card.ticker)) return false;
  if (card.side !== `buy` && card.side !== `sell`) return false;
  return card.type === `form_4` || card.type === `congress_trade`;
}
function guestTradeCard({
  row,
  card,
  onOpenPricing,
  onOpenWhale,
  onToggleWatch,
  starred = !1,
  flash = !1,
}) {
  let locked = Boolean(card.filerLocked),
    entityId = row.entity_id,
    who = locked
      ? `Name shows after you subscribe`
      : formatFilerDisplayName(card.filerName, card.type) || `Filer`;
  return (0, w.jsxs)(`article`, {
    className: locked
      ? `vortx-use-card vortx-use-card--locked`
      : `vortx-use-card`,
    children: [
      (0, w.jsxs)(`div`, {
        className: `vortx-use-card__top`,
        children: [
          (0, w.jsx)(`p`, {
            className: `vortx-use-card__ticker`,
            children: sanitizeTapeQuery(card.ticker) || card.ticker,
          }),
          (0, w.jsx)(`span`, {
            className: tradingActionClass(card.side),
            children: card.actionLabel || (card.side === `buy` ? `BOUGHT` : `SOLD`),
          }),
          card.amountLabel
            ? (0, w.jsx)(`span`, {
                className: `vortx-use-card__amt`,
                children: card.amountLabel,
              })
            : null,
        ],
      }),
      card.showCompany && card.issuer
        ? (0, w.jsx)(`p`, {
            className: `vortx-use-card__issuer`,
            children: card.issuer,
          })
        : null,
      (0, w.jsx)(`p`, {
        className: locked ? `vortx-use-card__who vortx-use-card__who--locked` : `vortx-use-card__who`,
        children: who,
      }),
      (0, w.jsxs)(`div`, {
        className: `vortx-use-card__actions`,
        children: [
          locked
            ? (0, w.jsx)(`button`, {
                type: `button`,
                className: `vortx-use-card__cta`,
                onClick: () => openNebulaPricing(onOpenPricing, `guest_card`),
                children: `See who filed`,
              })
            : entityId && onOpenWhale
              ? (0, w.jsx)(`button`, {
                  type: `button`,
                  className: `vortx-use-card__cta`,
                  onClick: () => onOpenWhale(entityId),
                  children: `Their trades`,
                })
              : null,
          entityId && onToggleWatch
            ? (0, w.jsx)(`button`, {
                type: `button`,
                className: starred
                  ? `vortx-desk-watch-btn vortx-desk-watch-btn--on`
                  : `vortx-desk-watch-btn`,
                onClick: () => void onToggleWatch(entityId),
                children: flash ? `Watching ✓` : starred ? `Watching` : `Watch`,
              })
            : null,
        ],
      }),
    ],
  });
}
function homeTickerProduct({
  events = [],
  onOpenPricing,
  onToggleWatch,
  starIds = [],
  watchFlashId = ``,
  feedLoading = !1,
}) {
  let [draft, setDraft] = (0, l.useState)(() => readTapeQueryFromLocation() || ``),
    [query, setQuery] = (0, l.useState)(() => sanitizeTapeQuery(readTapeQueryFromLocation() || ``)),
    [whaleId, openWhale, closeWhale] = useWhaleWho(),
    starSet = (0, l.useMemo)(() => new Set(starIds || []), [starIds]),
    usable = (0, l.useMemo)(() => {
      let out = [];
      for (let row of events || []) {
        if (!isUsableGuestTrade(row)) continue;
        let card = parseTradingCardFields(row);
        out.push({ row, card, amount: eventTradeAmount(row) });
      }
      return out;
    }, [events]),
    hotTickers = (0, l.useMemo)(() => {
      let counts = new Map();
      for (let item of usable) {
        let t = sanitizeTapeQuery(item.card.ticker);
        if (!t) continue;
        counts.set(t, (counts.get(t) || 0) + 1);
      }
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([ticker]) => ticker);
    }, [usable]),
    hits = (0, l.useMemo)(() => {
      let q = sanitizeTapeQuery(query).toLowerCase(),
        pool = usable;
      if (q) {
        pool = usable.filter(({ row, card }) => {
          let blob = [
            card.ticker,
            card.issuer,
            card.filerName,
            row.title,
            row.entity_name,
          ]
            .filter(Boolean)
            .join(` `)
            .toLowerCase();
          return blob.includes(q);
        });
      }
      return pool
        .slice()
        .sort((a, b) => {
          if (Boolean(a.card.filerLocked) !== Boolean(b.card.filerLocked))
            return a.card.filerLocked ? 1 : -1;
          return (b.amount || 0) - (a.amount || 0);
        })
        .slice(0, q ? 12 : 8);
    }, [usable, query]);
  function runCheck(nextRaw) {
    let next = sanitizeTapeQuery(nextRaw == null ? draft : nextRaw);
    setDraft(next);
    setQuery(next);
    try {
      let url = new URL(window.location.href);
      if (next) url.searchParams.set(`q`, next);
      else url.searchParams.delete(`q`);
      window.history.replaceState({}, ``, `${url.pathname}${url.search}${url.hash}`);
    } catch {}
  }
  return (0, w.jsxs)(`section`, {
    className: `vortx-check`,
    id: `todays-trades`,
    children: [
      (0, w.jsx)(`h3`, {
        className: `vortx-check__title display-font`,
        children: query
          ? `Results for ${sanitizeTapeQuery(query).toUpperCase()}`
          : `Check a ticker`,
      }),
      (0, w.jsx)(`p`, {
        className: `vortx-check__lead`,
        children: query
          ? `Buy or sell filings in this list. Names that are open stay open. The rest unlock when you subscribe.`
          : `Type a symbol you already trade. See if Congress or insiders already bought or sold it.`,
      }),
      (0, w.jsxs)(`form`, {
        className: `vortx-check__form`,
        onSubmit: (ev) => {
          ev.preventDefault();
          runCheck();
        },
        children: [
          (0, w.jsx)(`label`, {
            className: `vortx-check__label`,
            htmlFor: `ticker-check`,
            children: `Ticker or name`,
          }),
          (0, w.jsx)(`input`, {
            id: `ticker-check`,
            className: `vortx-check__input`,
            type: `search`,
            inputMode: `search`,
            autoComplete: `off`,
            spellCheck: `false`,
            maxLength: 32,
            placeholder: `NVDA, TSLA, or a last name`,
            value: draft,
            onChange: (ev) => setDraft(sanitizeTapeQuery(ev.target.value)),
          }),
          (0, w.jsx)(`button`, {
            type: `submit`,
            className: `vortx-cta-solid`,
            children: `Check`,
          }),
        ],
      }),
      hotTickers.length
        ? (0, w.jsx)(`div`, {
            className: `vortx-check__hot`,
            children: hotTickers.map((ticker) =>
              (0, w.jsx)(
                `button`,
                {
                  type: `button`,
                  className: `vortx-check__chip`,
                  onClick: () => runCheck(ticker),
                  children: ticker,
                },
                ticker,
              ),
            ),
          })
        : null,
      feedLoading
        ? (0, w.jsx)(`p`, {
            className: `vortx-check__empty`,
            children: `Loading filings`,
          })
        : hits.length
          ? (0, w.jsx)(`div`, {
              className: `vortx-check__grid`,
              children: hits.map(({ row, card }) =>
                (0, w.jsx)(
                  guestTradeCard,
                  {
                    row,
                    card,
                    onOpenPricing,
                    onOpenWhale: openWhale,
                    onToggleWatch,
                    starred: row.entity_id ? starSet.has(row.entity_id) : !1,
                    flash: row.entity_id && watchFlashId === row.entity_id,
                  },
                  row.id || `${card.ticker}-${card.filingDate}`,
                ),
              ),
            })
          : (0, w.jsx)(`p`, {
              className: `vortx-check__empty`,
              children: query
                ? `No Congress or insider buy or sell for ${sanitizeTapeQuery(query).toUpperCase()} in this list yet.`
                : `No buy or sell filings with a ticker in this list yet.`,
            }),
      (0, w.jsx)(`p`, {
        className: `vortx-check__legal`,
        children: `Public filings only. Not a broker and not a buy or sell call.`,
      }),
      (0, w.jsx)(`a`, {
        className: `vortx-check__more`,
        href: `/?view=browse`,
        children: `See every filing`,
      }),
      whaleId
        ? (0, w.jsx)(whaleWatchPanel, {
            entityId: whaleId,
            events,
            onClose: closeWhale,
            onOpenPricing,
            onToggleWatch,
            starred: starSet.has(whaleId),
            canWatch: Boolean(onToggleWatch),
          })
        : null,
    ],
  });
}
function homeUseSteps() {
  let steps = [
    [`1`, `Type a ticker`, `NVDA, TSLA, or a last name.`],
    [`2`, `Read the side`, `Green is a buy. Red is a sell.`],
    [`3`, `Open Their trades`, `See that person. Watch them for the next filing.`],
  ];
  return (0, w.jsxs)(`div`, {
    className: `vortx-use-steps`,
    children: [
      (0, w.jsx)(`p`, {
        className: `vortx-use-steps__lead`,
        children: `What to do`,
      }),
      (0, w.jsx)(`ol`, {
        className: `vortx-use-steps__grid`,
        children: steps.map(([num, title, copy]) =>
          (0, w.jsxs)(
            `li`,
            {
              className: `vortx-use-steps__item`,
              children: [
                (0, w.jsx)(`span`, {
                  className: `vortx-use-steps__num`,
                  children: num,
                }),
                (0, w.jsx)(`strong`, { children: title }),
                (0, w.jsx)(`span`, { children: copy }),
              ],
            },
            num,
          ),
        ),
      }),
    ],
  });
}
function traderPlaybook({ compact = !1 } = {}) {
  let jobs = [
    [
      `1 Type a ticker`,
      `Filter today's list by ticker or company. Free rows show bought or sold, plus the company and date.`,
    ],
    [
      `2 Read the side`,
      `Green is a buy. Red is a sell. That is the filing, not a tip.`,
    ],
    [
      `3 Open Their trades`,
      `See every row from that person. Watch them and Vortx emails you when they file again. Research only.`,
    ],
  ];
  return (0, w.jsxs)(`section`, {
    className: compact
      ? `vortx-trader-playbook vortx-trader-playbook--compact`
      : `vortx-trader-playbook mt-5`,
    "aria-label": `How this helps a trader`,
    children: [
      compact
        ? null
        : (0, w.jsx)(`p`, {
            className: `vortx-trader-playbook__lead`,
            children: `Vortx is not a charting app. It is a public-record list: who traded, which company, and when. Use it before you size a trade or sit through a news story.`,
          }),
      (0, w.jsx)(`div`, {
        className: `vortx-trader-playbook__grid`,
        children: jobs.map(([step, copy]) =>
          (0, w.jsxs)(
            `article`,
            {
              className: `vortx-trader-playbook__card`,
              children: [
                (0, w.jsx)(`strong`, { children: step }),
                (0, w.jsx)(`span`, { children: copy }),
              ],
            },
            step,
          ),
        ),
      }),
    ],
  });
}
function howItWorksSection({ marketing: mk } = {}) {
  let timeline = Array.isArray(mk?.how_it_works_timeline) && mk.how_it_works_timeline.length
    ? mk.how_it_works_timeline
    : P;
  return (0, w.jsxs)(`section`, {
    className: `vortx-hiw-panel mx-auto max-w-6xl px-6 py-8`,
    children: [
      (0, w.jsx)(`p`, { className: `eyebrow`, children: `How it works` }),
      (0, w.jsx)(`h2`, {
        className: `display-font mt-3 max-w-3xl text-4xl text-ink`,
        children: `Search. See the name. Get emailed next time.`,
      }),
      (0, w.jsx)(`p`, {
        className: `mt-3 max-w-3xl text-base leading-7 text-muted`,
        children:
          mk?.how_it_works_subcopy ||
          `They already filed. One feed for lawmakers, insiders, and funds. After you subscribe, names show. Watch someone and we email you when they file again.`,
      }),
      (0, w.jsx)(`div`, {
        className: `mt-5 space-y-2`,
        children: timeline.slice(0, 3).map(([e, t]) =>
          (0, w.jsxs)(
            `div`,
            {
              className: `grid gap-2 border-l border-terminal-blue/30 pl-3 sm:grid-cols-[120px_1fr]`,
              children: [
                (0, w.jsx)(`p`, {
                  className: `data-font text-xs text-terminal-blue`,
                  children: e,
                }),
                (0, w.jsx)(`p`, {
                  className: `text-xs leading-5 text-muted`,
                  children: renderJargonText(t),
                }),
              ],
            },
            `${e}-${t}`,
          ),
        ),
      }),
      (0, w.jsx)(`div`, {
        className: `mt-8 grid gap-4 md:grid-cols-3`,
        children: [
          [
            `See`,
            [
              `Congress, `,
              tipSpan(`Form 4`),
              `, and `,
              tipSpan(`13F`),
              ` rows show buy, sell, or holdings with the issuer as soon as the filing is public.`,
            ],
          ],
          [
            `Unlock`,
            `A Vortx plan shows the person's name and a link to the original filing, so you are not guessing from a blurred name.`,
          ],
          [
            `Watch`,
            `Watch a politician, insider, or fund. We email you when they file again.`,
          ],
        ].map(([e, t]) =>
          (0, w.jsxs)(
            `article`,
            {
              className: `glass-panel rounded-2xl p-5`,
              children: [
                (0, w.jsx)(`p`, { className: `eyebrow`, children: e }),
                (0, w.jsx)(`p`, {
                  className: `mt-3 text-sm leading-6 text-muted`,
                  children: t,
                }),
              ],
            },
            e,
          ),
        ),
      }),
      (0, w.jsx)(`p`, {
        className: `mt-8 text-sm`,
        children: (0, w.jsx)(`a`, {
          href: `/?view=pricing&plan=nebula`,
          className: `font-semibold text-terminal-blue underline-offset-4 hover:underline`,
          children: primaryUnlockCta(),
        }),
      }),
    ],
  });
}
function useCaseSlot({ item: e, segmentHooks: segmentHooks }) {
  let [shown, setShown] = (0, l.useState)(e),
    [opaque, setOpaque] = (0, l.useState)(!0);
  (0, l.useEffect)(() => {
    if (e.title === shown.title && e.relief === shown.relief) return;
    setOpaque(!1);
    let n = setTimeout(() => {
      (setShown(e), setOpaque(!0));
    }, 280);
    return () => clearTimeout(n);
  }, [e, shown.title, shown.relief]);
  return (0, w.jsxs)(`article`, {
    className: `vortx-usecase-card glass-panel rounded-2xl p-6`,
    children: [
      (0, w.jsxs)(`div`, {
        className: `vortx-usecase-card__top flex items-start justify-between gap-4`,
        children: [
          (0, w.jsx)(`span`, {
            className: `vortx-usecase-card__badge data-font rounded-lg border border-terminal-blue/35 bg-terminal-blue/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-accent`,
            children: shown.title,
          }),
          (0, w.jsx)(`span`, {
            className: `data-font shrink-0 text-right text-xs text-soft`,
            children: shown.reach,
          }),
        ],
      }),
      (0, w.jsxs)(`div`, {
        className: `vortx-usecase-card__body mt-5 transition-opacity duration-200 ease-out ${opaque ? `opacity-100` : `opacity-0`}`,
        "aria-live": `polite`,
        children: [
          (0, w.jsx)(`h3`, {
            className: `display-font text-xl leading-8 text-ink`,
            children: shown.relief,
          }),
          (0, w.jsx)(`p`, {
            className: `mt-3 text-sm leading-6 text-muted`,
            children: useCaseCopy(shown, segmentHooks),
          }),
        ],
      }),
    ],
  });
}
function rotatingUseCases({ segmentHooks: segmentHooks } = {}) {
  let t = TEAM_USE_CASES.length,
    [n, r] = (0, l.useState)(0);
  (0, l.useEffect)(() => {
    if (t < 2) return;
    let e = setInterval(() => r((e) => (e + 1) % t), 3200);
    return () => clearInterval(e);
  }, [t]);
  return (0, w.jsx)(`div`, {
    className: `mt-4 max-w-3xl`,
    children: (0, w.jsx)(useCaseSlot, { item: TEAM_USE_CASES[n], segmentHooks: segmentHooks }),
  });
}
function ie({ marketing: mk } = {}) {
  return (0, w.jsxs)(`section`, {
    className: `vortx-usecase-section mx-auto max-w-6xl px-6 py-8`,
    children: [
      (0, w.jsx)(`p`, { className: `eyebrow`, children: `Vortx for your team` }),
      (0, w.jsx)(`h2`, {
        className: `display-font mt-3 max-w-3xl text-3xl text-ink`,
        children: `Use cases beyond the ticker watchlist`,
      }),
      (0, w.jsx)(`p`, {
        className: `mt-2 max-w-2xl text-sm leading-6 text-muted`,
        children: `Investors get the hero workflow above. These teams use the same public-record feed for vendor risk, journalism, HR, and ops.`,
      }),
      (0, w.jsx)(rotatingUseCases, { segmentHooks: mk?.segment_hooks }),
    ],
  });
}
function demoUnlockedSignalCard({ onOpenPricing: onOpenPricing, featured: featured, timeline: timeline }) {
  let i = featured || N,
    a = timeline || P;
  return (0, w.jsxs)(`div`, {
    className: `vortx-demo-showcase glass-panel mt-6 max-w-2xl rounded-2xl border border-terminal-green/30 p-5`,
    children: [
      (0, w.jsx)(`p`, {
        className: `eyebrow text-terminal-green`,
        children: `Unlocked example · what monitoring delivers`,
      }),
      (0, w.jsx)(`h3`, {
        className: `display-font mt-3 line-clamp-2 text-2xl text-ink`,
        children: featuredShortTitle(i),
      }),
      (0, w.jsxs)(`div`, {
        className: `mt-4 grid gap-3 sm:grid-cols-2`,
        children: [
          (0, w.jsxs)(`div`, {
            className: `rounded-xl border border-metallic bg-black/35 p-3`,
            children: [
              (0, w.jsx)(`p`, {
                className: `data-font text-xs text-soft`,
                children: `source`,
              }),
              (0, w.jsx)(`p`, {
                className: `mt-1 text-sm text-ink`,
                children: i.source,
              }),
              i.sourceUrl
                ? (0, w.jsx)(`a`, {
                    href: i.sourceUrl,
                target: `_blank`,
                rel: `noreferrer`,
                className: `mt-2 inline-block text-xs text-terminal-blue underline underline-offset-4`,
                    children: `View public source document →`,
                  })
                : null,
            ],
          }),
          (0, w.jsxs)(`div`, {
            className: `rounded-xl border border-metallic bg-black/35 p-3`,
            children: [
              (0, w.jsx)(`p`, {
                className: `data-font text-xs text-soft`,
                children: `filing date · score`,
              }),
              (0, w.jsxs)(`p`, {
                className: `data-font mt-1 text-sm text-terminal-blue`,
                children: [
                  i.filingDate,
                  ` · `,
                  (0, w.jsxs)(`span`, {
                    className: `vortx-accent-amber`,
                    children: [i.score, `/100`],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      (0, w.jsx)(`p`, {
        className: `vortx-divider-block mt-4 text-sm leading-6 text-muted`,
        children: i.signal,
      }),
      (0, w.jsxs)(`p`, {
        className: `data-font mt-3 text-xs text-soft`,
        children: [`Recommended action: `, i.action],
      }),
      (0, w.jsx)(`div`, {
        className: `vortx-divider-block mt-4 space-y-2`,
        children: a.slice(0, 3).map(([e, t]) =>
          (0, w.jsxs)(
            `div`,
            {
              className: `grid gap-2 border-l border-terminal-blue/30 pl-3 sm:grid-cols-[88px_1fr]`,
              children: [
                (0, w.jsx)(`p`, {
                  className: `data-font text-xs text-terminal-blue`,
                  children: e,
                }),
                (0, w.jsx)(`p`, {
                  className: `vortx-log-entry text-xs leading-5 text-muted`,
                  children: t,
                }),
              ],
            },
            `${e}-${t}`,
          ),
        ),
      }),
      (0, w.jsx)(`p`, {
        className: `vortx-divider-block mt-4 text-xs leading-5 text-soft`,
        children: `A Vortx plan unlocks who traded on the live feed. API plans add source URLs and CSV export.`,
      }),
      onOpenPricing
        ? (0, w.jsx)(`button`, {
            type: `button`,
            onClick: onOpenPricing,
            className: `mt-4 text-sm font-semibold text-terminal-blue underline underline-offset-4`,
            children: `Compare plans →`,
          })
        : null,
    ],
  });
}
function customerDeskTeaser({
  onOpenPricing: onOpenPricing,
  onOpenScan: onOpenScan,
  featured: featured,
  deskLocked: deskLocked,
}) {
  let i = featured || N,
    locked = deskLocked || {
      title: `Name hidden on a trade row`,
      copy: `The person's name shows after you subscribe. Buy/sell, company, and date stay free.`,
    };
  return (0, w.jsxs)(`section`, {
    id: `desk-teaser`,
    className: `mx-auto max-w-6xl px-6 py-10`,
    children: [
      (0, w.jsx)(`p`, { className: `eyebrow`, children: `Your trading desk` }),
      (0, w.jsx)(`h2`, {
        className: `display-font mt-3 max-w-3xl text-4xl text-ink`,
        children: `Three jobs. One screen.`,
      }),
      (0, w.jsx)(`p`, {
        className: `mt-3 max-w-2xl text-sm leading-6 text-muted`,
        children: `See the names behind today's trades, watch the people you care about, and open the original filing when your plan includes it.`,
      }),
      (0, w.jsxs)(`div`, {
        className: `mt-6 grid gap-3 md:grid-cols-3`,
        children: [
          (0, w.jsxs)(`article`, {
            className: `glass-panel rounded-2xl p-4`,
            children: [
              (0, w.jsx)(`p`, { className: `eyebrow text-soft`, children: `1 · Live pulse` }),
              (0, w.jsx)(`p`, {
                className: `mt-2 text-sm font-semibold text-ink`,
                children: `Congress, Form 4, and 13F in one feed`,
              }),
              (0, w.jsx)(`p`, {
                className: `mt-1 text-xs leading-5 text-muted`,
                children: `Sorted by filing date so today's moves rise first.`,
              }),
            ],
          }),
          (0, w.jsxs)(`article`, {
            className: `glass-panel rounded-2xl p-4`,
            children: [
              (0, w.jsx)(`p`, { className: `eyebrow text-soft`, children: `2 · Watchlists` }),
              (0, w.jsx)(`p`, {
                className: `mt-2 text-sm font-semibold text-ink`,
                children: `Track people, issuers, and funds`,
              }),
              (0, w.jsx)(`p`, {
                className: `mt-1 text-xs leading-5 text-muted`,
                children: `We email you when someone you watch files again.`,
              }),
            ],
          }),
          (0, w.jsxs)(`article`, {
            className: `glass-panel rounded-2xl p-4`,
            children: [
              (0, w.jsx)(`p`, { className: `eyebrow text-soft`, children: `3 · Source proof` }),
              (0, w.jsx)(`p`, {
                className: `mt-2 text-sm font-semibold text-ink`,
                children: `Open the filing URL`,
              }),
              (0, w.jsx)(`p`, {
                className: `mt-1 text-xs leading-5 text-muted`,
                children: `API plans unlock document links and CSV export for research workflows.`,
              }),
            ],
          }),
        ],
      }),
      (0, w.jsxs)(`div`, {
        className: `vortx-desk-teaser glass-panel mt-6 rounded-3xl p-5`,
        children: [
          (0, w.jsxs)(`article`, {
            className: `vortx-desk-teaser__row rounded-2xl border border-terminal-green/35 bg-black/35 p-4`,
            children: [
              (0, w.jsx)(`p`, {
                className: `data-font text-xs text-terminal-green`,
                children: `Unlocked row · example`,
              }),
              (0, w.jsx)(`p`, {
                className: `data-font mt-2 line-clamp-2 text-xs text-terminal-blue`,
                children: featuredShortTitle(i),
              }),
              (0, w.jsx)(`p`, {
                className: `mt-1 text-sm font-medium text-ink`,
                children: U({ event_type: i.event_type || `form_4` }),
              }),
              (0, w.jsx)(`p`, {
                className: `mt-1 text-sm leading-6 text-muted`,
                children: i.signal,
              }),
              (0, w.jsxs)(`div`, {
                className: `mt-3 flex flex-wrap gap-2 text-xs`,
                children: [
                  (0, w.jsx)(`span`, {
                    className: `rounded-full border border-rose-300/40 px-2.5 py-1 text-rose-100`,
                    children: i.urgency,
                  }),
                  (0, w.jsx)(`span`, {
                    className: `rounded-full border border-line px-2.5 py-1 text-soft`,
                    children: i.filingDate,
                  }),
                  i.sourceUrl
                    ? (0, w.jsx)(`a`, {
                        href: i.sourceUrl,
                        target: `_blank`,
                        rel: `noreferrer`,
                        className: `rounded-full border border-terminal-blue/40 px-2.5 py-1 text-terminal-blue underline-offset-2 hover:underline`,
                        children: `Source document`,
                      })
                    : null,
                ],
              }),
              (0, w.jsxs)(`p`, {
                className: `data-font mt-3 text-xs text-soft`,
                children: [`Next step: `, i.action],
              }),
            ],
          }),
          (0, w.jsxs)(`article`, {
            className: `vortx-desk-teaser__row vortx-desk-teaser__row--blurred mt-3 rounded-2xl border border-metallic bg-black/35 p-4`,
            children: [
              (0, w.jsx)(`p`, {
                className: `text-sm font-medium text-ink`,
                children: locked.title,
              }),
              (0, w.jsx)(`p`, {
                className: `mt-1 text-sm text-muted`,
                children: locked.copy,
              }),
            ],
          }),
          (0, w.jsxs)(`div`, {
            className: `mt-5 flex flex-wrap gap-3`,
            children: [
              onOpenPricing
                ? (0, w.jsx)(`button`, {
                    type: `button`,
                    onClick: onOpenPricing,
                    className: `terminal-button-solid rounded-xl px-5 py-3 text-sm font-semibold`,
                    children: `Unlock My Desk · Vortx`,
                  })
                : null,
              onOpenScan
                ? (0, w.jsx)(`button`, {
                    type: `button`,
                    onClick: onOpenScan,
                    className: `rounded-xl border border-metallic px-5 py-3 text-sm font-semibold text-muted transition hover:text-ink`,
                    children: `Scan companies free`,
                  })
                : null,
            ],
          }),
        ],
      }),
    ],
  });
}

function scoutSentinelUpgradePanel({ plan: plan }) {
  if (plan !== `scout` && plan !== `sentinel`) return null;
  let e = F[plan];
  return (0, w.jsxs)(`div`, {
    className: `glass-panel mt-5 rounded-2xl border border-terminal-blue/35 p-5`,
    children: [
      (0, w.jsx)(`p`, {
        className: `eyebrow text-terminal-blue`,
        children: `${e?.name || plan} · names stay hidden`,
      }),
      (0, w.jsx)(`h3`, {
        className: `display-font mt-2 text-2xl text-ink`,
        children: `Upgrade so the next filing has a name`,
      }),
      (0, w.jsx)(`p`, {
        className: `mt-2 text-sm leading-6 text-muted`,
        children: renderJargonText(
          `On ${e?.name || plan} you still see buy/sell and company. The next filing will not wait. Names show after you subscribe, and watch emails still fire for people you save.`,
        ),
      }),
      (0, w.jsx)(`a`, {
        href: `/?view=pricing&plan=nebula`,
        className: `terminal-button-solid mt-4 inline-flex rounded-xl px-5 py-3 text-sm font-semibold`,
        children: primaryUnlockCta(),
      }),
    ],
  });
}
function consumerToolCards({ variant: variant = `hero` }) {
  return (0, w.jsx)(`div`, {
    className: `vortx-consumer-tools`,
    children: CONSUMER_TOOLS.map((tool) =>
      (0, w.jsxs)(
        `article`,
        {
          className: `vortx-consumer-tool-card glass-panel rounded-2xl border border-metallic`,
          children: [
            (0, w.jsx)(`p`, {
              className: `vortx-consumer-tool-card__eyebrow eyebrow text-soft`,
              children: variant === `pricing` ? `${tool.reportPrice} report` : tool.prompt,
            }),
            (0, w.jsx)(`h3`, {
              className: `vortx-consumer-tool-card__title display-font text-ink`,
              children: tool.title,
            }),
            (0, w.jsx)(`p`, {
              className: `vortx-consumer-tool-card__copy text-muted`,
              children: tool.description,
            }),
            variant === `pricing`
              ? (0, w.jsx)(`p`, {
                  className: `vortx-consumer-tool-card__meta data-font text-soft`,
                  children: `${tool.reportLabel}. No subscription required.`,
                })
              : null,
            (0, w.jsx)(`a`, {
              href: tool.href,
              className: `vortx-consumer-tool-card__cta terminal-button-solid text-sm font-semibold`,
              children: tool.cta,
            }),
          ],
        },
        tool.id,
      ),
    ),
  });
}
function pickUnlockDemoPair(events = []) {
  let trading = [`form_4`, `congress_trade`, `institutional_13f`],
    rows = (events || []).filter((e) => trading.includes(String(e.event_type || ``))),
    unlocked = null,
    locked = null;
  for (let row of rows) {
    let card = parseTradingCardFields(row);
    if (!unlocked && !card.filerLocked && card.filerName) unlocked = card;
    if (!locked && card.filerLocked) locked = card;
    if (unlocked && locked) break;
  }
  if (!unlocked) {
    unlocked = {
      type: `congress_trade`,
      side: `buy`,
      actionVerb: `bought shares`,
      filerName: `Rep. Example Filer`,
      filerLocked: !1,
      showCompany: !0,
      issuer: `Example issuer`,
      ticker: `EXM`,
      sourceMeta: `STOCK Act · Congress · filed recently`,
    };
  }
  if (!locked) {
    locked = {
      type: `form_4`,
      side: `sell`,
      actionVerb: `sold shares`,
      filerName: null,
      filerLocked: !0,
      showCompany: !0,
      issuer: `Public issuer`,
      ticker: null,
      sourceMeta: `Form 4 · SEC EDGAR · filed recently`,
    };
  }
  return { unlocked, locked };
}
function unlockDemoCard({ card, tone }) {
  let unlocked = tone === `unlocked`;
  return (0, w.jsxs)(`article`, {
    className: unlocked
      ? `vortx-unlock-card vortx-unlock-card--open rounded-2xl border border-terminal-green/35 bg-white p-4`
      : `vortx-unlock-card vortx-unlock-card--locked rounded-2xl border border-line bg-panel p-4`,
    children: [
      (0, w.jsx)(`p`, {
        className: `data-font text-[11px] uppercase tracking-[0.12em] ${unlocked ? `text-terminal-green` : `text-soft`}`,
        children: unlocked ? `Unlocked · what you get` : `Locked · free preview`,
      }),
      (0, w.jsx)(`div`, { className: `mt-3`, children: tradingHeadlineNodes(card, `sm`) }),
      (0, w.jsx)(`p`, {
        className: `mt-2 text-xs leading-5 text-muted`,
        children: renderJargonText(card.sourceMeta),
      }),
      unlocked
        ? (0, w.jsx)(`p`, {
            className: `mt-3 text-xs font-semibold text-ink`,
            children: `Name + buy/sell + company shown`,
          })
        : (0, w.jsx)(`p`, {
            className: `mt-3 text-xs font-semibold text-muted`,
            children: `Buy/sell and company are free. The name stays hidden.`,
          }),
    ],
  });
}
function unlockNamesPair({ events, onOpenPricing }) {
  let { unlocked, locked } = pickUnlockDemoPair(events);
  return (0, w.jsxs)(`div`, {
    className: `vortx-unlock-pair mt-8`,
    children: [
      (0, w.jsx)(`p`, {
        className: `eyebrow`,
        children: `What's free vs paid`,
      }),
      (0, w.jsx)(`p`, {
        className: `mt-2 max-w-xl text-sm leading-6 text-muted`,
        children: `Buy/sell and company stay free. A Vortx plan shows the person's name.`,
      }),
      (0, w.jsxs)(`div`, {
        className: `mt-4 grid gap-3 sm:grid-cols-2`,
        children: [
          (0, w.jsx)(unlockDemoCard, { card: unlocked, tone: `unlocked` }),
          (0, w.jsx)(unlockDemoCard, { card: locked, tone: `locked` }),
        ],
      }),
      (0, w.jsx)(`button`, {
        type: `button`,
        onClick: () =>
          onOpenPricing
            ? onOpenPricing()
            : window.location.assign(`/?view=pricing&plan=nebula`),
        className: `terminal-button-solid mt-5 rounded-xl px-5 py-3 text-sm font-semibold`,
        children: primaryUnlockCta(),
      }),
    ],
  });
}
function padHeroMini(rows, fallbacks) {
  let out = (rows || []).filter(Boolean).slice(0, 2);
  for (let i = 0; out.length < 2 && i < fallbacks.length; i++) out.push(fallbacks[i]);
  return out;
}
function congressOfficeLabel(place) {
  let chamber = String(place?.chamber || ``),
    seat = String(place?.seat || ``).trim();
  if (chamber === `Senate`) return seat ? `Senator ${seat}` : `Senator`;
  if (chamber === `House`) return seat ? `House Rep ${seat}` : `House Rep`;
  return seat || `Member`;
}
function heroPlaceLabel(raw) {
  let s = String(raw || ``)
    .replace(/^https?:\/\/\S+/i, ``)
    .replace(/\s+/g, ` `)
    .trim();
  if (!s) return ``;
  if (/^US-(House|Senate)-/i.test(s)) return ``;
  if (/jurisdiction on file|public source$/i.test(s)) return ``;
  let county = s.match(/^(.*?),\s*([A-Za-z .]+)\s+County,\s*([A-Z]{2})$/i);
  if (county) {
    let state = county[3].toUpperCase(),
      before = county[1].trim(),
      city = before.split(`,`).pop().trim(),
      bits = city.split(/\s+/),
      roadAt = bits.findIndex((p) =>
        /^(road|rd|ave|avenue|street|st|ln|lane|blvd|dr|drive|way|hwy|highway)$/i.test(p),
      );
    if (roadAt >= 0 && roadAt < bits.length - 1) city = bits.slice(roadAt + 1).join(` `);
    if (city) return `${city}, ${state}`;
    return `${county[2].trim()} County, ${state}`;
  }
  let st = s.match(/^(.*?),\s*([A-Z]{2})$/);
  if (st && st[1].trim()) return `${st[1].trim().split(`,`).pop().trim()}, ${st[2]}`;
  let country = s.match(/^(.*?),\s*([A-Za-z][A-Za-z .]{2,})$/);
  if (country && country[1].trim() && !/county$/i.test(country[2]))
    return `${country[1].trim().split(`,`).pop().trim()}, ${country[2].trim()}`;
  return s.length <= 28 ? s : ``;
}
function heroCongressMini(row) {
  let card = parseTradingCardFields(row);
  return {
    ticker: congressOfficeLabel({ chamber: card.chamber, seat: card.seat }),
    actionLabel: card.actionLabel || `DISCLOSED`,
    side: card.side,
    amountLabel: card.ticker || card.amountLabel || card.filingDate || `STOCK Act`,
  };
}
function heroGlobeMini(row) {
  let type = String(row?.event_type || ``).toLowerCase(),
    summary = String(row?.summary || ``),
    blob = `${row?.title || ``} ${summary}`,
    place = heroPlaceLabel(
      (summary.match(/Location:\s*([^.]+)/i) || [])[1] ||
        row?.jurisdiction_display ||
        row?.jurisdiction,
    );
  if (!place) return null;
  if (type === `warn_notice`) {
    let workersMatch =
        blob.match(/Reported affected employees:\s*(\d[\d,]*)/i) ||
        blob.match(/(\d[\d,]*)\s+(?:affected\s+)?(?:employees?|workers?)/i),
      n = workersMatch
        ? Number(String(workersMatch[1]).replace(/,/g, ``))
        : Number(row?.amount),
      jobs = Number.isFinite(n) && n > 0 ? `${n.toLocaleString()} jobs` : `WARN`;
    return { eventId: row?.id || ``, ticker: place, actionLabel: `WARN`, amountLabel: jobs };
  }
  let card = parseTradingCardFields(row);
  return {
    eventId: row?.id || ``,
    ticker: place,
    actionLabel: card.actionLabel || `FILED`,
    side: card.side,
    amountLabel: card.ticker || card.filingDate || `Filed`,
  };
}
function pickHeroGlobeRows(events) {
  let seen = new Set(),
    out = [],
    warn = (events || []).filter((row) => String(row.event_type || ``) === `warn_notice`),
    rest = (events || []).filter((row) => String(row.event_type || ``) !== `warn_notice`);
  for (let row of warn.concat(rest)) {
    let mini = heroGlobeMini(row);
    if (!mini?.ticker) continue;
    let key = mini.ticker.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(mini);
    if (out.length >= 2) break;
  }
  return out;
}
function homeProductStack({ events = [], onOpenMap } = {}) {
  let rows = (events || [])
    .filter((row) =>
      [`form_4`, `congress_trade`, `institutional_13f`].includes(String(row.event_type || ``)),
    )
    .slice(0, 3)
    .map((row) => parseTradingCardFields(row));
  let miniRows = rows.length
    ? rows
    : [
        { ticker: `NVDA`, actionLabel: `BOUGHT`, amountLabel: `$1M-$5M` },
        { ticker: `AAPL`, actionLabel: `SOLD`, amountLabel: `$250K` },
        { ticker: `MSFT`, actionLabel: `FILED`, amountLabel: `-` },
      ];
  let congressRows = padHeroMini(
    (events || [])
      .filter((row) => String(row.event_type || ``) === `congress_trade`)
      .slice(0, 2)
      .map(heroCongressMini),
    [
      { ticker: `House Rep`, actionLabel: `DISCLOSED`, amountLabel: `STOCK Act` },
      { ticker: `Senator`, actionLabel: `DISCLOSED`, amountLabel: `PTR` },
    ],
  );
  let globeRows = pickHeroGlobeRows(events);
  let [front, setFront] = (0, l.useState)(1),
    [dragX, setDragX] = (0, l.useState)(0),
    [dragging, setDragging] = (0, l.useState)(!1),
    [paused, setPaused] = (0, l.useState)(!1);
  let startRef = (0, l.useRef)({
    x: 0,
    y: 0,
    pointerId: null,
    captured: !1,
    moved: !1,
  });
  (0, l.useEffect)(() => {
    if (paused || dragging) return;
    if (window.matchMedia(`(prefers-reduced-motion: reduce)`).matches) return;
    let id = window.setInterval(() => setFront((n) => (n + 1) % 3), 4500);
    return () => window.clearInterval(id);
  }, [paused, dragging]);
  function slotOf(index) {
    let d = (index - front + 3) % 3;
    return d === 0 ? `front` : d === 1 ? `right` : `left`;
  }
  function step(dir) {
    setFront((n) => (n + dir + 3) % 3);
  }
  function onPointerDown(e) {
    if (e.pointerType === `mouse` && e.button !== 0) return;
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      captured: !1,
      moved: !1,
    };
    setPaused(!0);
  }
  function onPointerMove(e) {
    let start = startRef.current;
    if (start.pointerId !== e.pointerId) return;
    let dx = e.clientX - start.x,
      dy = e.clientY - start.y;
    if (!start.captured) {
      if (Math.abs(dx) < 10) return;
      if (Math.abs(dx) < Math.abs(dy)) {
        start.pointerId = null;
        return;
      }
      start.captured = !0;
      start.moved = !0;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDragging(!0);
    }
    e.preventDefault();
    setDragX(dx);
  }
  function finishPointer(e) {
    let start = startRef.current;
    if (start.pointerId == null || start.pointerId !== e.pointerId) return;
    let dx = e.clientX - start.x,
      captured = start.captured;
    start.pointerId = null;
    start.captured = !1;
    if (captured) {
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {}
    }
    setDragging(!1);
    setDragX(0);
    if (dx > 64) step(-1);
    else if (dx < -64) step(1);
    window.setTimeout(() => setPaused(!1), 2800);
  }
  function onKeyDown(e) {
    if (e.key === `ArrowLeft`) {
      e.preventDefault();
      step(-1);
      setPaused(!0);
    } else if (e.key === `ArrowRight`) {
      e.preventDefault();
      step(1);
      setPaused(!0);
    }
  }
  let cards = [
    {
      key: `congress`,
      kicker: `Congress`,
      title: `Lawmaker stock trades`,
      mini: congressRows,
    },
    {
      key: `tape`,
      kicker: `Today's trades`,
      title: `Insider buys and sells`,
      mini: miniRows.slice(0, 3),
    },
    {
      key: `globe`,
      kicker: `Globe`,
      title: `Where it landed`,
      mini: globeRows,
      globe: !0,
    },
  ];
  return (0, w.jsxs)(`div`, {
    className: `vortx-stage__stack${dragging ? ` vortx-stage__stack--dragging` : ``}`,
    style: { [`--stack-drag`]: `${dragX}px` },
    role: `region`,
    tabIndex: 0,
    "aria-roledescription": `carousel`,
    "aria-label": `Product cards. Drag or use arrow keys to switch.`,
    onPointerDown,
    onPointerMove,
    onPointerUp: finishPointer,
    onPointerCancel: finishPointer,
    onMouseEnter: () => setPaused(!0),
    onMouseLeave: () => {
      if (!dragging) setPaused(!1);
    },
    onKeyDown,
    children: [
      (0, w.jsx)(`img`, {
        className: `vortx-hero-character`,
        src: `/branding/theodore-roosevelt.webp?v=7`,
        alt: ``,
        width: 120,
        height: 120,
      }),
      ...cards.map((card, index) => {
        let slot = slotOf(index);
        return (0, w.jsxs)(
          `article`,
          {
            className: `vortx-stack-card`,
            "data-slot": slot,
            "aria-hidden": slot !== `front`,
            onClick: () => {
              if (startRef.current.moved) return;
              if (slot !== `front`) setFront(index);
            },
            children: [
              (0, w.jsx)(`p`, { className: `vortx-stack-card__kicker`, children: card.kicker }),
              (0, w.jsx)(`p`, { className: `vortx-stack-card__title`, children: card.title }),
              card.mini
                ? (0, w.jsx)(`div`, {
                    className: `vortx-stack-mini`,
                    children: card.mini.map((row, rowIdx) =>
                      (0, w.jsxs)(
                        card.globe && row.eventId ? `button` : `div`,
                        {
                          type: card.globe && row.eventId ? `button` : void 0,
                          className: `vortx-stack-mini__row${
                            card.globe && row.eventId ? ` vortx-stack-mini__row--pin` : ``
                          }`,
                          onPointerDown:
                            card.globe && row.eventId
                              ? (e) => e.stopPropagation()
                              : void 0,
                          onClick:
                            card.globe && row.eventId
                              ? (e) => {
                                  e.stopPropagation();
                                  if (slot !== `front`) {
                                    setFront(index);
                                    return;
                                  }
                                  onOpenMap?.(row.eventId);
                                }
                              : void 0,
                          "aria-label":
                            card.globe && row.eventId
                              ? `Open map at ${row.ticker}`
                              : void 0,
                          children: [
                            (0, w.jsx)(`span`, { children: row.ticker || `-` }),
                            (0, w.jsx)(`span`, {
                              className: tradingActionClass(
                                row.side || sideFromActionLabel(row.actionLabel),
                              ),
                              children: row.actionLabel || `Filed`,
                            }),
                            (0, w.jsx)(`span`, { children: row.amountLabel || `-` }),
                          ],
                        },
                        row.eventId || row.ticker || rowIdx,
                      ),
                    ),
                  })
                : (0, w.jsx)(`p`, { className: `vortx-stack-card__meta`, children: card.meta }),
              card.globe && onOpenMap
                ? (0, w.jsx)(`button`, {
                    type: `button`,
                    className: `vortx-text-link mt-2`,
                    onPointerDown: (e) => e.stopPropagation(),
                    onClick: (e) => {
                      e.stopPropagation();
                      if (slot !== `front`) {
                        setFront(index);
                        return;
                      }
                      onOpenMap(card.mini?.[0]?.eventId);
                    },
                    children: `Open the globe`,
                  })
                : null,
            ],
          },
          card.key,
        );
      }),
      (0, w.jsxs)(`div`, {
        className: `vortx-stack-controls`,
        onPointerDown: (e) => e.stopPropagation(),
        children: [
          (0, w.jsx)(`p`, { className: `vortx-stack-hint`, children: `Drag to flip` }),
          (0, w.jsx)(`div`, {
            className: `vortx-stack-dots`,
            children: cards.map((card, index) =>
              (0, w.jsx)(
                `button`,
                {
                  type: `button`,
                  className: `vortx-stack-dot`,
                  "aria-label": `Show ${card.kicker}`,
                  "aria-current": front === index ? `true` : void 0,
                  onClick: () => {
                    setFront(index);
                    setPaused(!0);
                  },
                },
                card.key,
              ),
            ),
          }),
        ],
      }),
    ],
  });
}
function oe({
  events: r,
  entities: i,
  onOpenPricing: o,
  onOpenLegal: c,
  onOpenCommand: onOpenCommand,
  onOpenMap: onOpenMap,
  authToken: authToken,
  starIds: starIds,
  watchFlashId: watchFlashId,
  onToggleWatch: onToggleWatch,
  watchRefreshKey: watchRefreshKey,
  stats: stats = {},
  feedLoading: feedLoading = !1,
}) {
  let filings = stats.filings || (r || []).length,
    entities = stats.entities || (i || []).length,
    sources = stats.sources || 0;
  return (0, w.jsxs)(`section`, {
    className: `vortx-hero-section vortx-terminal-home relative z-10 pb-10`,
    children: [
      (0, w.jsxs)(`div`, {
        className: `vortx-stage`,
        children: [
          (0, w.jsxs)(`div`, {
            className: `vortx-stage__copy`,
            children: [
              (0, w.jsx)(`p`, {
                className: `eyebrow text-terminal-blue`,
                children: HERO_COPY.eyebrow,
              }),
              (0, w.jsx)(`h2`, {
                className: `vortx-stage__headline display-font`,
                children: HERO_COPY.headline,
              }),
              (0, w.jsx)(`p`, {
                className: `vortx-stage__sub`,
                children: HERO_COPY.stageSub,
              }),
              (0, w.jsxs)(`div`, {
                className: `vortx-stage__ctas`,
                children: [
                  (0, w.jsx)(`button`, {
                    type: `button`,
                    onClick: () =>
                      document.getElementById(`todays-trades`)?.scrollIntoView({
                        behavior: `smooth`,
                        block: `start`,
                      }),
                    className: `vortx-cta-solid`,
                    children: `See today's trades`,
                  }),
                  (0, w.jsx)(`button`, {
                    type: `button`,
                    onClick: () => openNebulaPricing(o, `hero`),
                    className: `vortx-cta-ghost`,
                    children: `Start trial`,
                  }),
                ],
              }),
            ],
          }),
          (0, w.jsx)(homeProductStack, { events: r, onOpenMap }),
          (0, w.jsxs)(`div`, {
            className: `vortx-stage__stats`,
            children: [
              (0, w.jsxs)(`div`, {
                children: [
                  (0, w.jsx)(AnimatedStatValue, {
                    className: `vortx-stage__stat-value data-font`,
                    value: filings || 0,
                  }),
                  (0, w.jsx)(`p`, {
                    className: `vortx-stage__stat-label`,
                    children: `trades in this list`,
                  }),
                ],
              }),
              (0, w.jsxs)(`div`, {
                children: [
                  (0, w.jsx)(AnimatedStatValue, {
                    className: `vortx-stage__stat-value data-font`,
                    value: entities || 0,
                  }),
                  (0, w.jsx)(`p`, {
                    className: `vortx-stage__stat-label`,
                    children: `people in the records`,
                  }),
                ],
              }),
              (0, w.jsxs)(`div`, {
                children: [
                  (0, w.jsx)(AnimatedStatValue, {
                    className: `vortx-stage__stat-value data-font`,
                    value: sources || 0,
                  }),
                  (0, w.jsx)(`p`, {
                    className: `vortx-stage__stat-label`,
                    children: sources ? `public sources` : `public record`,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      (0, w.jsxs)(`div`, {
        className: `vortx-live-block`,
        id: `todays-trades`,
        children: [
          homeUseSteps(),
          (0, w.jsx)(re, {
            events: r,
            entities: i,
            onOpenPricing: o,
            variant: `terminal`,
            authToken,
            starIds,
            watchFlashId,
            onToggleWatch,
            watchRefreshKey,
            feedLoading,
          }),
        ],
      }),
      (0, w.jsx)(testimonialsBlock, { eyebrow: `From customers` }),
      (0, w.jsx)(mapCallingCard, { onOpenMap }),
      (0, w.jsx)(`div`, {
        className: `vortx-page-col relative z-10 mt-4`,
        children: legalInlineNote(c),
      }),
    ],
  });
}
function Q({ sources: e, marketing: mk }) {
  let t = e.filter((e) => e.enabled),
    n = e.filter((e) => !e.enabled);
  return (0, w.jsxs)(`section`, {
    className: `mx-auto max-w-6xl px-6 py-10`,
    children: [
      (0, w.jsx)(`p`, { className: `eyebrow`, children: `Data Sources` }),
      (0, w.jsx)(`h2`, {
        className: `mt-3 text-3xl font-semibold`,
        children: `Where the signals come from`,
      }),
      (0, w.jsx)(`p`, {
        className: `mt-3 max-w-3xl text-base leading-7 text-muted`,
        children:
          mk?.sources_intro ||
          `Primary feeds: SEC EDGAR Form 4, House/Senate STOCK Act disclosures, and SEC 13F filings. WARN / layoff sources power Layoff Search ($5 per search) and remain listed below.`,
      }),
      (0, w.jsx)(`div`, {
        className: `mt-6 grid gap-3 md:grid-cols-2`,
        children: t.map((e) =>
          (0, w.jsxs)(
            `article`,
            {
              className: `glass-panel rounded-2xl p-4`,
              children: [
                (0, w.jsxs)(`div`, {
                  className: `flex items-start justify-between gap-4`,
                  children: [
                    (0, w.jsxs)(`div`, {
                      children: [
                        (0, w.jsx)(`h3`, {
                          className: `text-sm font-semibold text-ink`,
                          children: e.name,
                        }),
                        (0, w.jsxs)(`p`, {
                          className: `data-font mt-1 text-xs text-muted`,
                          children: [
                            e.jurisdiction,
                            ` / `,
                            H(e.record_type),
                            ` / `,
                            e.refresh_cadence,
                          ],
                        }),
                      ],
                    }),
                    (0, w.jsx)(`span`, {
                      className: `data-font text-xs text-terminal-green`,
                      children: `ACTIVE`,
                    }),
                  ],
                }),
                (0, w.jsx)(`p`, {
                  className: `mt-3 break-all text-xs leading-5 text-soft`,
                  children: e.source_url || `Source URL gated`,
                }),
              ],
            },
            e.slug,
          ),
        ),
      }),
      (0, w.jsx)(`div`, {
        className: `mt-6 grid gap-4 md:grid-cols-2`,
        children: A.map((e) =>
          (0, w.jsxs)(
            `article`,
            {
              className: `rounded-2xl border border-line bg-panel p-5`,
              children: [
                (0, w.jsx)(`h3`, {
                  className: `text-lg font-semibold`,
                  children: e.title,
                }),
                (0, w.jsx)(`p`, {
                  className: `mt-2 text-sm leading-6 text-muted`,
                  children: e.copy,
                }),
              ],
            },
            e.title,
          ),
        ),
      }),
      (0, w.jsxs)(`div`, {
        className: `mt-6 rounded-2xl border border-line bg-panel p-5`,
        children: [
          (0, w.jsx)(`p`, {
            className: `eyebrow`,
            children: `Review-gated sources`,
          }),
          (0, w.jsx)(`div`, {
            className: `mt-4 grid gap-3 md:grid-cols-2`,
            children: n.map((e) =>
              (0, w.jsxs)(
                `div`,
                {
                  className: `rounded-xl border border-line bg-surface/70 p-3`,
                  children: [
                    (0, w.jsxs)(`div`, {
                      className: `flex flex-wrap items-center justify-between gap-2`,
                      children: [
                        (0, w.jsx)(`p`, {
                          className: `text-sm font-medium text-ink`,
                          children: e.name,
                        }),
                        (0, w.jsx)(`span`, {
                          className: `rounded-full border border-line px-2 py-0.5 text-xs text-soft`,
                          children: q(e),
                        }),
                      ],
                    }),
                    (0, w.jsxs)(`p`, {
                      className: `mt-1 text-xs text-muted`,
                      children: [H(e.record_type), ` · `, e.jurisdiction],
                    }),
                  ],
                },
                e.slug,
              ),
            ),
          }),
        ],
      }),
    ],
  });
}
function ce() {
  return (0, w.jsx)(`div`, {
    className: `mt-5 grid grid-cols-2 gap-2`,
    children: [
      `Lien records`,
      `Notices of intent`,
      `WARN notices`,
      `Adversary proceedings`,
    ].map((e) =>
      (0, w.jsxs)(
        `div`,
        {
          className: `flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2`,
          children: [
            (0, w.jsx)(`span`, {
              className: `data-font text-[11px] text-soft`,
              children: e,
            }),
            (0, w.jsx)(`span`, {
              className: `h-2 w-5 rounded-full bg-terminal-blue/50 shadow-[0_0_18px_rgb(80_180_255_/_0.35)]`,
            }),
          ],
        },
        e,
      ),
    ),
  });
}
function $({
  title: e,
  copy: t,
  onSession: n,
  setupNote: r,
  targetView: i = `customer`,
  allowSignup: ae = !0,
}) {
  let [a, o] = (0, l.useState)(``),
    [s, c] = (0, l.useState)(``),
    [np, setNp] = (0, l.useState)(``),
    [rc, setRc] = (0, l.useState)(``),
    [mode, setMode] = (0, l.useState)(`password`),
    [u, d] = (0, l.useState)(``),
    [info, setInfo] = (0, l.useState)(``),
    [f, p] = (0, l.useState)(!1),
    [recovery, setRecovery] = (0, l.useState)(!1),
    showSignup = ae && i === `customer`;
  async function sb() {
    let { supabase: e } = await D(
      async () => {
        let { supabase: e } = await import(`./supabase-D4HD8mHW.js`);
        return { supabase: e };
      },
      __vite__mapDeps([0, 1]),
    );
    if (!e) throw Error(`Sign-in is not available right now. Please contact support.`);
    return e;
  }
  (0, l.useEffect)(() => {
    let e = new URLSearchParams(window.location.search),
      t = e.get(`signup`);
    t === `created`
      ? setInfo(`Account created. Sign in below to open your customer desk and subscribe from Pricing.`)
      : t === `exists` && setInfo(`That email already has an account. Sign in or reset your password.`),
      e.get(`auth`) === `recovery` && setInfo(`Choose a new password to finish resetting your login.`),
      e.delete(`signup`),
      e.delete(`auth`);
    try {
      let authError = sessionStorage.getItem(`vortx_auth_error`);
      authError && (sessionStorage.removeItem(`vortx_auth_error`), d(authError));
    } catch {}
    let n = new URL(window.location.href);
    ((n.search = e.toString()), window.history.replaceState(null, ``, `${n.pathname}${n.search ? `?${n.search}` : ``}${n.hash}`));
  }, []),
    (0, l.useEffect)(() => {
      let e = !1;
      return (
        sb()
          .then((t) => {
            if (e) return;
            (window.location.hash.includes(`type=recovery`) && setRecovery(!0),
              t.auth.onAuthStateChange((e) => {
                e === `PASSWORD_RECOVERY` && setRecovery(!0);
              }));
          })
          .catch(() => {}),
        () => {
          e = !0;
        }
      );
    }, []);
  async function persist(e, t, n) {
    if (t && n) {
      let { error: r } = await e.auth.setSession({ access_token: t, refresh_token: n });
      if (r) throw r;
    }
  }
  async function m() {
    (d(``), setInfo(``), p(!0));
    try {
      let e = await sb(),
        t = await fetch(`/api/auth/login`, {
          method: `POST`,
          headers: { "content-type": `application/json` },
          body: JSON.stringify({ email: a.trim().toLowerCase(), password: s }),
        }),
        r = await t.json();
      if (!t.ok || !r.ok) throw new Error(r.message || r.error || `Invalid login credentials`);
      let i = r.access_token;
      if (!i) throw Error(`No access token returned.`);
      (await persist(e, i, r.refresh_token || ``), n(i, (await g(i)).profile));
    } catch (e) {
      d(e instanceof Error ? e.message : `Login failed.`);
    } finally {
      p(!1);
    }
  }
  async function oauth(e) {
    (d(``), setInfo(``));
    try {
      sessionStorage.setItem(`vortx_auth_return_view`, i);
    } catch {}
    window.location.assign(
      `/api/auth/oauth?provider=${encodeURIComponent(e)}&redirect_to=${encodeURIComponent(`${CANONICAL_SITE}/?view=${i}`)}`,
    );
  }
  async function magic() {
    (d(``), setInfo(``), p(!0));
    try {
      let e = a.trim().toLowerCase();
      if (!e || !e.includes(`@`)) throw Error(`Enter a valid email.`);
      let t = await fetch(`/api/auth/magic-link`, {
          method: `POST`,
          headers: { "content-type": `application/json` },
          body: JSON.stringify({ email: e, view: i, redirect_to: `${CANONICAL_SITE}/?view=${i}` }),
        }),
        n = await t.json();
      if (!t.ok || !n.ok) throw new Error(n.message || n.error || `Could not send sign-in link.`);
      (setInfo(n.message || `Check your email for a one-click sign-in link.`), setMode(`password`));
    } catch (e) {
      d(e instanceof Error ? e.message : `Magic link failed.`);
    } finally {
      p(!1);
    }
  }
  async function recover() {
    (d(``), setInfo(``), p(!0));
    try {
      let e = a.trim().toLowerCase();
      if (!e || !e.includes(`@`)) throw Error(`Enter the email on your account.`);
      let t = await fetch(`/api/auth/recover`, {
          method: `POST`,
          headers: { "content-type": `application/json` },
          body: JSON.stringify({
            email: e,
            view: i,
            redirect_to: `${CANONICAL_SITE}/?view=${i}&auth=recovery`,
          }),
        }),
        n = await t.json();
      if (!t.ok || !n.ok) throw new Error(n.message || n.error || `Could not send reset email.`);
      (setInfo(n.message || `If an account exists, a reset link is on the way.`), setMode(`password`));
    } catch (e) {
      d(e instanceof Error ? e.message : `Password reset failed.`);
    } finally {
      p(!1);
    }
  }
  async function updatePw() {
    (d(``), setInfo(``), p(!0));
    try {
      if (np.length < 10) throw Error(`Password must be at least 10 characters.`);
      let e = await sb(),
        { error: t } = await e.auth.updateUser({ password: np });
      if (t) throw t;
      let { data: r } = await e.auth.getSession(),
        i = r.session?.access_token || ``;
      if (!i) throw Error(`Session expired. Request a new reset link.`);
      (setRecovery(!1), setInfo(`Password updated. You are signed in.`), n(i, (await g(i)).profile));
    } catch (e) {
      d(e instanceof Error ? e.message : `Could not update password.`);
    } finally {
      p(!1);
    }
  }
  async function passkeyLogin() {
    (d(``), setInfo(``), p(!0));
    try {
      if (!window.vortxPasskeys) throw Error(`Passkeys are not available.`);
      let e = a.trim().toLowerCase();
      let t = await window.vortxPasskeys.signIn(e);
      if (!t?.access_token) throw Error(`No access token returned.`);
      let r = await sb();
      await persist(r, t.access_token, t.refresh_token || ``);
      n(t.access_token, (await g(t.access_token)).profile);
    } catch (e) {
      d(e instanceof Error ? e.message : `Passkey sign-in failed.`);
    } finally {
      p(!1);
    }
  }
  async function consumeCode() {
    (d(``), setInfo(``), p(!0));
    try {
      if (!window.vortxPasskeys) throw Error(`Recovery is not available.`);
      let e = a.trim().toLowerCase();
      let t = await window.vortxPasskeys.consumeRecovery(e, rc);
      if (!t?.access_token) throw Error(`No access token returned.`);
      let r = await sb();
      await persist(r, t.access_token, t.refresh_token || ``);
      n(t.access_token, (await g(t.access_token)).profile);
    } catch (e) {
      d(e instanceof Error ? e.message : `Recovery failed.`);
    } finally {
      p(!1);
    }
  }
  let oauthBtn = (e, t) =>
    (0, w.jsxs)(`button`, {
      type: `button`,
      onClick: () => void oauth(e),
      disabled: f,
      className: `flex w-full items-center justify-between rounded-xl border border-metallic bg-black/50 px-4 py-3 text-left text-sm text-ink transition duration-200 hover:border-terminal-blue/50 disabled:opacity-50`,
      children: [
        (0, w.jsx)(`span`, { children: t }),
        (0, w.jsx)(`span`, { className: `data-font text-terminal-blue`, children: `OAuth` }),
      ],
    });
  return (0, w.jsx)(`section`, {
    className: `mx-auto max-w-xl px-6 py-12`,
    children: (0, w.jsxs)(`div`, {
      className: `glass-panel rounded-3xl p-6`,
      children: [
        (0, w.jsx)(`p`, { className: `eyebrow`, children: `Secure access` }),
        (0, w.jsx)(`h2`, { className: `display-font mt-3 text-4xl text-ink`, children: e }),
        (0, w.jsx)(`p`, { className: `mt-3 text-sm leading-6 text-muted`, children: t }),
        info
          ? (0, w.jsx)(`p`, {
              className: `mt-4 rounded-xl border border-emerald-400/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100`,
              children: info,
            })
          : null,
        recovery
          ? (0, w.jsxs)(`div`, {
              className: `mt-6 space-y-3`,
              children: [
                (0, w.jsx)(`p`, {
                  className: `text-sm text-muted`,
                  children: `Set a new password for your account.`,
                }),
                (0, w.jsx)(`input`, {
                  className: `input w-full`,
                  value: np,
                  onChange: (e) => setNp(e.target.value),
                  type: `password`,
                  autoComplete: `new-password`,
                  placeholder: `new password (10+ characters)`,
                }),
                (0, w.jsx)(`button`, {
                  type: `button`,
                  onClick: () => void updatePw(),
                  disabled: f,
                  className: `w-full rounded-xl border border-terminal-blue/50 bg-terminal-blue/15 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-terminal-blue/25 disabled:opacity-50`,
                  children: f ? `Saving...` : `Update password & continue`,
                }),
              ],
            })
          : (0, w.jsxs)(w.Fragment, {
              children: [
                (0, w.jsxs)(`div`, {
                  className: `mt-6 space-y-3`,
                  children: [
                    oauthBtn(`google`, `Continue with Google`),
                  ],
                }),
                (0, w.jsx)(`div`, {
                  className: `data-font mt-5 text-center text-[10px] uppercase tracking-[0.18em] text-soft`,
                  children: `or use email`,
                }),
                (0, w.jsxs)(`div`, {
                  className: `mt-3 flex flex-wrap gap-2 text-xs`,
                  children: [
                    (0, w.jsx)(`button`, {
                      type: `button`,
                      onClick: () => (setMode(`password`), d(``)),
                      className: `rounded-lg px-3 py-1.5 ${mode === `password` ? `border border-white/15 bg-white/10 text-ink` : `text-muted hover:text-ink`}`,
                      children: `Password`,
                    }),
                    (0, w.jsx)(`button`, {
                      type: `button`,
                      onClick: () => (setMode(`magic`), d(``)),
                      className: `rounded-lg px-3 py-1.5 ${mode === `magic` ? `border border-white/15 bg-white/10 text-ink` : `text-muted hover:text-ink`}`,
                      children: `Magic link`,
                    }),
                    (0, w.jsx)(`button`, {
                      type: `button`,
                      onClick: () => (setMode(`recover`), d(``)),
                      className: `rounded-lg px-3 py-1.5 ${mode === `recover` ? `border border-white/15 bg-white/10 text-ink` : `text-muted hover:text-ink`}`,
                      children: `Forgot password`,
                    }),
                    (0, w.jsx)(`button`, {
                      type: `button`,
                      onClick: () => (setMode(`passkey`), d(``)),
                      className: `rounded-lg px-3 py-1.5 ${mode === `passkey` ? `border border-white/15 bg-white/10 text-ink` : `text-muted hover:text-ink`}`,
                      children: `Passkey`,
                    }),
                    (0, w.jsx)(`button`, {
                      type: `button`,
                      onClick: () => (setMode(`code`), d(``)),
                      className: `rounded-lg px-3 py-1.5 ${mode === `code` ? `border border-white/15 bg-white/10 text-ink` : `text-muted hover:text-ink`}`,
                      children: `Recovery code`,
                    }),
                  ],
                }),
                (0, w.jsxs)(`div`, {
                  className: `mt-4 space-y-3`,
                  children: [
                    (0, w.jsx)(`input`, {
                      className: `input w-full`,
                      value: a,
                      onChange: (e) => o(e.target.value),
                      type: `email`,
                      autoComplete: `email`,
                      placeholder: `Work email`,
                      onKeyDown: (e) => {
                        e.key === `Enter` &&
                          (mode === `password` ? m() : mode === `magic` ? magic() : mode === `passkey` ? passkeyLogin() : mode === `code` ? consumeCode() : recover());
                      },
                    }),
                    mode === `password`
                      ? (0, w.jsx)(`input`, {
                          className: `input w-full`,
                          value: s,
                          onChange: (e) => c(e.target.value),
                          type: `password`,
                          autoComplete: `current-password`,
                          placeholder: `Password`,
                          onKeyDown: (e) => {
                            e.key === `Enter` && m();
                          },
                        })
                      : mode === `code`
                        ? (0, w.jsx)(`input`, {
                            className: `input w-full`,
                            value: rc,
                            onChange: (e) => setRc(e.target.value),
                            type: `text`,
                            autoComplete: `one-time-code`,
                            placeholder: `Recovery code`,
                            onKeyDown: (e) => {
                              e.key === `Enter` && consumeCode();
                            },
                          })
                        : null,
                    (0, w.jsx)(`button`, {
                      type: `button`,
                      onClick: () => void (mode === `password` ? m() : mode === `magic` ? magic() : mode === `passkey` ? passkeyLogin() : mode === `code` ? consumeCode() : recover()),
                      disabled: f,
                      className: `w-full rounded-xl border border-terminal-blue/50 bg-terminal-blue/15 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-terminal-blue/25 disabled:opacity-50`,
                      children: f
                        ? `Working...`
                        : mode === `password`
                          ? `Sign in`
                          : mode === `magic`
                            ? `Email me a sign-in link`
                            : mode === `passkey`
                              ? `Sign in with a passkey`
                              : mode === `code`
                                ? `Use recovery code`
                                : `Send reset link`,
                    }),
                    showSignup
                      ? (0, w.jsx)(`a`, {
                          href: `/signup`,
                          className: `block text-center text-sm text-terminal-blue underline underline-offset-4 transition duration-200 hover:bg-sky-500/15 hover:text-ink rounded-lg px-3 py-2`,
                          children: `Create customer account`,
                        })
                      : null,
                  ],
                }),
              ],
            }),
        u
          ? (0, w.jsx)(`p`, {
              className: `mt-4 text-sm text-rose-200`,
              children: u,
            })
          : null,
        r
          ? (0, w.jsx)(`p`, {
              className: `data-font mt-5 text-xs leading-5 text-soft`,
              children: r,
            })
          : null,
      ],
    }),
  });
}
function deskBucket(e) {
  let t = String(e?.event_type || e?.source_record_type || e?.notice_kind || ``).toLowerCase();
  if (t === `form_4` || t === `insider` || /form_4|insider/.test(t)) return `insider`;
  if (t === `congress_trade` || t === `congress` || /congress|stock.?act/.test(t)) return `congress`;
  if (t === `institutional_13f` || t === `institutional` || /13f|institutional/.test(t))
    return `institutional`;
  return `distress`;
}
function deskBucketLabel(e) {
  return e === `insider`
    ? `Insider`
    : e === `congress`
      ? `Congress`
      : e === `institutional`
        ? `Fund`
        : `Other`;
}
function deskMetricCounts(e) {
  let t = { all: 0, insider: 0, congress: 0, institutional: 0, distress: 0 };
  for (let n of e || []) {
    t.all += 1;
    t[deskBucket(n)] += 1;
  }
  return t;
}
function pickDeskWatchSuggest(groups = [], starSet) {
  let stars = starSet instanceof Set ? starSet : new Set();
  return (groups || []).find(
    (g) =>
      g?.entityId &&
      !stars.has(g.entityId) &&
      ![...(g.buckets || [])].every((b) => b === `distress`),
  ) || null;
}
function pickDeskWatchSuggestList(groups = [], starSet, limit = 6) {
  let stars = starSet instanceof Set ? starSet : new Set(),
    out = [],
    seenTypes = new Set();
  for (let g of groups || []) {
    if (!g?.entityId || stars.has(g.entityId)) continue;
    if ([...(g.buckets || [])].every((b) => b === `distress`)) continue;
    let top = g.events?.[0],
      type = String(top?.event_type || ``);
    // Prefer a mix of Form 4 / Congress / 13F when available.
    if (seenTypes.has(type) && out.length >= 3) continue;
    out.push({
      entityId: g.entityId,
      entityName: g.entityName || top?.entity_name || `Trader`,
      eventType: type,
      ticker:
        String(top?.ticker || top?.signal_meta?.ticker_label || ``)
          .trim()
          .toUpperCase() || null,
    });
    if (type) seenTypes.add(type);
    if (out.length >= limit) break;
  }
  if (out.length < limit) {
    for (let g of groups || []) {
      if (out.length >= limit) break;
      if (!g?.entityId || stars.has(g.entityId)) continue;
      if (out.some((row) => row.entityId === g.entityId)) continue;
      if ([...(g.buckets || [])].every((b) => b === `distress`)) continue;
      let top = g.events?.[0];
      out.push({
        entityId: g.entityId,
        entityName: g.entityName || top?.entity_name || `Trader`,
        eventType: String(top?.event_type || ``),
        ticker:
          String(top?.ticker || top?.signal_meta?.ticker_label || ``)
            .trim()
            .toUpperCase() || null,
      });
    }
  }
  return out;
}
function deskSearchableBlob(e) {
  return [
    e?.entity_name,
    e?.title,
    e?.summary,
    e?.jurisdiction,
    e?.event_type,
    e?.source_record_type,
    e?.source_name,
    e?.ticker,
    e?.signal_meta?.ticker_label,
    e?.signal_meta?.issuer_label,
    e?.signal_meta?.filer_label,
  ]
    .filter(Boolean)
    .join(` `)
    .toLowerCase();
}
function filterDeskEvents({
  events: e = [],
  bucket: t = `all`,
  query: n = ``,
  watchlistIds: r = [],
  watchlistOnly: i = !1,
} = {}) {
  let a = String(n || ``).trim().toLowerCase(),
    o = r instanceof Set ? r : new Set([...(r || [])].map((e) => String(e || ``).trim()).filter(Boolean));
  return (e || []).filter((e) => {
    if (t !== `all` && deskBucket(e) !== t) return !1;
    if (i) {
      let t = String(e?.entity_id || ``).trim();
      if (!t || !o.has(t)) return !1;
    }
    return !(a && !deskSearchableBlob(e).includes(a));
  });
}
function groupDeskEntities(e) {
  let t = new Map();
  for (let n of e || []) {
    let e = String(n?.entity_id || ``).trim(),
      r = e || `title:${String(n?.title || n?.id || `unknown`).slice(0, 80)}`,
      i = t.get(r) || {
        entityId: e || null,
        entityName: String(n?.entity_name || ``).trim() || `Public record entity`,
        events: [],
        buckets: new Set(),
        severityMax: 0,
      };
    if (!i.entityName || i.entityName === `Public record entity`) {
      let e = String(n?.entity_name || ``).trim();
      if (e) i.entityName = e;
    }
    i.events.push(n);
    i.buckets.add(deskBucket(n));
    let a = Number(n?.severity ?? n?.display_severity) || 0;
    if (a > i.severityMax) i.severityMax = a;
    t.set(r, i);
  }
  return [...t.values()]
    .map((e) => {
      let t = [...e.buckets],
        n = [...e.events].sort((e, t) => {
          let n = `${e?.filing_date || e?.created_at || ``}\t${String(1000 - (Number(e?.severity) || 0)).padStart(4, `0`)}`,
            r = `${t?.filing_date || t?.created_at || ``}\t${String(1000 - (Number(t?.severity) || 0)).padStart(4, `0`)}`;
          return r.localeCompare(n);
        });
      return {
        entityId: e.entityId,
        entityName: e.entityName,
        events: n,
        buckets: t,
        severityMax: e.severityMax,
        isComposite: t.length > 1,
        compositeLabel:
          t.length > 1 ? `COMPOSITE: ${t.map(deskBucketLabel).join(` + `)}` : null,
      };
    })
    .sort((e, t) => {
      if (t.severityMax !== e.severityMax) return t.severityMax - e.severityMax;
      return String(t.events[0]?.filing_date || ``).localeCompare(
        String(e.events[0]?.filing_date || ``),
      );
    });
}
function formatCopySignal(e) {
  let t = deskBucket(e),
    n = String(e?.entity_name || e?.signal_meta?.filer_label || `Name hidden`).trim(),
    r = String(e?.title || e?.short_title || `Public record signal`).trim(),
    i = e?.filing_date ? ` filed ${e.filing_date}` : ``,
    a = e?.signal_meta?.ticker_label ? ` $${e.signal_meta.ticker_label}` : ``,
    o =
      t === `insider`
        ? `Form 4`
        : t === `congress`
          ? `STOCK Act`
          : t === `institutional`
            ? `13F`
            : `Public filing`;
  return `VORTX SIGNAL: ${o} · ${n}${a} · ${r}${i}`.replace(/\s+/g, ` `).trim();
}
function watchlistEntityIdSet(e) {
  let t = new Set();
  for (let n of e || []) {
    let e = Array.isArray(n.member_entity_ids)
      ? n.member_entity_ids
      : Array.isArray(n.entity_ids)
        ? n.entity_ids
        : [];
    for (let n of e) {
      let e = String(n || ``).trim();
      if (e) t.add(e);
    }
  }
  return t;
}
function deskLocalStarKey(e) {
  return `vortx-desk-stars-${e || `anon`}`;
}
function readLocalDeskStars(e) {
  try {
    if (typeof localStorage == `undefined`) return [];
    let t = JSON.parse(localStorage.getItem(deskLocalStarKey(e)) || `[]`);
    return Array.isArray(t) ? t.map((e) => String(e || ``).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}
function writeLocalDeskStars(e, t) {
  try {
    if (typeof localStorage == `undefined`) return;
    localStorage.setItem(deskLocalStarKey(e), JSON.stringify([...(t || [])]));
  } catch {}
}
function clearLocalDeskStars(e) {
  try {
    if (typeof localStorage == `undefined`) return;
    localStorage.removeItem(deskLocalStarKey(e));
  } catch {}
}
/** Push signed-out Watch stars into the Desk watchlist after login. */
async function syncAnonStarsToAccount(accessToken, userId) {
  let token = String(accessToken || ``).trim();
  let uid = String(userId || ``).trim();
  if (!token) return [];
  let anonIds = readLocalDeskStars(`anon`);
  if (!anonIds.length) return readLocalDeskStars(uid || `anon`);
  let next = new Set(readLocalDeskStars(uid));
  for (let entityId of anonIds.slice(0, 20)) {
    let id = String(entityId || ``).trim();
    if (!id || next.has(id)) continue;
    try {
      let res = await fetch(`/api/customer/watchlist-star`, {
        method: `POST`,
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': `application/json`,
        },
        body: JSON.stringify({ entity_id: id }),
      });
      let payload = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(payload.member_entity_ids)) {
        for (let row of payload.member_entity_ids) {
          let mid = String(row || ``).trim();
          if (mid) next.add(mid);
        }
      } else if (res.ok && payload.starred) {
        next.add(id);
      } else {
        next.add(id);
      }
    } catch {
      next.add(id);
    }
  }
  let merged = [...next];
  writeLocalDeskStars(uid || `anon`, merged);
  clearLocalDeskStars(`anon`);
  if (merged.length) trackMarketingStepOnce(`first_watch`, `first_watch`, `anon_sync`);
  return merged;
}
function readTradeListPrefs(streamKey) {
  try {
    if (typeof sessionStorage == `undefined`) return {};
    let all = JSON.parse(sessionStorage.getItem(`vortx_trade_list_prefs_v1`) || `{}`);
    return all[String(streamKey || ``)] || {};
  } catch {
    return {};
  }
}
function writeTradeListPrefs(streamKey, prefs) {
  try {
    if (typeof sessionStorage == `undefined`) return;
    let all = JSON.parse(sessionStorage.getItem(`vortx_trade_list_prefs_v1`) || `{}`);
    all[String(streamKey || ``)] = prefs || {};
    sessionStorage.setItem(`vortx_trade_list_prefs_v1`, JSON.stringify(all));
  } catch {}
}
function eventTradeAmount(e) {
  let n = Number(e?.amount);
  return Number.isFinite(n) ? n : 0;
}
function eventTradeSeverity(e) {
  return Number(e?.severity ?? e?.display_severity ?? e?.confidence) || 0;
}
function eventTradeSideKey(e) {
  let metaSide = String(e?.signal_meta?.side || ``).toLowerCase();
  if (metaSide === `buy` || metaSide === `sell`) return metaSide;
  if (metaSide === `institutional`) return `holdings`;
  let type = String(e?.event_type || e?.source_record_type || ``).toLowerCase();
  if (type === `institutional_13f`) return `holdings`;
  let blob = `${e?.title || ``} ${e?.summary || ``} ${e?.signal_meta?.action_label || ``}`;
  if (/Transaction code:\s*P\b|\bpurchase\b|\bbought\b|\bbuy\b/i.test(blob)) return `buy`;
  if (/Transaction code:\s*S\b|\bsale\b|\bsold\b|\bsell\b/i.test(blob)) return `sell`;
  return `filed`;
}
function actionFilterOptions(events = [], streamKey = ``) {
  let stream = String(streamKey || ``),
    present = new Set((events || []).map(eventTradeSideKey));
  if (stream === `thirteenf` || stream === `institutional_13f`) return [];
  if (present.size <= 1) return [];
  let allowed =
    stream === `insider` || stream === `form_4`
      ? new Set([`buy`, `sell`, `filed`])
      : stream === `congress` || stream === `congress_trade`
        ? new Set([`buy`, `sell`, `filed`])
        : new Set([`buy`, `sell`, `filed`, `holdings`]);
  let chips = [
    [`all`, `All`],
    [`buy`, `Bought`],
    [`sell`, `Sold`],
    [`filed`, `Reported`],
    [`holdings`, `Fund list`],
  ];
  let options = chips.filter(([id]) => id === `all` || (allowed.has(id) && present.has(id)));
  return options.length > 1 ? options : [];
}
function applyTradeListControls(events = [], opts = {}) {
  let sort = opts.sort || `recent`,
    side = opts.side || `all`,
    q = String(opts.query || ``).trim().toLowerCase(),
    rows = [...(events || [])];
  if (side !== `all`) rows = rows.filter((e) => eventTradeSideKey(e) === side);
  if (q) {
    rows = rows.filter((e) => {
      let card = parseTradingCardFields(e),
        blob = [
        e?.entity_name,
        e?.title,
        e?.summary,
        e?.signal_meta?.ticker_label,
        e?.signal_meta?.issuer_label,
        e?.signal_meta?.filer_label,
        e?.ticker,
        card.ticker,
        card.issuer,
        card.filerName,
        card.formLabel,
      ]
        .filter(Boolean)
        .join(` `)
        .toLowerCase();
      return blob.includes(q);
    });
  }
  rows.sort((a, b) => {
    if (sort === `amount`) return eventTradeAmount(b) - eventTradeAmount(a);
    if (sort === `severity`) return eventTradeSeverity(b) - eventTradeSeverity(a);
    let byDate = String(b.filing_date || b.created_at || ``).localeCompare(
      String(a.filing_date || a.created_at || ``),
    );
    return byDate || eventTradeSeverity(b) - eventTradeSeverity(a);
  });
  return rows;
}
function startOfLocalDay(ms) {
  let d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function sortDeskGroups(groups = [], sort = `recent`) {
  let rows = [...(groups || [])];
  rows.sort((a, b) => {
    if (sort === `amount`) {
      let aAmt = Math.max(0, ...(a.events || []).map(eventTradeAmount)),
        bAmt = Math.max(0, ...(b.events || []).map(eventTradeAmount));
      return bAmt - aAmt;
    }
    if (sort === `severity`) return (b.severityMax || 0) - (a.severityMax || 0);
    return String(b.events?.[0]?.filing_date || b.events?.[0]?.created_at || ``).localeCompare(
      String(a.events?.[0]?.filing_date || a.events?.[0]?.created_at || ``),
    );
  });
  return rows;
}
function groupDeskByRecency(groups = []) {
  let now = Date.now(),
    todayStart = startOfLocalDay(now),
    yesterdayStart = todayStart - 864e5,
    weekStart = todayStart - 6 * 864e5,
    sections = [
      { id: `today`, label: `Today`, groups: [] },
      { id: `yesterday`, label: `Yesterday`, groups: [] },
      { id: `week`, label: `This week`, groups: [] },
      { id: `earlier`, label: `Earlier`, groups: [] },
    ];
  for (let group of groups || []) {
    let filed = String(group?.events?.[0]?.filing_date || group?.events?.[0]?.created_at || ``),
      ms = Date.parse(filed),
      bucket = !Number.isFinite(ms)
        ? `earlier`
        : ms >= todayStart
          ? `today`
          : ms >= yesterdayStart
            ? `yesterday`
            : ms >= weekStart
              ? `week`
              : `earlier`;
    sections.find((s) => s.id === bucket)?.groups.push(group);
  }
  return sections.filter((s) => s.groups.length);
}
function earlyDetectionAnchor(event) {
  let explicit =
      event?.detected_at ||
      event?.first_seen_at ||
      event?.signal_meta?.detected_at ||
      null,
    created = event?.created_at || null,
    filingDate = String(event?.filing_date || ``).slice(0, 10),
    createdMs = Date.parse(String(created || ``)),
    filingAnchorMs = /^\d{4}-\d{2}-\d{2}$/.test(filingDate)
      ? Date.parse(`${filingDate}T14:00:00.000Z`)
      : NaN;
  if (explicit) {
    let explicitMs = Date.parse(String(explicit));
    if (
      Number.isFinite(explicitMs) &&
      Number.isFinite(filingAnchorMs) &&
      Number.isFinite(createdMs) &&
      explicitMs > filingAnchorMs &&
      createdMs > filingAnchorMs &&
      String(explicit).slice(0, 10) === filingDate
    )
      return new Date(filingAnchorMs).toISOString();
    return explicit;
  }
  if (
    Number.isFinite(createdMs) &&
    Number.isFinite(filingAnchorMs) &&
    createdMs > filingAnchorMs &&
    String(created).slice(0, 10) === filingDate
  )
    return new Date(filingAnchorMs).toISOString();
  return created;
}
function youWereEarlyLabel(event) {
  let detectedRaw = earlyDetectionAnchor(event),
    newsRaw =
      event?.news_mentioned_at ||
      event?.coverage_first_seen_at ||
      event?.signal_meta?.news_mentioned_at ||
      event?.signal_meta?.coverage_first_seen_at ||
      null,
    detected = Date.parse(String(detectedRaw || ``)),
    news = Date.parse(String(newsRaw || ``));
  if (!Number.isFinite(detected) || !Number.isFinite(news) || news <= detected) return null;
  let hours = Math.floor((news - detected) / 36e5);
  if (hours < 1) return null;
  if (hours < 48)
    return `You saw this ${hours} hour${hours === 1 ? `` : `s`} before the news`;
  let days = Math.floor(hours / 24);
  return `Public here ${days} day${days === 1 ? `` : `s`} before broad coverage`;
}
function countBeatenTheNews(events = [], { monthStartMs = null } = {}) {
  let n = 0;
  for (let event of events || []) {
    if (!youWereEarlyLabel(event)) continue;
    if (monthStartMs != null) {
      let ts = Date.parse(
        event.news_mentioned_at ||
          event.coverage_first_seen_at ||
          event.detected_at ||
          event.created_at ||
          ``,
      );
      if (Number.isFinite(ts) && ts < monthStartMs) continue;
    }
    n += 1;
  }
  return n;
}
const JARGON_TIPS = {
  'Form 4': `A filing that discloses when a company insider buys or sells stock`,
  'STOCK Act': `The law that requires members of Congress to report their stock trades`,
  '13F': `A quarterly report of stock holdings from large investment managers`,
  EDGAR: `The SEC system where companies and funds file public disclosures`,
  Nebula: `Nebula is the $150/month Vortx plan that names the person and emails you when they trade again, so you do not miss the next filing. Open Pricing for details.`,
};
function tipSpan(term, children) {
  let tip = JARGON_TIPS[term];
  if (!tip) return children ?? term;
  if (term === `Nebula`) {
    return (0, w.jsx)(`button`, {
      type: `button`,
      className: `vortx-tip vortx-nebula-tip`,
      tabIndex: 0,
      'data-tip': tip,
      title: tip,
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.assign(`/?view=pricing&plan=nebula`);
      },
      children: children ?? term,
    });
  }
  return (0, w.jsx)(`span`, {
    className: `vortx-tip`,
    tabIndex: 0,
    'data-tip': tip,
    children: children ?? term,
  });
}
function renderJargonText(text) {
  let raw = String(text || ``);
  if (!raw) return null;
  let parts = raw.split(/(Form 4|STOCK Act|13F|EDGAR|Nebula)/g);
  if (parts.length === 1) return raw;
  return parts.map((part, i) =>
    JARGON_TIPS[part] ? tipSpan(part, part) : (0, w.jsx)(`span`, { children: part }, `j-${i}`),
  );
}
function filterChipLabel(id, label) {
  if (id === `form_4`) {
    return (0, w.jsx)(`span`, {
      className: `vortx-tip`,
      tabIndex: 0,
      'data-tip': `Company officers and directors`,
      children: label,
    });
  }
  if (id === `congress_trade`) {
    return (0, w.jsx)(`span`, {
      className: `vortx-tip`,
      tabIndex: 0,
      'data-tip': `U.S. House and Senate`,
      children: label,
    });
  }
  if (id === `institutional_13f`) {
    return (0, w.jsx)(`span`, {
      className: `vortx-tip`,
      tabIndex: 0,
      'data-tip': `Large investment funds`,
      children: label,
    });
  }
  return label;
}
function tapeHowToRead(copy) {
  return (0, w.jsx)(`p`, {
    className: `vortx-tape-guide`,
    children: renderJargonText(
      copy ||
        `Each row is a public trade they already filed. Click Their trades to open one person. Ticker, bought or sold, and company are free. Gray “Name hidden” means the person's name shows after you subscribe.`,
    ),
  });
}
function youWereEarlyBadge(event) {
  let label = youWereEarlyLabel(event);
  if (!label) return null;
  return (0, w.jsxs)(`span`, {
    className: `vortx-early-badge`,
    tabIndex: 0,
    'data-tip': `Vortx detected this filing before it appeared in mainstream news coverage`,
    title: `Vortx detected this filing before it appeared in mainstream news coverage`,
    children: [
      label,
      (0, w.jsx)(`span`, {
        className: `vortx-early-badge__hint`,
        'aria-hidden': `true`,
        children: `i`,
      }),
    ],
  });
}
function mergeCoverageOntoEvent(row, coverageMap) {
  if (!row?.id || !coverageMap) return row;
  let hit = coverageMap[row.id];
  if (!hit?.news_mentioned_at) return row;
  return {
    ...row,
    detected_at: hit.detected_at || row.detected_at || row.created_at,
    news_mentioned_at: hit.news_mentioned_at,
    coverage_first_seen_at: hit.coverage_first_seen_at || hit.news_mentioned_at,
    signal_meta: {
      ...(row.signal_meta || {}),
      detected_at: hit.detected_at || row.detected_at || row.created_at,
      news_mentioned_at: hit.news_mentioned_at,
      coverage_first_seen_at: hit.coverage_first_seen_at || hit.news_mentioned_at,
      coverage_source: hit.coverage_source,
      coverage_title: hit.coverage_title,
    },
  };
}
function useCoverageEnrich(events) {
  let trading = (0, l.useMemo)(
      () =>
        (events || [])
          .filter((e) =>
            [`form_4`, `congress_trade`, `institutional_13f`].includes(
              String(e?.event_type || e?.source_record_type || ``),
            ),
          )
          .slice(0, 40),
      [events],
    ),
    key = trading
      .map((e) => e.id)
      .filter(Boolean)
      .join(`,`),
    [coverageMap, setCoverageMap] = (0, l.useState)({});
  (0, l.useEffect)(() => {
    let need = trading.filter((e) => e?.id && !e.news_mentioned_at && !e.signal_meta?.news_mentioned_at);
    if (!need.length) return;
    let cancelled = !1;
    fetch(`/api/coverage-enrich`, {
      method: `POST`,
      headers: { 'content-type': `application/json`, accept: `application/json` },
      body: JSON.stringify({
        events: need.slice(0, 24).map((e) => ({
          id: e.id,
          event_type: e.event_type || e.source_record_type,
          created_at: e.created_at || e.detected_at,
          detected_at: e.detected_at || e.created_at,
          filing_date: e.filing_date,
          title: e.title,
          summary: e.summary,
          entity_name: e.entity_name,
          ticker: e.ticker || e.signal_meta?.ticker_label,
          signal_meta: e.signal_meta || {},
        })),
      }),
    })
      .then((r) => r.json())
      .then((body) => {
        if (cancelled || !body?.coverage) return;
        setCoverageMap((prev) => ({ ...prev, ...body.coverage }));
      })
      .catch(() => {});
    return () => {
      cancelled = !0;
    };
  }, [key]);
  return coverageMap;
}
function WatchTradeButton({
  entityId: entityId,
  starred: starred,
  flash: flash,
  disabled: disabled,
  onToggle: onToggle,
  size: size = `md`,
  noun: noun = `person`,
}) {
  if (!entityId && !onToggle) return null;
  return (0, w.jsx)(`button`, {
    type: `button`,
    className: [
      `vortx-desk-watch-btn`,
      size === `sm` ? `vortx-desk-watch-btn--sm` : ``,
      starred ? `vortx-desk-watch-btn--on` : ``,
      flash ? `vortx-desk-watch-btn--flash` : ``,
    ]
      .filter(Boolean)
      .join(` `),
    disabled: disabled || !entityId,
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!entityId || disabled) return;
      void onToggle?.(entityId);
    },
    'aria-label': starred ? `Remove from watchlist` : `Watch this ${noun}`,
    children: flash || starred ? `Watching ✓` : `Watch`,
  });
}
function readWhaleWho() {
  try {
    return String(new URLSearchParams(location.search).get(`who`) || ``)
      .replace(/[^\w-]/g, ``)
      .slice(0, 64);
  } catch {
    return ``;
  }
}
function writeWhaleWho(id) {
  try {
    let next = new URL(location.href),
      clean = String(id || ``).replace(/[^\w-]/g, ``).slice(0, 64);
    if (clean) next.searchParams.set(`who`, clean);
    else next.searchParams.delete(`who`);
    history.replaceState(null, ``, `${next.pathname}${next.search}${next.hash}`);
  } catch {}
}
function useWhaleWho() {
  let [whaleId, setWhaleId] = (0, l.useState)(() => readWhaleWho());
  (0, l.useEffect)(() => {
    let sync = () => setWhaleId(readWhaleWho());
    window.addEventListener(`popstate`, sync);
    return () => window.removeEventListener(`popstate`, sync);
  }, []);
  return [
    whaleId,
    (id) => {
      writeWhaleWho(id);
      setWhaleId(id || ``);
      if (id) trackMarketingStep(`whale_open`, `tape`);
    },
    () => {
      writeWhaleWho(``);
      setWhaleId(``);
    },
  ];
}
function buildWhaleCard(entityId, events = []) {
  let id = String(entityId || ``).replace(/[^\w-]/g, ``).slice(0, 64);
  if (!id) return null;
  let rows = (events || [])
    .filter((row) => String(row.entity_id || ``) === id)
    .slice()
    .sort((a, b) => String(b.filing_date || ``).localeCompare(String(a.filing_date || ``)));
  if (!rows.length) return { entityId: id, rows: [], count: 0, bought: 0, sold: 0, reported: 0, unusual: !1, early: 0, name: ``, type: ``, locked: !0, tickers: [], lastDate: `` };
  let parsed = rows.map((row) => ({ row, card: parseTradingCardFields(row) })),
    bought = parsed.filter((x) => x.card.side === `buy`).length,
    sold = parsed.filter((x) => x.card.side === `sell`).length,
    amounts = parsed.map((x) => Number(x.card.amount)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b),
    median = amounts.length ? amounts[Math.floor(amounts.length / 2)] : null,
    latestAmt = amounts.length ? Number(parsed[0].card.amount) : null,
    named = parsed.find((x) => x.card.filerName)?.card;
  return {
    entityId: id,
    rows,
    count: parsed.length,
    bought,
    sold,
    reported: parsed.length - bought - sold,
    unusual: Boolean(median && latestAmt && latestAmt >= median * 2),
    early: parsed.filter((x) => youWereEarlyLabel(x.row)).length,
    name: named?.filerName || ``,
    type: named?.type || parsed[0].card.type || ``,
    locked: !named?.filerName,
    tickers: [...new Set(parsed.map((x) => x.card.ticker).filter(Boolean))].slice(0, 4),
    lastDate: rows[0]?.filing_date || ``,
  };
}
function whaleWatchPanel({
  entityId,
  events = [],
  onClose,
  onOpenPricing,
  onToggleWatch,
  starred = !1,
  canWatch = !1,
}) {
  let layerRef = (0, l.useRef)(null),
    whale = buildWhaleCard(entityId, events),
    open = Boolean(whale?.count);
  (0, l.useEffect)(() => {
    if (!open) return;
    let onKey = (e) => {
      if (e.key === `Escape`) onClose?.();
    };
    window.addEventListener(`keydown`, onKey);
    return () => window.removeEventListener(`keydown`, onKey);
  }, [open, onClose]);
  (0, l.useLayoutEffect)(() => {
    let el = layerRef.current;
    if (!el || !open) return;
    let prevOverflow = document.body.style.overflow;
    let pin = () => {
      el.style.position = `fixed`;
      el.style.left = `0px`;
      el.style.right = `auto`;
      el.style.bottom = `auto`;
      el.style.width = `100%`;
      el.style.top = `0px`;
      el.style.height = `100dvh`;
      let box = el.getBoundingClientRect();
      if (Math.abs(box.top) > 1) el.style.top = `${-box.top}px`;
      if (Math.abs(box.height - window.innerHeight) > 8) el.style.height = `${window.innerHeight}px`;
    };
    document.body.style.overflow = `hidden`;
    document.documentElement.classList.add(`vortx-whale-open`);
    pin();
    window.addEventListener(`resize`, pin);
    window.addEventListener(`scroll`, pin, { passive: !0 });
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.classList.remove(`vortx-whale-open`);
      window.removeEventListener(`resize`, pin);
      window.removeEventListener(`scroll`, pin);
    };
  }, [open]);
  if (!open) return null;
  let noun =
      whale.type === `institutional_13f` ? `fund` : whale.type === `congress_trade` ? `member` : `person`,
    premium = !whale.locked,
    mix = [
      whale.bought ? `${whale.bought} bought` : ``,
      whale.sold ? `${whale.sold} sold` : ``,
      whale.reported ? `${whale.reported} reported` : ``,
    ]
      .filter(Boolean)
      .join(` · `) || `${whale.count} filings`;
  return (0, w.jsxs)(`div`, {
    ref: layerRef,
    className: `vortx-whale-layer`,
    children: [
      (0, w.jsx)(`button`, {
        type: `button`,
        className: `vortx-whale__backdrop`,
        "aria-label": `Close person desk`,
        onClick: onClose,
      }),
      (0, w.jsxs)(`section`, {
        className: `vortx-whale`,
        role: `dialog`,
        "aria-modal": `true`,
        "aria-label": `Person desk`,
        children: [
      (0, w.jsxs)(`div`, {
        className: `vortx-whale__top`,
        children: [
          (0, w.jsxs)(`div`, {
            children: [
              (0, w.jsx)(`p`, { className: `eyebrow text-terminal-blue`, children: `Person desk` }),
              (0, w.jsx)(`h3`, {
                className: `vortx-whale__name display-font`,
                children: whale.locked ? `Name hidden` : whale.name,
              }),
              (0, w.jsx)(`p`, {
                className: `vortx-whale__mix`,
                children: `${mix} in this list${whale.tickers.length ? ` · ${whale.tickers.join(`, `)}` : ``}`,
              }),
            ],
          }),
          (0, w.jsxs)(`div`, {
            className: `vortx-whale__actions`,
            children: [
              (0, w.jsx)(WatchTradeButton, {
                entityId: whale.entityId,
                starred,
                onToggle: canWatch
                  ? onToggleWatch
                  : () => openNebulaPricing(onOpenPricing, `whale_watch`),
                noun,
              }),
              (0, w.jsx)(`button`, {
                type: `button`,
                className: `vortx-whale__close`,
                onClick: onClose,
                children: `Close`,
              }),
            ],
          }),
        ],
      }),
      (0, w.jsx)(`p`, {
        className: `vortx-whale__note`,
        children: `Filing activity in this list, not a score of whether they made money.`,
      }),
      (0, w.jsxs)(`div`, {
        className: `vortx-whale__stats`,
        children: [
          (0, w.jsxs)(`article`, {
            className: `vortx-whale__stat`,
            children: [
              (0, w.jsx)(`p`, { className: `vortx-whale__stat-kicker`, children: `In this list` }),
              (0, w.jsx)(`p`, { className: `vortx-whale__stat-value`, children: String(whale.count) }),
              (0, w.jsx)(`p`, { className: `vortx-whale__stat-hint`, children: mix }),
            ],
          }),
          (0, w.jsxs)(`article`, {
            className: premium ? `vortx-whale__stat` : `vortx-whale__stat vortx-whale__stat--lock`,
            children: [
              (0, w.jsx)(`p`, { className: `vortx-whale__stat-kicker`, children: `Unusual size` }),
              (0, w.jsx)(`p`, {
                className: `vortx-whale__stat-value`,
                children: premium ? (whale.unusual ? `Larger than usual` : `In range`) : `Vortx`,
              }),
              (0, w.jsx)(`p`, {
                className: `vortx-whale__stat-hint`,
                children: premium
                  ? `Latest amount vs their other filings here`
                  : `See if this filing is large vs their own history`,
              }),
            ],
          }),
          (0, w.jsxs)(`article`, {
            className: premium ? `vortx-whale__stat` : `vortx-whale__stat vortx-whale__stat--lock`,
            children: [
              (0, w.jsx)(`p`, { className: `vortx-whale__stat-kicker`, children: `Before the news` }),
              (0, w.jsx)(`p`, {
                className: `vortx-whale__stat-value`,
                children: premium ? String(whale.early) : `Vortx`,
              }),
              (0, w.jsx)(`p`, {
                className: `vortx-whale__stat-hint`,
                children: premium
                  ? `Filings that showed here before coverage`
                  : `Email when they file again. Timing, not a profit score`,
              }),
            ],
          }),
        ],
      }),
      !premium
        ? (0, w.jsx)(`button`, {
            type: `button`,
            className: `vortx-whale__cta`,
            onClick: () => openNebulaPricing(onOpenPricing, `whale_desk`),
            children: `See the name and email the next filing`,
          })
        : (0, w.jsx)(`p`, {
            className: `vortx-whale__stat-hint`,
            children: `Watch this ${noun} to get an email the next time they file.`,
          }),
        ],
      }),
    ],
  });
}
function AnimatedStatValue({ value: value, className: className, tag: tag = `p`, hold: hold = !1 }) {
  let [display, setDisplay] = (0, l.useState)(0),
    [pulse, setPulse] = (0, l.useState)(!1),
    displayRef = (0, l.useRef)(0);
  displayRef.current = display;
  (0, l.useEffect)(() => {
    if (hold) {
      setDisplay(0);
      setPulse(!1);
      return;
    }
    let next = Number(value);
    if (!Number.isFinite(next)) next = 0;
    let start = displayRef.current;
    if (next === start) return;
    if (
      typeof window !== `undefined` &&
      window.matchMedia(`(prefers-reduced-motion: reduce)`).matches
    ) {
      setDisplay(next);
      return;
    }
    setPulse(!0);
    let delta = next - start,
      t0 = performance.now(),
      dur = Math.min(1600, Math.max(800, 420 + Math.log10(Math.abs(delta) + 1) * 380)),
      raf = 0,
      step = (now) => {
        let p = Math.min(1, (now - t0) / dur),
          eased = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(start + delta * eased));
        if (p < 1) raf = requestAnimationFrame(step);
        else {
          setDisplay(next);
          setPulse(!1);
        }
      };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, hold]);
  return (0, w.jsx)(tag, {
    className: `${className || ``}${pulse ? ` vortx-stat-pulse` : ``}`.trim(),
    children: Number(display).toLocaleString(),
  });
}
function tradeListControlBar({
  streamKey: streamKey,
  sort: sort,
  side: side,
  query: query,
  onSort: onSort,
  onSide: onSide,
  onQuery: onQuery,
  sideOptions: sideOptions = null,
  showSideFilter: showSideFilter = !0,
  compact: compact = !1,
  typeFilter: typeFilter = ``,
  onType: onType,
  typeOptions: typeOptions = null,
}) {
  let chips =
    Array.isArray(sideOptions)
      ? sideOptions
      : [
          [`all`, `All`],
          [`buy`, `Bought`],
          [`sell`, `Sold`],
          [`filed`, `Reported`],
          [`holdings`, `Fund list`],
        ],
    sorts = compact
      ? [
          [`recent`, `Recent`],
          [`amount`, `$`],
          [`severity`, `Size`],
        ]
      : [
          [`recent`, `Most recent`],
          [`amount`, `Highest $`],
          [`severity`, `Biggest / most serious`],
        ];
  return (0, w.jsxs)(`div`, {
    className: compact ? `vortx-trade-controls vortx-trade-controls--compact` : `vortx-trade-controls mt-3`,
    children: [
      compact && Array.isArray(typeOptions)
        ? (0, w.jsxs)(`div`, {
            className: `vortx-trade-controls__row`,
            children: typeOptions.map(([id, label]) =>
              (0, w.jsx)(
                `button`,
                {
                  type: `button`,
                  onClick: () => onType?.(id),
                  className:
                    typeFilter === id
                      ? `vortx-trade-filter vortx-trade-filter--active`
                      : `vortx-trade-filter`,
                  children: filterChipLabel(id, label),
                },
                `${streamKey}-type-${id}`,
              ),
            ),
          })
        : null,
      (0, w.jsxs)(`div`, {
        className: `vortx-trade-controls__row`,
        children: [
          compact
            ? null
            : (0, w.jsx)(`span`, {
                className: `vortx-trade-filters__axis`,
                children: `Sort`,
              }),
          sorts.map(([id, label]) =>
            (0, w.jsx)(
              `button`,
              {
                type: `button`,
                onClick: () => onSort(id),
                className:
                  sort === id
                    ? `vortx-trade-filter vortx-trade-filter--active`
                    : `vortx-trade-filter`,
                children: label,
              },
              `${streamKey}-sort-${id}`,
            ),
          ),
        ],
      }),
      showSideFilter && chips.length > 1
        ? (0, w.jsxs)(`div`, {
            className: compact
              ? `vortx-trade-controls__signal vortx-trade-controls__signal--inline`
              : `vortx-trade-controls__signal`,
            children: [
              compact
                ? null
                : (0, w.jsx)(`p`, {
                    className: `vortx-trade-filters__axis`,
                    children: `Filter by action`,
                  }),
              (0, w.jsxs)(`div`, {
                className: `vortx-trade-filters__chips`,
                children: [
                  chips.map(([id, label]) => {
                    return (0, w.jsx)(
                      `button`,
                      {
                        type: `button`,
                        onClick: () => onSide(id),
                        className:
                          side === id
                            ? `vortx-trade-filter vortx-trade-filter--active`
                            : `vortx-trade-filter`,
                        children: label,
                      },
                      `${streamKey}-side-${id}`,
                    );
                  }),
                ],
              }),
            ],
          })
        : null,
      (0, w.jsx)(`label`, {
        className: `vortx-trade-controls__search`,
        children: (0, w.jsx)(`input`, {
          value: query,
          onChange: (e) => onQuery(e.target.value),
          placeholder: compact ? `Ticker` : `Search ticker or company`,
          'aria-label': `Search ticker or company`,
        }),
      }),
    ],
  });
}
function mostWatchedModule({
  scope: scope = `desk`,
  title: title,
  refreshKey: refreshKey = 0,
  onOpenWhale,
  onToggleWatch,
  starIds: starIds = [],
} = {}) {
  let q = c({
    queryKey: [`most-watched-names`, scope, refreshKey],
    queryFn: () => d(`/api/most-watched?scope=${encodeURIComponent(scope)}&limit=8`),
    staleTime: 5e3,
    refetchOnWindowFocus: !0,
    refetchOnMount: `always`,
  });
  let names = q.data?.names || [],
    heading = title || q.data?.title || `Most watched`,
    starSet = new Set((starIds || []).map((id) => String(id || ``))),
    overlap = names.filter((row) => row.entity_id && starSet.has(String(row.entity_id))).length;
  if (!names.length) return null;
  return (0, w.jsxs)(`aside`, {
    className: `vortx-most-watched glass-panel mt-6 rounded-2xl p-4`,
    children: [
      (0, w.jsx)(`p`, {
        className: `data-font text-[10px] uppercase tracking-[0.14em] text-soft`,
        children: heading,
      }),
      onToggleWatch
        ? (0, w.jsx)(`p`, {
            className: `vortx-most-watched__bridge`,
            children: overlap
              ? `${overlap} of these ${overlap === 1 ? `is` : `are`} already on your watchlist`
              : `Watch one. These names are moving on other desks this week.`,
          })
        : null,
      (0, w.jsx)(`ol`, {
        className: `vortx-most-watched__list mt-3`,
        children: names.map((row) => {
          let watched = row.entity_id && starSet.has(String(row.entity_id));
          return (0, w.jsxs)(
            `li`,
            {
              className: onOpenWhale && row.entity_id
                ? `vortx-most-watched__row vortx-most-watched__row--open`
                : `vortx-most-watched__row`,
              role: onOpenWhale && row.entity_id ? `button` : void 0,
              tabIndex: onOpenWhale && row.entity_id ? 0 : void 0,
              onClick:
                onOpenWhale && row.entity_id ? () => onOpenWhale(row.entity_id) : void 0,
              children: [
                (0, w.jsx)(`span`, {
                  className: `vortx-most-watched__rank`,
                  children: row.rank,
                }),
                (0, w.jsxs)(`span`, {
                  className: `vortx-most-watched__name`,
                  children: [
                    row.name,
                    row.ticker
                      ? (0, w.jsx)(`span`, {
                          className: `vortx-most-watched__ticker`,
                          children: row.ticker,
                        })
                      : null,
                  ],
                }),
                onToggleWatch && row.entity_id
                  ? (0, w.jsx)(`button`, {
                      type: `button`,
                      className: watched
                        ? `vortx-desk-watch-btn vortx-desk-watch-btn--on`
                        : `vortx-desk-watch-btn`,
                      onClick: (ev) => {
                        ev.stopPropagation();
                        void onToggleWatch(row.entity_id);
                      },
                      children: watched ? `Watching` : `Watch`,
                    })
                  : (0, w.jsxs)(`span`, {
                      className: `vortx-most-watched__count`,
                      children: [
                        Number(row.filings) > 0 ? `${row.filings} filings` : `On the tape`,
                      ],
                    }),
              ],
            },
            `${scope}-${row.entity_id}`,
          );
        }),
      }),
    ],
  });
}
const DESK_BOOT_KEY = `vortx:desk-boot-day`;
function deskBootDayStamp() {
  let d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, `0`)}-${String(d.getDate()).padStart(2, `0`)}`;
}
function deskBootForced() {
  if (typeof window > `u`) return null;
  let v = new URLSearchParams(window.location.search).get(`boot`);
  if (v === `1` || v === `force`) return !0;
  if (v === `0` || v === `skip`) return !1;
  return null;
}
function shouldPlayDeskBoot() {
  if (typeof window > `u`) return !1;
  if (window.matchMedia(`(prefers-reduced-motion: reduce)`).matches) return !1;
  let forced = deskBootForced();
  if (forced != null) return forced;
  try {
    return localStorage.getItem(DESK_BOOT_KEY) !== deskBootDayStamp();
  } catch {
    return !1;
  }
}
function markDeskBootPlayed() {
  try {
    localStorage.setItem(DESK_BOOT_KEY, deskBootDayStamp());
  } catch {}
}
function deskBootLines({ sources: sources = 0, filings: filings = 0 } = {}) {
  let lines = [`INITIALIZING FEED...`, `CONNECTING PUBLIC RECORDS...`];
  if (Number(sources) > 0) lines.push(`${Number(sources)} SOURCES ONLINE`);
  lines.push(`PARSING CONGRESS / INSIDER / FUND TRADES...`);
  if (Number(filings) > 0) lines.push(`${Number(filings)} TRADES IN THIS LIST`);
  lines.push(`RENDERING DESK...`);
  return lines;
}
function startDeskBoot({
  sources: sources = 0,
  filings: filings = 0,
  onDissolve: onDissolve,
  onGone: onGone,
} = {}) {
  let overlay = document.createElement(`div`);
  overlay.className = `vortx-desk-boot`;
  overlay.setAttribute(`role`, `dialog`);
  overlay.setAttribute(`aria-modal`, `true`);
  overlay.setAttribute(`aria-label`, `Opening My Desk`);
  let mc = document.createElement(`canvas`);
  mc.className = `vortx-desk-boot__matrix`;
  mc.setAttribute(`aria-hidden`, `true`);
  let wc = document.createElement(`canvas`);
  wc.className = `vortx-desk-boot__warp`;
  wc.setAttribute(`aria-hidden`, `true`);
  let textEl = document.createElement(`pre`);
  textEl.className = `vortx-desk-boot__text`;
  let skip = document.createElement(`button`);
  skip.type = `button`;
  skip.className = `vortx-desk-boot__skip`;
  skip.textContent = `Skip`;
  overlay.append(mc, wc, textEl, skip);
  document.body.appendChild(overlay);
  document.body.classList.add(`vortx-desk-boot-lock`);
  let mctx = mc.getContext(`2d`),
    wctx = wc.getContext(`2d`),
    glyphs = `01ｱｲｳｴｵｶｷｸｹｺVORTX$%`,
    fontSize = 15,
    columns = 0,
    drops = [],
    stars = [],
    matrixTimer = 0,
    warpTimer = 0,
    typeTimer = 0,
    gone = !1,
    dissolving = !1,
    marked = !1,
    lines = deskBootLines({ sources, filings }),
    li = 0,
    ci = 0,
    out = ``;
  function sizeCanvas(c) {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  }
  function initMatrix() {
    sizeCanvas(mc);
    columns = Math.max(1, Math.floor(mc.width / fontSize));
    drops = new Array(columns).fill(1);
  }
  function initStars() {
    sizeCanvas(wc);
    stars = [];
    for (let i = 0; i < 420; i++)
      stars.push({
        x: (Math.random() - 0.5) * wc.width,
        y: (Math.random() - 0.5) * wc.height,
        z: Math.random() * wc.width,
      });
  }
  function drawMatrix() {
    mctx.fillStyle = `rgba(0,0,0,0.08)`;
    mctx.fillRect(0, 0, mc.width, mc.height);
    mctx.fillStyle = `#00ff6a`;
    mctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    for (let i = 0; i < drops.length; i++) {
      mctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > mc.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }
  function drawWarp() {
    wctx.fillStyle = `rgba(0,0,0,0.35)`;
    wctx.fillRect(0, 0, wc.width, wc.height);
    let cx = wc.width / 2,
      cy = wc.height / 2;
    for (let s of stars) {
      s.z -= 26;
      if (s.z <= 0) s.z = wc.width;
      let k = 128 / s.z,
        sx = s.x * k + cx,
        sy = s.y * k + cy,
        px = s.x * (128 / (s.z + 26)) + cx,
        py = s.y * (128 / (s.z + 26)) + cy,
        size = (1 - s.z / wc.width) * 2.4;
      wctx.strokeStyle = `rgba(180,210,255,${1 - s.z / wc.width})`;
      wctx.lineWidth = size;
      wctx.beginPath();
      wctx.moveTo(px, py);
      wctx.lineTo(sx, sy);
      wctx.stroke();
    }
  }
  function paintText() {
    while (textEl.firstChild) textEl.removeChild(textEl.firstChild);
    textEl.appendChild(document.createTextNode(out + (lines[li] || ``).slice(0, ci)));
    let cursor = document.createElement(`span`);
    cursor.className = `vortx-desk-boot__cursor`;
    textEl.appendChild(cursor);
  }
  function finish(quick, fromCleanup) {
    if (gone) return;
    gone = !0;
    clearTimeout(typeTimer);
    window.removeEventListener(`resize`, onResize);
    window.removeEventListener(`keydown`, onKey);
    document.body.classList.remove(`vortx-desk-boot-lock`);
    if (!fromCleanup && !marked) {
      marked = !0;
      markDeskBootPlayed();
    }
    if (!dissolving) {
      dissolving = !0;
      onDissolve?.();
    }
    if (quick) {
      clearInterval(matrixTimer);
      clearInterval(warpTimer);
      overlay.remove();
      onGone?.();
      return;
    }
    overlay.classList.add(`vortx-desk-boot--out`);
    setTimeout(() => {
      clearInterval(matrixTimer);
      clearInterval(warpTimer);
      overlay.remove();
      onGone?.();
    }, 480);
  }
  function startWarp() {
    wc.classList.add(`vortx-desk-boot__warp--on`);
    mc.classList.add(`vortx-desk-boot__matrix--off`);
    textEl.classList.add(`vortx-desk-boot__text--off`);
    warpTimer = setInterval(drawWarp, 16);
    setTimeout(() => {
      if (gone) return;
      dissolving = !0;
      onDissolve?.();
      finish(!1);
    }, 700);
  }
  function typeBoot() {
    if (gone) return;
    if (li >= lines.length) {
      paintText();
      startWarp();
      return;
    }
    let line = lines[li];
    if (ci <= line.length) {
      paintText();
      ci++;
      typeTimer = setTimeout(typeBoot, 8);
    } else {
      out += `${line}\n`;
      li++;
      ci = 0;
      typeTimer = setTimeout(typeBoot, 70);
    }
  }
  function onResize() {
    initMatrix();
    initStars();
  }
  function onKey(e) {
    if (e.key === `Escape`) finish(!0);
  }
  skip.addEventListener(`click`, (e) => {
    e.stopPropagation();
    finish(!0);
  });
  overlay.addEventListener(`click`, (e) => {
    if (e.target === skip) return;
    finish(!0);
  });
  window.addEventListener(`resize`, onResize);
  window.addEventListener(`keydown`, onKey);
  initMatrix();
  initStars();
  matrixTimer = setInterval(drawMatrix, 45);
  typeTimer = setTimeout(typeBoot, 120);
  return {
    cleanup() {
      finish(!0, !0);
    },
  };
}
function deskLiveTicker({ events: events = [], variant: variant = `desk` } = {}) {
  let items = [],
    home = variant === `home`;
  for (let row of events || []) {
    let card = parseTradingCardFields(row),
      ticker = sanitizeTapeQuery(card.ticker);
    if (!ticker) continue;
    items.push({
      ticker,
      side: card.side,
      amt: card.amountLabel || ``,
    });
    if (items.length >= (home ? 24 : 20)) break;
  }
  if (!items.length) return null;
  let loop = items.concat(items),
    track = (0, w.jsx)(`div`, {
      className: `vortx-desk-ticker__track`,
      children: loop.map((item, i) =>
        (0, w.jsxs)(
          `span`,
          {
            className:
              item.side === `buy`
                ? `vortx-desk-ticker__item vortx-desk-ticker__item--buy`
                : item.side === `sell`
                  ? `vortx-desk-ticker__item vortx-desk-ticker__item--sell`
                  : `vortx-desk-ticker__item`,
            children: [
              item.ticker,
              ` `,
              item.side === `buy` ? `▲` : item.side === `sell` ? `▼` : `·`,
              item.amt ? ` ${item.amt}` : ``,
            ],
          },
          `${item.ticker}-${i}`,
        ),
      ),
    });
  return (0, w.jsxs)(`div`, {
    className: home ? `vortx-desk-ticker vortx-desk-ticker--home` : `vortx-desk-ticker`,
    "aria-label": home
      ? `Green up is a buy. Red down is a sell.`
      : `Live tape of today's trades`,
    children: home
      ? [track]
      : [
          (0, w.jsx)(`p`, {
            className: `vortx-desk-ticker__head`,
            children: `Live tape`,
          }),
          track,
        ],
  });
}
function le({ token: e, profile: t, onSession: n, previewEvents: previewEvents = [] }) {
  let [r, i] = (0, l.useState)(`watchlist_setup`),
    [a, o] = (0, l.useState)(``),
    [s, u] = (0, l.useState)(``),
    [deskErr, setDeskErr] = (0, l.useState)(``),
    [exportErr, setExportErr] = (0, l.useState)(``),
    [exportOk, setExportOk] = (0, l.useState)(``),
    [p, m] = (0, l.useState)(``),
    [helpOpen, setHelpOpen] = (0, l.useState)(!1),
    [onboardingOpen, setOnboardingOpen] = (0, l.useState)(null),
    [deskBucketFilter, setDeskBucketFilter] = (0, l.useState)(`all`),
    [deskQuery, setDeskQuery] = (0, l.useState)(``),
    [deskQueryDebounced, setDeskQueryDebounced] = (0, l.useState)(``),
    [watchlistOnly, setWatchlistOnly] = (0, l.useState)(() => {
      let prefs = readTradeListPrefs(`desk`);
      return prefs.watchedOnly == null ? !1 : Boolean(prefs.watchedOnly);
    }),
    [deskSort, setDeskSort] = (0, l.useState)(
      () => readTradeListPrefs(`desk`).sort || `recent`,
    ),
    [starIds, setStarIds] = (0, l.useState)([]),
    [starErr, setStarErr] = (0, l.useState)(``),
    [watchFlashId, setWatchFlashId] = (0, l.useState)(``),
    [expandedGroups, setExpandedGroups] = (0, l.useState)({}),
    [visibleLimit, setVisibleLimit] = (0, l.useState)(10),
    [bootHoldStats, setBootHoldStats] = (0, l.useState)(() => shouldPlayDeskBoot()),
    [bootLand, setBootLand] = (0, l.useState)(!1),
    deskUserKey = t?.user_id || `session`,
    h = c({
      queryKey: [`customer-dashboard`, e],
      queryFn: async () => {
        let data = await _(e);
        writeCachedDeskDashboard(data?.profile?.user_id || deskUserKey, data);
        return data;
      },
      enabled: !!e,
      retry: !1,
      placeholderData:
        readCachedDeskDashboard(deskUserKey) ||
        (Array.isArray(previewEvents) &&
        previewEvents.length &&
        (t?.role === `admin` ||
          t?.subscription_status === `active` ||
          t?.subscription_status === `trialing`)
          ? {
              ok: !0,
              profile: t || {},
              trading_feed: previewEvents,
              live_feed: previewEvents,
              watchlists: [],
              capabilities: {},
              locks: {},
              visit_summary: {},
              since_subscribed: {},
              alert_summary: { names_watched: 0 },
              service_summary: { recent_events: previewEvents.length, active_sources: 0 },
              desk_state: {},
            }
          : void 0),
      staleTime: 6e4,
    }),
    deskCoverageMap = useCoverageEnrich(h.data?.trading_feed || h.data?.live_feed || []);
  (0, l.useEffect)(() => {
    writeTradeListPrefs(`desk`, { watchedOnly: watchlistOnly, sort: deskSort });
  }, [watchlistOnly, deskSort]);
  (0, l.useEffect)(() => {
    if (!h.data?.profile?.user_id) return;
    let t = `vortx-desk-onboarding-${h.data.profile.user_id}`,
      n =
        typeof localStorage != `undefined` &&
        localStorage.getItem(t) === `1`,
      forceWatch =
        typeof window < `u` &&
        new URLSearchParams(window.location.search).get(`onboard`) === `watch`;
    setOnboardingOpen(
      forceWatch || (!n && Boolean(h.data?.desk_state?.show_onboarding_expanded)),
    );
  }, [h.data]);
  (0, l.useEffect)(() => {
    let t = setTimeout(() => setDeskQueryDebounced(deskQuery), 200);
    return () => clearTimeout(t);
  }, [deskQuery]);
  (0, l.useEffect)(() => {
    let userKey = h.data?.profile?.user_id || t?.user_id,
      n = watchlistEntityIdSet(h.data?.watchlists || []);
    if (n.size) {
      setStarIds([...n]);
      return;
    }
    if (userKey) setStarIds(readLocalDeskStars(userKey));
  }, [h.data, t?.user_id]);
  (0, l.useEffect)(() => {
    if (!h.data) return;
    if (watchlistOnly && !(starIds || []).length) setWatchlistOnly(!1);
  }, [h.data, watchlistOnly, starIds]);
  (0, l.useEffect)(() => {
    if (!e || h.error) {
      setBootHoldStats(!1);
      return;
    }
    if (!shouldPlayDeskBoot()) {
      setBootHoldStats(!1);
      return;
    }
    let handle = startDeskBoot({
      sources: Number(h.data?.service_summary?.active_sources) || 0,
      filings: (h.data?.trading_feed || h.data?.live_feed || []).length || 0,
      onDissolve: () => {
        setBootHoldStats(!1);
        setBootLand(!0);
      },
    });
    return () => handle.cleanup();
  }, [e, h.error]);
  if (!e)
    return (0, w.jsx)($, {
      title: `Sign in`,
      copy: `Sign in to see names, watch people, and get email alerts.`,
      targetView: `customer`,
      onSession: n,
    });
  if (h.isLoading && !h.data)
    return (0, w.jsxs)(`section`, {
      className: `vortx-page-section vortx-desk-page mx-auto max-w-6xl px-6 py-10`,
      "aria-busy": `true`,
      children: [
        (0, w.jsxs)(`div`, {
          className: `vortx-page-hero`,
          children: [
            (0, w.jsx)(`p`, { className: `eyebrow`, children: `Your desk` }),
            (0, w.jsx)(`h2`, {
              className: `display-font text-4xl text-ink`,
              children: `My Desk`,
            }),
            (0, w.jsx)(`p`, {
              className: `text-sm leading-6 text-muted`,
              children: `Loading watched names and today's trades.`,
            }),
          ],
        }),
        (0, w.jsxs)(`div`, {
          className: `vortx-desk-brief`,
          children: [
            (0, w.jsx)(`div`, {
              className: `vortx-desk-verdict vortx-desk-skel-card`,
              children: (0, w.jsx)(`span`, { className: `vortx-skel` }),
            }),
            (0, w.jsx)(`div`, {
              className: `vortx-desk-support vortx-desk-skel-card`,
              children: (0, w.jsx)(`span`, { className: `vortx-skel` }),
            }),
          ],
        }),
        (0, w.jsx)(`div`, {
          className: `vortx-desk-workspace`,
          children: (0, w.jsx)(tapeSkeleton, { rows: 8 }),
        }),
      ],
    });
  if (h.error) {
    if (t?.role === `admin`)
      return (0, w.jsxs)(`section`, {
        className: `vortx-page-section mx-auto max-w-4xl px-6 py-12`,
        children: [
          (0, w.jsxs)(`div`, {
            className: `vortx-page-hero`,
            children: [
              (0, w.jsx)(`p`, { className: `eyebrow`, children: `Admin account` }),
              (0, w.jsx)(`h2`, {
                className: `display-font text-4xl text-ink`,
                children: `Customer desk preview`,
              }),
              (0, w.jsx)(`p`, {
                className: `text-sm leading-6 text-muted`,
                children:
                  h.error instanceof Error
                    ? h.error.message
                    : `Dashboard data could not be loaded.`,
              }),
            ],
          }),
          (0, w.jsx)(`button`, {
            type: `button`,
            onClick: () => {
              window.location.assign(`/?view=admin`);
            },
            className: `mt-5 text-sm text-terminal-blue underline underline-offset-4`,
            children: `Open Admin console`,
          }),
        ],
      });
    return (0, w.jsxs)(`section`, {
      className: `mx-auto max-w-4xl px-6 py-12`,
      children: [
        (0, w.jsxs)(`div`, {
          className: `glass-panel rounded-3xl p-6`,
          children: [
            (0, w.jsx)(`p`, {
              className: `eyebrow`,
              children: `Subscription required`,
            }),
            (0, w.jsx)(`h2`, {
              className: `display-font mt-3 text-3xl text-ink`,
              children: `See the names on your desk`,
            }),
            (0, w.jsx)(`p`, {
              className: `mt-3 text-sm leading-6 text-muted`,
              children:
                h.error instanceof Error
                  ? h.error.message
                  : `An active plan shows the person behind each trade, plus watchlists and email alerts.`,
            }),
            (0, w.jsx)(`button`, {
              type: `button`,
              onClick: () => {
                window.location.assign(`/?view=pricing&plan=nebula`);
              },
              className: `terminal-button-solid mt-5 rounded-xl px-5 py-3 text-sm font-semibold`,
              children: primaryUnlockCta(),
            }),
          ],
        }),
      ],
    });
  }
  let g = h.data,
    x = t?.role === `admin`,
    k = g?.locks || {},
    cap = g?.capabilities || {},
    feed = Array.isArray(g?.live_feed) ? g.live_feed : [],
    tradingFeed = Array.isArray(g?.trading_feed) && g.trading_feed.length
      ? g.trading_feed
      : feed.filter((row) => isTradingDeskEvent(row)),
    deskFeed = tradingFeed,
    visit = g?.visit_summary || {},
    sinceSub = g?.since_subscribed || {},
    showOnboarding = onboardingOpen === !0,
    canExport = Boolean(cap.csvExport || x),
    metricCounts = deskMetricCounts(deskFeed),
    starSet = new Set(starIds),
    effectiveWatchlistOnly = Boolean(watchlistOnly && starSet.size),
    filteredDesk = filterDeskEvents({
      events: deskFeed,
      bucket: deskBucketFilter,
      query: deskQueryDebounced,
      watchlistIds: starSet,
      watchlistOnly: effectiveWatchlistOnly,
    }),
    deskGroups = sortDeskGroups(groupDeskEntities(filteredDesk), deskSort),
    deskSections = (() => {
      let shown = 0,
        sections = [],
        early = [],
        rest = [];
      for (let group of deskGroups) {
        let hit = (group.events || []).some((ev) =>
          youWereEarlyLabel(mergeCoverageOntoEvent(ev, deskCoverageMap)),
        );
        if (hit) early.push(group);
        else rest.push(group);
      }
      let ordered = [];
      if (early.length) ordered.push({ id: `early`, label: `Beat the news`, groups: early });
      ordered.push(...groupDeskByRecency(rest));
      for (let section of ordered) {
        let keep = [];
        for (let group of section.groups) {
          if (shown >= visibleLimit) break;
          keep.push(group);
          shown += 1;
        }
        if (keep.length) sections.push({ ...section, groups: keep });
      }
      return sections;
    })(),
    watchSuggest = pickDeskWatchSuggest(deskGroups, starSet),
    watchSuggestList = pickDeskWatchSuggestList(deskGroups, starSet, 6),
    heroPicks = watchSuggestList.slice(0, 4),
    alertSummary = g?.alert_summary || {},
    svc = g?.service_summary || {},
    sinceLabel = sinceSub?.label || `filings before public news`,
    sinceValue = Number(sinceSub?.value) || 0,
    pastDue = String(t?.subscription_status || ``).toLowerCase() === `past_due`,
    watchedNew = Number(alertSummary.watched_new_filings) || 0,
    namesWatchedCount = Number(alertSummary.names_watched ?? starSet.size) || 0,
    monthStartMs = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime(),
    earlyEvents = (deskFeed || []).map((row) => mergeCoverageOntoEvent(row, deskCoverageMap)),
    earlyThisMonth = countBeatenTheNews(earlyEvents, { monthStartMs }),
    earlyAll = countBeatenTheNews(earlyEvents),
    beatIsMonth = earlyThisMonth > 0,
    beatCount = beatIsMonth ? earlyThisMonth : earlyAll,
    insiderWorth = metricCounts.insider || 0,
    deskHero = beatCount > 0
      ? {
          kicker: `Beat the news`,
          value: beatCount,
          label: beatCount === 1
            ? beatIsMonth
              ? `You've beaten the news once this month`
              : `You've beaten the news once on this desk`
            : beatIsMonth
              ? `You've beaten the news this month`
              : `You've beaten the news on this desk`,
          hint: `Vortx had these filings before mainstream coverage. Those rows are pinned at the top.`,
          action: `early`,
        }
      : {
          kicker: `Today's tape`,
          value: deskFeed.length,
          label: insiderWorth
            ? `${deskFeed.length} filings · ${insiderWorth} insider${insiderWorth === 1 ? `` : `s`} worth watching`
            : `${deskFeed.length} filings on the live list`,
          hint: starSet.size
            ? `Your watchlist is quiet. Add a few names from what's moving.`
            : `Watch a few names so the next filing hits this desk and your inbox.`,
          action: `watch`,
        };
  function dismissOnboarding() {
    let t = g?.profile?.user_id;
    (t &&
      typeof localStorage != `undefined` &&
      localStorage.setItem(`vortx-desk-onboarding-${t}`, `1`),
      setOnboardingOpen(!1));
  }
  function dismissWatchPicker() {
    try {
      if (typeof sessionStorage != `undefined`) {
        if (!sessionStorage.getItem(`vortx_watch_skip_confirm`)) {
          if (!window.confirm(`Skip watching for now? You can still star names on any trade card.`))
            return;
          sessionStorage.setItem(`vortx_watch_skip_confirm`, `1`);
        }
      }
    } catch {}
    dismissOnboarding();
  }
  async function openBillingPortal() {
    trackMarketingStep(`billing_portal_click`, pastDue ? `past_due` : `manage`);
    try {
      let res = await fetch(`/api/stripe-billing-portal`, {
        method: `POST`,
        headers: {
          authorization: `Bearer ${e}`,
          'content-type': `application/json`,
        },
        body: JSON.stringify({}),
      });
      let payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.url) {
        throw Error(
          payload.message ||
            `Billing portal unavailable. If this keeps failing, enable Customer Portal in Stripe Dashboard.`,
        );
      }
      window.location.assign(payload.url);
    } catch (err) {
      setExportErr(
        err instanceof Error
          ? err.message
          : `Billing portal unavailable. Enable Customer Portal in Stripe Dashboard.`,
      );
    }
  }
  async function copyTrade(event) {
    let text = formatCopySignal(event);
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        let el = document.createElement(`textarea`);
        ((el.value = text),
          document.body.appendChild(el),
          el.select(),
          document.execCommand(`copy`),
          el.remove());
      }
      setExportOk(`Trade copied.`);
      setExportErr(``);
    } catch {
      setExportErr(`Copy failed.`);
    }
  }
  async function toggleStar(entityId) {
    let id = String(entityId || ``).trim();
    if (!id) return;
    setStarErr(``);
    let userKey = g?.profile?.user_id || t?.user_id;
    let wasStarred = starSet.has(id);
    try {
      let res = await fetch(`/api/customer/watchlist-star`, {
        method: `POST`,
        headers: {
          authorization: `Bearer ${e}`,
          'content-type': `application/json`,
        },
        body: JSON.stringify({ entity_id: id }),
      });
      let payload = await res.json().catch(() => ({}));
      if (!res.ok) throw Error(payload.message || payload.error || `Watch failed.`);
      let next = Array.isArray(payload.member_entity_ids)
        ? payload.member_entity_ids.map((e) => String(e || ``).trim()).filter(Boolean)
        : payload.starred
          ? [...new Set([...starIds, id])]
          : starIds.filter((e) => e !== id);
      setStarIds(next);
      writeLocalDeskStars(userKey, next);
      if (payload.starred || next.includes(id)) {
        if (!wasStarred) trackMarketingStepOnce(`first_watch`, `first_watch`, `desk`);
        setWatchFlashId(id);
        setTimeout(() => setWatchFlashId(``), 1600);
      }
      setExportOk(
        payload.watch_label ||
          payload.message ||
          (payload.starred
            ? `Watching. We email you when this name files again.`
            : `Removed from watchlist.`),
      );
      setExportErr(``);
      await h.refetch();
    } catch (err) {
      let next = starSet.has(id) ? starIds.filter((e) => e !== id) : [...starIds, id];
      setStarIds(next);
      writeLocalDeskStars(userKey, next);
      if (next.includes(id)) {
        if (!wasStarred) trackMarketingStepOnce(`first_watch`, `first_watch`, `desk_local`);
        setWatchFlashId(id);
        setTimeout(() => setWatchFlashId(``), 1600);
      }
      setStarErr(
        err instanceof Error
          ? `${err.message} (saved locally until sync works)`
          : `Watch saved locally until sync works.`,
      );
    }
  }
  async function v() {
    (setDeskErr(``), m(``));
    try {
      (await b(e, { request_type: r, subject: a, details: s }),
        o(``),
        u(``),
        m(`Request sent. We'll follow up by email.`),
        await h.refetch());
    } catch (e) {
      setDeskErr(e instanceof Error ? e.message : `Request failed.`);
    }
  }
  async function y(format) {
    if (!canExport) {
      window.location.assign(`/?view=pricing`);
      return;
    }
    (setExportErr(``), setExportOk(``));
    try {
      let qs = format === `json` ? `?format=json` : ``,
        t = await fetch(`/api/customer/export${qs}`, {
          headers: { authorization: `Bearer ${e}` },
        });
      if (!t.ok) {
        let e = await t.json();
        throw Error(e.message || e.error || `Export failed.`);
      }
      let n = await t.blob(),
        r = URL.createObjectURL(n),
        i = document.createElement(`a`);
      ((i.href = r),
        (i.download = format === `json` ? `vortxmkt-events.json` : `vortxmkt-events.csv`),
        i.click(),
        URL.revokeObjectURL(r),
        setExportOk(
          format === `json`
            ? `JSON downloaded with entity names, evidence URLs, and recommended actions.`
            : `CSV downloaded with entity names, evidence URLs, and recommended actions.`,
        ));
    } catch (e) {
      setExportErr(e instanceof Error ? e.message : `Export failed.`);
    }
  }
  let metricDefs = [
    { id: `all`, label: `All`, count: metricCounts.all },
    { id: `insider`, label: `Insider`, count: metricCounts.insider },
    { id: `congress`, label: `Congress`, count: metricCounts.congress },
    { id: `institutional`, label: `13F`, count: metricCounts.institutional },
  ],
    deskLandI = 0;
  return (0, w.jsxs)(`section`, {
    className: `vortx-page-section vortx-desk-page mx-auto max-w-6xl px-6 py-10`,
    children: [
      (0, w.jsxs)(`div`, {
        className: `vortx-page-hero`,
        children: [
          (0, w.jsx)(`p`, { className: `eyebrow`, children: g?.desk_state?.is_returning ? `Welcome back` : `Your desk` }),
          (0, w.jsxs)(`div`, {
            className: `flex w-full flex-wrap items-end justify-between gap-3`,
            children: [
              (0, w.jsx)(`h2`, {
                className: `display-font text-5xl text-ink`,
                children: `My Desk`,
              }),
              (0, w.jsx)(`button`, {
                type: `button`,
                onClick: () => void openBillingPortal(),
                className: `vortx-desk-billing`,
                children: pastDue ? `Update payment` : `Manage billing`,
              }),
            ],
          }),
          (0, w.jsx)(`p`, {
            className: `vortx-desk-hero__sub`,
            children: `Public-record research only. Not trading advice.`,
          }),
        ],
      }),
      pastDue
        ? (0, w.jsx)(`p`, {
            className: `mt-3 max-w-3xl rounded-xl border border-terminal-amber/40 bg-terminal-amber/10 px-3 py-2 text-sm text-ink`,
            children: `Payment past due. Update billing to keep watch alerts flowing.`,
          })
        : null,
      (0, w.jsxs)(`div`, {
        className: `vortx-desk-brief`,
        children: [
          (0, w.jsxs)(`article`, {
            className:
              deskHero.action === `early`
                ? `vortx-desk-verdict vortx-desk-verdict--early`
                : `vortx-desk-verdict`,
            children: [
              (0, w.jsx)(`p`, {
                className: `vortx-desk-verdict__kicker`,
                children: deskHero.kicker,
              }),
              (0, w.jsx)(AnimatedStatValue, {
                value: deskHero.value,
                className: `vortx-desk-verdict__value`,
                hold: bootHoldStats,
              }),
              (0, w.jsx)(`p`, {
                className: `vortx-desk-verdict__label`,
                children: deskHero.label,
              }),
              (0, w.jsx)(`p`, {
                className: `vortx-desk-verdict__hint`,
                children: deskHero.hint,
              }),
              deskHero.action === `early`
                ? (0, w.jsx)(`button`, {
                    type: `button`,
                    className: `vortx-desk-verdict__action`,
                    onClick: () =>
                      document.getElementById(`desk-beat-the-news`)?.scrollIntoView({
                        behavior: `smooth`,
                        block: `start`,
                      }),
                    children: `See those filings`,
                  })
                : heroPicks.length
                  ? (0, w.jsx)(`div`, {
                      className: `vortx-desk-verdict__picks`,
                      children: heroPicks.map((row) =>
                        (0, w.jsx)(
                          `button`,
                          {
                            type: `button`,
                            className: `vortx-desk-watch-btn`,
                            onClick: () => void toggleStar(row.entityId),
                            children: row.ticker
                              ? `Watch ${row.entityName} (${row.ticker})`
                              : `Watch ${row.entityName}`,
                          },
                          row.entityId,
                        ),
                      ),
                    })
                  : watchSuggest
                    ? (0, w.jsx)(`button`, {
                        type: `button`,
                        className: `vortx-desk-verdict__action`,
                        onClick: () => void toggleStar(watchSuggest.entityId),
                        children: `Watch ${watchSuggest.entityName}`,
                      })
                    : null,
            ],
          }),
          (0, w.jsxs)(`div`, {
            className: `vortx-desk-support`,
            children: [
              (0, w.jsxs)(`div`, {
                className: `vortx-desk-support__item`,
                children: [
                  (0, w.jsx)(AnimatedStatValue, {
                    value: sinceValue,
                    className: `vortx-desk-support__value`,
                    hold: bootHoldStats,
                  }),
                  (0, w.jsx)(`p`, {
                    className: `vortx-desk-support__label`,
                    children: sinceLabel,
                  }),
                ],
              }),
              (0, w.jsxs)(`div`, {
                className: `vortx-desk-support__item`,
                children: [
                  (0, w.jsx)(AnimatedStatValue, {
                    value: svc.recent_events ?? deskFeed.length,
                    className: `vortx-desk-support__value`,
                    hold: bootHoldStats,
                  }),
                  (0, w.jsx)(`p`, {
                    className: `vortx-desk-support__label`,
                    children: `in this refresh`,
                  }),
                ],
              }),
              (0, w.jsxs)(`div`, {
                className: `vortx-desk-support__item`,
                children: [
                  (0, w.jsx)(AnimatedStatValue, {
                    value: namesWatchedCount,
                    className: `vortx-desk-support__value`,
                    hold: bootHoldStats,
                  }),
                  (0, w.jsx)(`p`, {
                    className: `vortx-desk-support__label`,
                    children: `watched`,
                  }),
                ],
              }),
              (0, w.jsxs)(`div`, {
                className: `vortx-desk-support__item`,
                children: [
                  (0, w.jsx)(AnimatedStatValue, {
                    value: svc.active_sources ?? 0,
                    className: `vortx-desk-support__value`,
                    hold: bootHoldStats,
                  }),
                  (0, w.jsx)(`p`, {
                    className: `vortx-desk-support__label`,
                    children: `sources`,
                  }),
                ],
              }),
              alertSummary?.last_alert_at
                ? (0, w.jsx)(`p`, {
                    className: `vortx-desk-brief__meta`,
                    children: `Last emailed ${new Date(alertSummary.last_alert_at).toLocaleDateString()} · ${alertSummary.sent_this_month || 0} this month`,
                  })
                : (0, w.jsx)(`p`, {
                    className: `vortx-desk-brief__meta`,
                    children: `Watch a name to start email alerts.`,
                  }),
            ],
          }),
        ],
      }),
      (0, w.jsxs)(`div`, {
        className: `vortx-desk-workspace`,
        children: [
      (0, w.jsx)(`aside`, {
        className: `vortx-desk-rail`,
        children: (0, w.jsx)(mostWatchedModule, {
          scope: `desk`,
          title: `Worth watching this week`,
          refreshKey: starIds.length,
          onToggleWatch: toggleStar,
          starIds,
        }),
      }),
      (t?.plan === `scout` || t?.plan === `sentinel`) && k.entity_names
        ? (0, w.jsx)(scoutSentinelUpgradePanel, { plan: t.plan })
        : null,
      x
        ? (0, w.jsx)(`div`, {
            className: `glass-panel mt-5 rounded-2xl border border-terminal-green/35 p-4`,
            children: (0, w.jsx)(`p`, {
              className: `text-sm text-terminal-green`,
              children: `Admin preview · full unlock on this desk.`,
            }),
          })
        : null,
      (0, w.jsxs)(`div`, {
        className: `vortx-desk-terminal`,
        children: [
          (0, w.jsxs)(`div`, {
            className: `vortx-desk-terminal__header`,
            children: [
              (0, w.jsxs)(`div`, {
                className: `vortx-desk-terminal__title-row`,
                children: [
                  (0, w.jsxs)(`div`, {
                    children: [
                      (0, w.jsx)(`p`, {
                        className: `vortx-desk-terminal__sys`,
                        children: `SYS // LIVE TAPE`,
                      }),
                      (0, w.jsx)(`h3`, {
                        className: `vortx-desk-terminal__title`,
                        children: `Today's trades`,
                      }),
                    ],
                  }),
                  (0, w.jsx)(`span`, {
                    className: `vortx-desk-terminal__plan`,
                    children: g?.entitlement?.label || t?.plan || `locked`,
                  }),
                ],
              }),
              (0, w.jsx)(deskLiveTicker, { events: deskFeed }),
              (0, w.jsx)(`label`, {
                className: `vortx-desk-terminal__search-wrap`,
                children: (0, w.jsx)(`input`, {
                  className: `vortx-desk-terminal__search`,
                  value: deskQuery,
                  onChange: (e) => {
                    setDeskQuery(e.target.value);
                    setVisibleLimit(10);
                  },
                  placeholder: `Search ticker, lawmaker, insider, or fund`,
                  'aria-label': `Search trades`,
                }),
              }),
            ],
          }),
          (0, w.jsx)(`div`, {
            className: `vortx-desk-terminal__metrics`,
            children: metricDefs.map((m) =>
              (0, w.jsxs)(
                `button`,
                {
                  type: `button`,
                  className:
                    deskBucketFilter === m.id
                      ? `vortx-desk-metric vortx-desk-metric--active`
                      : `vortx-desk-metric`,
                  onClick: () => {
                    setDeskBucketFilter(m.id);
                    setVisibleLimit(10);
                  },
                  children: [
                    (0, w.jsx)(`span`, {
                      className: `vortx-desk-metric__label`,
                      children: m.label,
                    }),
                    (0, w.jsx)(`span`, {
                      className: `vortx-desk-metric__count`,
                      children: m.count,
                    }),
                  ],
                },
                m.id,
              ),
            ),
          }),
          (0, w.jsxs)(`div`, {
            className: `vortx-desk-terminal__toolbar`,
            children: [
              (0, w.jsxs)(`div`, {
                className: `vortx-desk-terminal__watch-tools`,
                children: [
                  (0, w.jsxs)(`label`, {
                    className: `vortx-desk-terminal__watch-toggle`,
                    children: [
                      (0, w.jsx)(`input`, {
                        type: `checkbox`,
                        checked: watchlistOnly,
                        onChange: (e) => {
                          setWatchlistOnly(e.target.checked);
                          setVisibleLimit(10);
                        },
                      }),
                      (0, w.jsx)(`span`, { children: `Watchlist only` }),
                    ],
                  }),
                  (0, w.jsx)(`button`, {
                    type: `button`,
                    className: watchlistOnly
                      ? `vortx-trade-filter vortx-trade-filter--active`
                      : `vortx-trade-filter`,
                    onClick: () => {
                      setWatchlistOnly((v) => !v);
                      setVisibleLimit(10);
                    },
                    children: `Watched only`,
                  }),
                ],
              }),
              (0, w.jsxs)(`div`, {
                className: `vortx-trade-controls__row`,
                children: [
                  (0, w.jsx)(`span`, {
                    className: `data-font text-[10px] uppercase tracking-wide text-soft`,
                    children: `Sort`,
                  }),
                  [
                    [`recent`, `Most recent`],
                    [`amount`, `Highest $`],
                    [`severity`, `Biggest / most serious`],
                  ].map(([id, label]) =>
                    (0, w.jsx)(
                      `button`,
                      {
                        type: `button`,
                        onClick: () => {
                          setDeskSort(id);
                          setVisibleLimit(10);
                        },
                        className:
                          deskSort === id
                            ? `vortx-trade-filter vortx-trade-filter--active`
                            : `vortx-trade-filter`,
                        children: label,
                      },
                      `desk-sort-${id}`,
                    ),
                  ),
                ],
              }),
              (0, w.jsx)(`p`, {
                className: `vortx-desk-terminal__hint`,
                children: `Watch a name to get an email when they file again.`,
              }),
            ],
          }),
          exportErr
            ? (0, w.jsx)(`p`, {
                className: `vortx-desk-terminal__err`,
                children: exportErr,
              })
            : null,
          exportOk
            ? (0, w.jsx)(`p`, {
                className: `vortx-desk-terminal__ok`,
                children: exportOk,
              })
            : null,
          starErr
            ? (0, w.jsx)(`p`, {
                className: `vortx-desk-terminal__err`,
                children: starErr,
              })
            : null,
          (showOnboarding || starIds.length === 0) && watchSuggestList.length
            ? (0, w.jsxs)(`div`, {
                className: `vortx-desk-watch-suggest`,
                children: [
                  (0, w.jsxs)(`div`, {
                    className: `flex flex-wrap items-start justify-between gap-3`,
                    children: [
                      (0, w.jsxs)(`div`, {
                        children: [
                          (0, w.jsx)(`p`, {
                            className: `vortx-desk-watch-suggest__eyebrow`,
                            children: `One-tap Watch`,
                          }),
                          (0, w.jsx)(`p`, {
                            className: `vortx-desk-watch-suggest__copy`,
                            children: `Pick someone from today's tape. We email you when they file again.`,
                          }),
                        ],
                      }),
                      (0, w.jsx)(`button`, {
                        type: `button`,
                        className: `vortx-desk-terminal__link`,
                        onClick: dismissWatchPicker,
                        children: `Skip for now`,
                      }),
                    ],
                  }),
                  (0, w.jsx)(`div`, {
                    className: `vortx-desk-watch-suggest__grid mt-3 flex flex-wrap gap-2`,
                    children: watchSuggestList.map((row) =>
                      (0, w.jsx)(
                        `button`,
                        {
                          type: `button`,
                          className: `vortx-desk-watch-btn`,
                          onClick: () => {
                            trackMarketingStep(`watch_suggest_click`, row.eventType || `desk`);
                            void toggleStar(row.entityId);
                            dismissOnboarding();
                          },
                          children: row.ticker
                            ? `Watch ${row.entityName} (${row.ticker})`
                            : `Watch ${row.entityName}`,
                        },
                        row.entityId,
                      ),
                    ),
                  }),
                ],
              })
            : null,
          showOnboarding && !(watchSuggestList.length && starIds.length === 0)
            ? (0, w.jsxs)(`div`, {
                className: `vortx-desk-terminal__guide`,
                children: [
                  (0, w.jsxs)(`div`, {
                    className: `flex flex-wrap items-center justify-between gap-3`,
                    children: [
                      (0, w.jsx)(`p`, {
                        className: `vortx-desk-terminal__eyebrow`,
                        children: `Quick start`,
                      }),
                      (0, w.jsx)(`button`, {
                        type: `button`,
                        onClick: dismissOnboarding,
                        className: `vortx-desk-terminal__link`,
                        children: `Dismiss`,
                      }),
                    ],
                  }),
                  (0, w.jsxs)(`ol`, {
                    className: `vortx-desk-terminal__steps`,
                    children: [
                      (0, w.jsx)(`li`, {
                        children: `Scan buy/sell, ticker, and amount on each trade.`,
                      }),
                      (0, w.jsx)(`li`, {
                        children: `Tap Watch on one lawmaker, insider, or fund.`,
                      }),
                      (0, w.jsx)(`li`, {
                        children: `We'll surface their next filing here.`,
                      }),
                    ],
                  }),
                ],
              })
            : null,
          (0, w.jsxs)(`div`, {
            className: `vortx-desk-terminal__docket`,
            children: [
              (0, w.jsxs)(`div`, {
                className: `vortx-desk-terminal__docket-head`,
                children: [
                  (0, w.jsx)(`h4`, { children: `Trades` }),
                  (0, w.jsxs)(`p`, {
                    children: [
                      deskGroups.length,
                      ` name`,
                      deskGroups.length === 1 ? `` : `s`,
                      ` · `,
                      filteredDesk.length,
                      ` trade`,
                      filteredDesk.length === 1 ? `` : `s`,
                    ],
                  }),
                  (0, w.jsx)(`p`, {
                    className: `vortx-desk-copy-guide`,
                    children: `Copy trade (on Beat the news rows) copies name, ticker, and date to your clipboard. It does not place an order. Research only.`,
                  }),
                ],
              }),
              deskSections.length
                ? (0, w.jsx)(`div`, {
                    className: `vortx-desk-terminal__cards`,
                    children: deskSections.map((section) =>
                      (0, w.jsxs)(
                        `div`,
                        {
                          className: `vortx-desk-section`,
                          id: section.id === `early` ? `desk-beat-the-news` : void 0,
                          children: [
                            (0, w.jsx)(`h5`, {
                              className: `vortx-desk-section__label`,
                              children: section.label,
                            }),
                            section.groups.map((group) => {
                      let key = group.entityId || group.entityName,
                        open = expandedGroups[key] === !0,
                        starred = group.entityId ? starSet.has(group.entityId) : !1,
                        flash = group.entityId && watchFlashId === group.entityId,
                        top = mergeCoverageOntoEvent(group.events[0], deskCoverageMap),
                        card = top ? parseTradingCardFields(top) : null,
                        early = youWereEarlyBadge(top),
                        isEarly = Boolean(early),
                        landI = deskLandI++,
                        sideClass =
                          card?.side === `buy`
                            ? `vortx-desk-card__side vortx-desk-card__side--buy`
                            : card?.side === `sell`
                              ? `vortx-desk-card__side vortx-desk-card__side--sell`
                              : `vortx-desk-card__side`;
                      return (0, w.jsxs)(
                        `article`,
                        {
                          className: [
                            `vortx-desk-card`,
                            group.isComposite ? `vortx-desk-card--composite` : ``,
                            isEarly ? `vortx-desk-card--early` : ``,
                            bootLand ? `vortx-desk-card--land` : ``,
                            bootLand && card?.side === `sell` ? `vortx-desk-card--land-sell` : ``,
                          ]
                            .filter(Boolean)
                            .join(` `),
                          style: bootLand ? { [`--land-i`]: landI } : void 0,
                          children: [
                            (0, w.jsxs)(`div`, {
                              className: `vortx-desk-card__head`,
                              children: [
                                (0, w.jsx)(FilerFace, {
                                  name: card?.filerName || group.entityName || ``,
                                  type: card?.type || ``,
                                  locked: Boolean(card?.filerLocked),
                                  issuer: card?.issuer || ``,
                                  ticker: card?.ticker || ``,
                                  seed: group.entityId || ``,
                                  size: `sm`,
                                }),
                                (0, w.jsxs)(`div`, {
                                  className: `min-w-0 flex-1`,
                                  children: [
                                    (0, w.jsxs)(`div`, {
                                      className: `vortx-desk-card__name-row`,
                                      children: [
                                        (0, w.jsx)(`p`, {
                                          className: `vortx-desk-card__name`,
                                          children: formatFilerDisplayName(
                                            card?.filerName || group.entityName || `Trader`,
                                            card?.type,
                                          ),
                                        }),
                                        (0, w.jsx)(`span`, {
                                          className: `vortx-desk-card__chip`,
                                          children:
                                            card?.roleLabel ||
                                            deskBucketLabel(group.buckets?.[0]),
                                        }),
                                      ],
                                    }),
                                    early,
                                    (0, w.jsxs)(`div`, {
                                      className: `vortx-desk-card__trade-row`,
                                      children: [
                                        card?.actionLabel
                                          ? (0, w.jsx)(`span`, {
                                              className: sideClass,
                                              children: card.actionLabel,
                                            })
                                          : null,
                                        card?.ticker
                                          ? (0, w.jsxs)(`span`, {
                                              className: `vortx-ticker-pair`,
                                              children: [
                                                (0, w.jsx)(LiveQuoteLinks, {
                                                  ticker: card.ticker,
                                                  compact: !0,
                                                  className: `vortx-desk-card__ticker vortx-ticker-link`,
                                                  children: sanitizeTapeQuery(card.ticker) || card.ticker,
                                                }),
                                                (0, w.jsx)(LiveQuoteLinks, {
                                                  ticker: card.ticker,
                                                  compact: !0,
                                                }),
                                              ],
                                            })
                                          : card?.type === `congress_trade` ||
                                              card?.type === `institutional_13f`
                                            ? (0, w.jsx)(TapeNextAction, { card, row: top })
                                            : null,
                                        card?.amountLabel
                                          ? (0, w.jsx)(`span`, {
                                              className: `vortx-desk-card__amount`,
                                              children: card.amountLabel,
                                            })
                                          : null,
                                        (0, w.jsx)(`span`, {
                                          className: `vortx-desk-card__date`,
                                          children: card?.filingDate || `Date pending`,
                                        }),
                                      ],
                                    }),
                                    card?.showCompany && card?.issuer
                                      ? (0, w.jsx)(`p`, {
                                          className: `vortx-desk-card__issuer`,
                                          children: card.issuer,
                                        })
                                      : null,
                                  ],
                                }),
                                (0, w.jsx)(`button`, {
                                  type: `button`,
                                  className: [
                                    `vortx-desk-watch-btn`,
                                    starred ? `vortx-desk-watch-btn--on` : ``,
                                    flash ? `vortx-desk-watch-btn--flash` : ``,
                                  ]
                                    .filter(Boolean)
                                    .join(` `),
                                  disabled: !group.entityId,
                                  onClick: () => void toggleStar(group.entityId),
                                  'aria-label': starred
                                    ? `Remove from watchlist`
                                    : `Watch this person`,
                                  children: flash
                                    ? `Watching ✓`
                                    : starred
                                      ? `Watching ✓`
                                      : `Watch`,
                                }),
                              ],
                            }),
                            open
                              ? (0, w.jsx)(`div`, {
                                  className: `vortx-desk-card__timeline`,
                                  children: group.events.map((ev) => {
                                    let ec = parseTradingCardFields(ev);
                                    return (0, w.jsxs)(
                                      `div`,
                                      {
                                        className: `vortx-desk-card__event`,
                                        children: [
                                          (0, w.jsxs)(`p`, {
                                            className: `vortx-desk-card__event-title`,
                                            children: [
                                              ec.actionLabel || `Trade`,
                                              ec.ticker ? ` ${ec.ticker}` : ``,
                                              ec.amountLabel
                                                ? ` · ${ec.amountLabel}`
                                                : ``,
                                            ],
                                          }),
                                          (0, w.jsx)(`p`, {
                                            className: `vortx-desk-card__event-meta`,
                                            children: [
                                              ec.roleLabel,
                                              ` · `,
                                              ec.filingDate || `Date pending`,
                                            ].join(``),
                                          }),
                                        ],
                                      },
                                      ev.id,
                                    );
                                  }),
                                })
                              : null,
                            group.events.length > 1 || top
                              ? (0, w.jsxs)(`div`, {
                                  className: `vortx-desk-card__actions`,
                                  children: [
                                    group.events.length > 1
                                      ? (0, w.jsx)(`button`, {
                                          type: `button`,
                                          className: `vortx-desk-terminal__link`,
                                          onClick: () =>
                                            setExpandedGroups((prev) => ({
                                              ...prev,
                                              [key]: !open,
                                            })),
                                          children: open
                                            ? `Hide filings`
                                            : `More filings (${group.events.length})`,
                                        })
                                      : null,
                                    isEarly && top
                                      ? (0, w.jsx)(`button`, {
                                          type: `button`,
                                          className: `vortx-desk-terminal__link vortx-desk-terminal__link--muted`,
                                          title: `Copies this filing to your clipboard. Does not place an order.`,
                                          onClick: () => void copyTrade(top),
                                          children: `Copy trade`,
                                        })
                                      : null,
                                  ],
                                })
                              : null,
                          ],
                        },
                        key,
                      );
                            }),
                          ],
                        },
                        section.id,
                      ),
                    ),
                  })
                : (0, w.jsx)(`div`, {
                    className: `vortx-desk-empty`,
                    children: effectiveWatchlistOnly
                      ? (0, w.jsxs)(w.Fragment, {
                          children: [
                            (0, w.jsx)(`p`, {
                              className: `vortx-desk-empty__title`,
                              children: `No watched names match`,
                            }),
                            (0, w.jsx)(`p`, {
                              className: `vortx-desk-empty__copy`,
                              children: watchSuggest
                                ? `Watch ${watchSuggest.entityName} to get their next filing, or turn off Watchlist only.`
                                : `Watch a person on today's trades, then filter to your list.`,
                            }),
                            watchSuggest
                              ? (0, w.jsx)(`button`, {
                                  type: `button`,
                                  className: `vortx-desk-watch-btn`,
                                  onClick: () => void toggleStar(watchSuggest.entityId),
                                  children: `Watch ${watchSuggest.entityName}`,
                                })
                              : null,
                          ],
                        })
                      : visit.quiet &&
                          deskBucketFilter === `all` &&
                          !deskQueryDebounced
                        ? (0, w.jsxs)(w.Fragment, {
                            children: [
                              (0, w.jsx)(`p`, {
                                className: `vortx-desk-empty__title`,
                                children: `Quiet for now`,
                              }),
                              (0, w.jsx)(`p`, {
                                className: `vortx-desk-empty__copy`,
                                children: watchSuggest
                                  ? `Watch ${watchSuggest.entityName} (or another Form 4 / Congress filer) so the next filing shows up here.`
                                  : visit.headline ||
                                    `Watch a lawmaker or insider to get their next filing.`,
                              }),
                              watchSuggest
                                ? (0, w.jsx)(`button`, {
                                    type: `button`,
                                    className: `vortx-desk-watch-btn`,
                                    onClick: () => void toggleStar(watchSuggest.entityId),
                                    children: `Watch ${watchSuggest.entityName}`,
                                  })
                                : null,
                            ],
                          })
                        : (0, w.jsx)(`p`, {
                            className: `vortx-desk-terminal__muted`,
                            children: `No trades match. Try All or clear search.`,
                          }),
                  }),
              deskGroups.length
                ? (0, w.jsxs)(`p`, {
                    className: `data-font mt-3 text-[11px] uppercase tracking-[0.12em] text-soft`,
                    children: [
                      `Showing `,
                      Math.min(visibleLimit, deskGroups.length),
                      ` of `,
                      deskGroups.length,
                      ` in this refresh`,
                    ],
                  })
                : null,
              deskGroups.length > visibleLimit
                ? (0, w.jsx)(`button`, {
                    type: `button`,
                    className: `vortx-desk-terminal__btn vortx-load-more mt-3`,
                    onClick: () => setVisibleLimit((n) => n + 10),
                    children: `Load more`,
                  })
                : null,
            ],
          }),
        ],
      }),
        ],
      }),
      (0, w.jsxs)(`details`, {
        className: `vortx-desk-help mt-8`,
        open: helpOpen,
        onToggle: (e) => setHelpOpen(Boolean(e.currentTarget.open)),
        children: [
          (0, w.jsx)(`summary`, {
            className: `vortx-desk-help__summary`,
            children: `Need help? Request support`,
          }),
          (0, w.jsxs)(`div`, {
            className: `mt-4 grid gap-4 lg:grid-cols-[1fr_360px]`,
            children: [
              (0, w.jsxs)(`div`, {
                className: `glass-panel rounded-3xl p-5`,
                children: [
                  (0, w.jsx)(`p`, {
                    className: `eyebrow`,
                    children: `Help`,
                  }),
                  (0, w.jsx)(`h3`, {
                    className: `display-font mt-3 text-2xl text-ink`,
                    children: `Ask about Watch, alerts, or billing.`,
                  }),
                  (0, w.jsxs)(`div`, {
                    className: `mt-5 grid gap-3`,
                    children: [
                      (0, w.jsxs)(`select`, {
                        className: `input w-full`,
                        value: r,
                        onChange: (e) => i(e.target.value),
                        children: [
                          (0, w.jsx)(`option`, {
                            value: `watchlist_setup`,
                            children: `Watchlist / alert help`,
                          }),
                          (0, w.jsx)(`option`, {
                            value: `support`,
                            children: `Support question`,
                          }),
                          (0, w.jsx)(`option`, {
                            value: `data_export`,
                            children: `Export / billing`,
                          }),
                          x
                            ? (0, w.jsx)(`option`, {
                                value: `research_brief`,
                                children: `Admin: research brief`,
                              })
                            : null,
                          x
                            ? (0, w.jsx)(`option`, {
                                value: `jurisdiction_pack`,
                                children: `Admin: jurisdiction pack`,
                              })
                            : null,
                        ],
                      }),
                      (0, w.jsx)(`input`, {
                        className: `input w-full`,
                        value: a,
                        onChange: (e) => o(e.target.value),
                        placeholder: `Subject`,
                      }),
                      (0, w.jsx)(`textarea`, {
                        className: `input min-h-28 w-full`,
                        value: s,
                        onChange: (e) => u(e.target.value),
                        placeholder: `What do you need help with?`,
                      }),
                      (0, w.jsx)(`button`, {
                        type: `button`,
                        onClick: () => void v(),
                        className: `text-left text-sm text-terminal-blue underline underline-offset-4 transition duration-200 hover:text-ink`,
                        children: `send request`,
                      }),
                    ],
                  }),
                  deskErr
                    ? (0, w.jsx)(`p`, {
                        className: `mt-3 text-sm text-rose-200`,
                        children: deskErr,
                      })
                    : null,
                  p
                    ? (0, w.jsx)(`p`, {
                        className: `mt-3 text-sm text-terminal-green`,
                        children: p,
                      })
                    : null,
                  (0, w.jsxs)(`details`, {
                    className: `mt-5`,
                    children: [
                      (0, w.jsx)(`summary`, {
                        className: `cursor-pointer text-sm font-semibold text-muted`,
                        children: `Advanced · export`,
                      }),
                      (0, w.jsxs)(`div`, {
                        className: `mt-3 flex flex-wrap gap-2`,
                        children: [
                          canExport
                            ? (0, w.jsxs)(w.Fragment, {
                                children: [
                                  (0, w.jsx)(`button`, {
                                    type: `button`,
                                    className: `vortx-desk-terminal__btn`,
                                    onClick: () => void y(`csv`),
                                    children: `Export CSV`,
                                  }),
                                  (0, w.jsx)(`button`, {
                                    type: `button`,
                                    className: `vortx-desk-terminal__btn`,
                                    onClick: () => void y(`json`),
                                    children: `Export JSON`,
                                  }),
                                ],
                              })
                            : (0, w.jsx)(`p`, {
                                className: `text-sm text-muted`,
                                children: `CSV/JSON export unlocks on API plans.`,
                              }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              (0, w.jsxs)(`aside`, {
                className: `glass-panel rounded-3xl p-5`,
                children: [
                  (0, w.jsx)(`p`, {
                    className: `eyebrow`,
                    children: `Your requests`,
                  }),
                  (0, w.jsxs)(`div`, {
                    className: `mt-4 space-y-3`,
                    children: [
                      (g?.service_requests || []).length
                        ? (g?.service_requests || [])
                            .slice(0, 5)
                            .map((e) =>
                              (0, w.jsxs)(
                                `div`,
                                {
                                  className: `rounded-xl border border-metallic bg-black/40 p-3`,
                                  children: [
                                    (0, w.jsx)(`p`, {
                                      className: `text-sm text-ink`,
                                      children: e.subject,
                                    }),
                                    (0, w.jsxs)(`p`, {
                                      className: `data-font mt-1 text-xs text-soft`,
                                      children: [e.request_type, ` / `, e.status],
                                    }),
                                  ],
                                },
                                e.id,
                              ),
                            )
                        : (0, w.jsx)(`p`, {
                            className: `text-sm text-muted`,
                            children: `No requests yet.`,
                          }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
function severityMeterColor(score) {
  let n = Number(score) || 0;
  if (n >= 85) return `#e11d48`;
  if (n >= 70) return `#f97316`;
  if (n >= 55) return `#eab308`;
  return `#94a3b8`;
}
function tradingCategoryAccent(type) {
  let t = String(type || ``).toLowerCase();
  if (t === `form_4`) return `#8b5cf6`;
  if (t === `congress_trade`) return `#0ea5e9`;
  if (t === `institutional_13f`) return `#10b981`;
  return `#94a3b8`;
}
function tradingActionVerb(side, type) {
  if (side === `buy`) return `bought`;
  if (side === `sell`) return `sold`;
  if (side === `institutional`) return `reported holdings`;
  if (type === `congress_trade`) return `disclosed`;
  if (type === `form_4`) return `filed`;
  return `disclosed`;
}
function tradingSourceMeta(type, filingDate, sourceName, tradeDate) {
  let base =
    type === `form_4`
      ? `Form 4 · SEC EDGAR`
      : type === `congress_trade`
        ? `STOCK Act · Congress`
        : type === `institutional_13f`
          ? `SEC EDGAR`
          : H(type);
  if (sourceName && !/sec edgar|congress/i.test(base)) base = `${base} · ${sourceName}`;
  let tradeBit =
      tradeDate && /^\d{4}-\d{2}-\d{2}$/.test(String(tradeDate))
        ? ` · traded ${tradeDate}`
        : ``,
    filedBit = filingDate ? ` · filed ${filingDate}` : ``;
  // Prefer explicit trade date; always label filing/acceptance separately when both exist.
  if (tradeBit && filedBit && String(tradeDate).slice(0, 10) !== String(filingDate).slice(0, 10)) {
    return `${base}${tradeBit}${filedBit}`;
  }
  if (tradeBit) return `${base}${tradeBit}`;
  return filingDate ? `${base}${filedBit}` : base;
}
function parseTradingCardFields(row) {
  let type = String(row.event_type || row.source_record_type || ``).toLowerCase(),
    meta = row.signal_meta || {},
    short = String(row.short_title || ``).trim(),
    title = String(row.title || ``).trim(),
    summary = String(row.summary || ``).trim(),
    namesUnlocked =
      title &&
      !/^public record signal$/i.test(title) &&
      !/^financial-distress/i.test(title),
    issuer = meta.issuer_label || ``,
    ticker = meta.ticker_label || null,
    side = meta.side || `neutral`,
    actionLabel = meta.action_label
      ? String(meta.action_label)
          .replace(/holdings report|reported holding/i, `HOLDINGS`)
          .trim()
      : null,
    roleLabel =
      type === `congress_trade`
        ? `Congress`
        : type === `form_4`
          ? `Insider`
          : type === `institutional_13f`
            ? `Fund`
            : `Trader`,
    tradeDate =
      row.trade_date ||
      (summary.match(/Transaction date:\s*(\d{4}-\d{2}-\d{2})/i) || [])[1] ||
      null,
    issuerFromSummary = (summary.match(/Issuer on record:\s*([^.]+)/i) || [])[1] || ``;
  if (!issuer && issuerFromSummary) issuer = String(issuerFromSummary).trim();
  if (!issuer && type === `institutional_13f`) {
    let m =
      short.match(/^13F institutional filing:\s*(.+?)(?:\s+13F|$)/i) ||
      short.match(/^(.+?)\s+13F institutional filing\b/i) ||
      title.match(/^13F institutional filing:\s*(.+)$/i);
    issuer = m ? String(m[1]).trim() : ``;
  }
  if (!issuer && (type === `form_4` || type === `congress_trade`)) {
    let m =
      title.match(/^Form 4 insider filing:\s*(.+?)(?:\s*\([A-Z]{1,5}\))?(?:\s+(?:purchase|sale|transaction))?$/i) ||
      title.match(/^STOCK Act disclosure:\s*(.+?)(?:\s*·\s*[A-Z]{1,5})?$/i);
    // Person is filer; company comes from issuer summary, not entity shell.
    if (!issuerFromSummary && type === `congress_trade`) {
      let asset = (summary.match(/Asset on record:\s*([^.]+)/i) || [])[1];
      if (asset && !/^[A-Z]{1,5}$/.test(String(asset).trim())) issuer = String(asset).trim();
    }
  }
  if (!issuer && type !== `form_4` && type !== `congress_trade`) {
    let m =
      short.match(/^Form 4 insider filing:\s*(.+?)(?:\s*\(Issuer\))?(?:\s+Form 4|$)/i) ||
      short.match(/^13F institutional filing:\s*(.+?)(?:\s+13F|$)/i) ||
      short.match(/^STOCK Act disclosure:\s*(.+?)(?:\s+STOCK|$)/i) ||
      short.match(/^(.+?)\s+(Form 4 insider filing|STOCK Act disclosure|13F institutional filing)\b/i);
    issuer = m ? String(m[1]).replace(/\s*\(Issuer\)\s*/gi, ` `).trim() : ``;
  }
  if (!issuer && type === `institutional_13f`) issuer = `Manager on record`;
  if (!ticker) {
    let tm =
        short.match(/\(([A-Z]{1,5})\)/) ||
        title.match(/\(([A-Z]{1,5})\)/) ||
        summary.match(/Ticker on record:\s*([A-Z]{1,5})\b/i),
      candidate = tm ? String(tm[1]).toUpperCase() : ``,
      blocked = new Set([`ISSUER`, `OWNER`, `FILER`, `FORM`, `STOCK`, `SALE`, `BUY`, `SELL`, `LLC`, `INC`, `CORP`, `NONE`]);
    ticker = candidate && !blocked.has(candidate) ? candidate : null;
  }
  if (!actionLabel) {
    let blob = `${short} ${title} ${summary}`,
      hasCode = /Transaction code:\s*[PS]\b/i.test(blob) || /\btransaction code:\s*[PS]\b/i.test(blob);
    if (type === `institutional_13f`) {
      side = `institutional`;
      actionLabel = `HOLDINGS`;
    } else if (hasCode && /purchase|bought|\bbuy\b|transaction code:\s*P\b/i.test(blob)) {
      side = `buy`;
      actionLabel = `BOUGHT`;
    } else if (hasCode && /sale|sold|\bsell\b|transaction code:\s*S\b/i.test(blob)) {
      side = `sell`;
      actionLabel = `SOLD`;
    } else if (/purchase|bought|\bbuy\b/i.test(blob) && !/transaction code:/i.test(blob)) {
      // Weak prose-only side: keep disclose label rather than fake BOUGHT.
      side = `disclose`;
      actionLabel = type === `congress_trade` ? `DISCLOSED` : `FILED`;
    } else if (type === `congress_trade`) {
      side = `disclose`;
      actionLabel = /PTR index row|open the filing PDF/i.test(summary) ? `PTR FILED` : `DISCLOSED`;
    } else {
      side = `disclose`;
      actionLabel = type === `form_4` ? `FILED` : `DISCLOSED`;
    }
  }
  let unlockedWho = String(
      meta.filer_label ||
        row.entity_name ||
        title.replace(/^[^:]+:\s*/, ``).replace(/\s*·\s*[A-Z]{1,5}\s*$/, ``).replace(/\s*\([A-Z]{1,5}\)\s*/, ` `) ||
        ``,
    )
      .trim()
      .replace(/([A-Za-z])([A-Z]{1,5})$/, `$1`)
      .replace(/\s+/g, ` `)
      .slice(0, 72),
    filerName = namesUnlocked ? unlockedWho || null : null,
    actionVerb = tradingActionVerb(side, type),
    sameWhoCompany =
      filerName && issuer && filerName.toLowerCase() === issuer.toLowerCase(),
    amountValue = Number.isFinite(Number(row.amount)) ? Number(row.amount) : null,
    // Do not dress empty 13F / disclosure shells as trade tickets.
    showTradeChrome =
      type === `institutional_13f`
        ? false
        : Boolean(ticker || amountValue != null || /Transaction code:\s*[PS]\b/i.test(summary)),
    showCompany = Boolean(issuer) && issuer !== `Manager on record` && !sameWhoCompany,
    secondFact =
      type === `institutional_13f`
        ? showCompany
          ? null
          : `Quarterly holdings report`
        : null,
    holdingsReport = type === `institutional_13f`,
    place = type === `congress_trade` ? congressPlace(row) : { chamber: ``, seat: `` },
    formLabel =
      type === `institutional_13f`
        ? meta.form_label || thirteenfFormLabel(title, summary)
        : ``,
    periodLabel =
      type === `institutional_13f`
        ? meta.period_label || thirteenfPeriodLabel(row.filing_date)
        : ``;
  return {
    type,
    side,
    actionLabel: holdingsReport ? `Holdings report` : actionLabel,
    actionVerb: holdingsReport ? `reported holdings` : actionVerb,
    roleLabel,
    issuer,
    ticker: type === `institutional_13f` ? null : ticker,
    filerName,
    filerLocked: !filerName,
    showCompany,
    secondFact,
    holdingsReport,
    showTradeChrome,
    hot: false,
    sourceMeta: tradingSourceMeta(type, row.filing_date, row.source_name, tradeDate),
    score: Number(row.severity) || Number(row.confidence) || 50,
    filingDate: row.filing_date || `Date pending`,
    tradeDate: tradeDate || null,
    amount: type === `institutional_13f` ? null : amountValue,
    amountLabel:
      type === `institutional_13f` ? null : formatTradeAmount(amountValue),
    chamber: place.chamber,
    seat: place.seat,
    formLabel,
    periodLabel,
  };
}
function congressPlace(row) {
  let raw = String(row?.jurisdiction || row?.jurisdiction_display || ``);
  let house = raw.match(/US-House-([A-Z]{2})(\d{2})/i);
  if (house) return { chamber: `House`, seat: `${house[1].toUpperCase()}-${house[2]}` };
  let senate = raw.match(/US-Senate-([A-Z]{2})/i);
  if (senate) return { chamber: `Senate`, seat: senate[1].toUpperCase() };
  if (/senate/i.test(raw)) return { chamber: `Senate`, seat: `` };
  if (/house/i.test(raw)) return { chamber: `House`, seat: `` };
  return { chamber: `Congress`, seat: `` };
}
function tradingPlainHeadline(card) {
  let who = card.filerLocked ? `Someone` : card.filerName || `Someone`,
    company = card.showCompany ? ` · ${card.issuer}` : card.secondFact ? ` · ${card.secondFact}` : ``;
  return `${who} ${card.actionVerb}${company}`;
}
function tradingHasActionChip(card) {
  return Boolean(card.side && card.side !== `neutral` && card.actionLabel);
}
function tradingHeadlineNodes(card, size = `lg`) {
  let titleClass =
    size === `sm`
      ? `vortx-trade-headline text-sm font-semibold leading-snug text-ink`
      : `vortx-trade-headline text-xl font-bold leading-snug text-ink`,
    detail = card.showCompany ? card.issuer : card.secondFact || null;
  return (0, w.jsxs)(`p`, {
    className: titleClass,
    children: [
      card.filerLocked
        ? (0, w.jsx)(`span`, {
            className: `vortx-trade-locked-chip`,
            title: `Subscribe to see the person's name`,
            "aria-label": `Name hidden. Subscribe to see the person's name.`,
            children: `Name hidden`,
          })
        : (0, w.jsx)(`span`, {
            className: `vortx-trade-filer-name`,
            children: formatFilerDisplayName(card.filerName, card.type),
          }),
      tradingHasActionChip(card)
        ? null
        : (0, w.jsxs)(`span`, {
            className: `vortx-trade-headline__verb`,
            children: [` `, card.actionVerb],
          }),
      detail
        ? (0, w.jsxs)(`span`, {
            className: `vortx-trade-headline__detail`,
            children: [` · `, detail],
          })
        : null,
    ],
  });
}
function tradingHeroSignals(card, row) {
  let chips = [];
  if (tradingHasActionChip(card)) {
    chips.push(
      (0, w.jsxs)(
        `span`,
        {
          className: tradingActionClass(card.side),
          children: [
            (0, w.jsx)(`span`, {
              className: `vortx-trade-action__dir`,
              children: tradingDirectionGlyph(card.side),
            }),
            card.actionLabel,
          ],
        },
        `action`,
      ),
    );
  } else if (card.roleLabel) {
    chips.push(
      (0, w.jsx)(
        `span`,
        { className: `vortx-trade-role`, children: card.roleLabel },
        `role`,
      ),
    );
  }
  if (card.ticker) {
    chips.push(
      (0, w.jsxs)(
        `span`,
        {
          className: `vortx-ticker-pair`,
          children: [
            (0, w.jsx)(LiveQuoteLinks, {
              ticker: card.ticker,
              compact: !0,
              className: `vortx-trade-ticker vortx-ticker-link`,
              children: sanitizeTapeQuery(card.ticker) || card.ticker,
            }),
            (0, w.jsx)(LiveQuoteLinks, {
              ticker: card.ticker,
              compact: !0,
            }),
          ],
        },
        `ticker`,
      ),
    );
  } else if (card.type === `congress_trade` || card.type === `institutional_13f`) {
    chips.push(
      (0, w.jsx)(
        `span`,
        { className: `vortx-ticker-pair`, children: (0, w.jsx)(TapeNextAction, { card, row }) },
        `next`,
      ),
    );
  }
  if (card.amountLabel) {
    chips.push(
      (0, w.jsx)(
        `span`,
        { className: `vortx-trade-amount`, children: card.amountLabel },
        `amount`,
      ),
    );
  }
  if (!chips.length) return null;
  return (0, w.jsx)(`div`, {
    className: `vortx-trade-hero`,
    children: chips,
  });
}
function pickLockedExemplar(events = []) {
  let trading = [`form_4`, `congress_trade`, `institutional_13f`],
    best = null;
  for (let row of events || []) {
    if (!trading.includes(String(row.event_type || ``))) continue;
    let card = parseTradingCardFields(row);
    if (!card.filerLocked) continue;
    let score = 0;
    if (card.type === `form_4` || card.type === `congress_trade`) score += 3;
    if (card.amountLabel) score += 2;
    if (card.ticker) score += 2;
    if (card.side === `buy` || card.side === `sell`) score += 1;
    if (!best || score > best.score) best = { row, card, score };
  }
  return best;
}
function tradingActionClass(side) {
  return side === `buy`
    ? `vortx-trade-action vortx-trade-action--buy`
    : side === `sell`
      ? `vortx-trade-action vortx-trade-action--sell`
      : side === `institutional`
        ? `vortx-trade-action vortx-trade-action--report`
        : `vortx-trade-action vortx-trade-action--disclose`;
}
function sideFromActionLabel(label) {
  let u = String(label || ``).toUpperCase();
  if (/\bBOUGHT\b|\bBUY\b/.test(u)) return `buy`;
  if (/\bSOLD\b|\bSELL\b/.test(u)) return `sell`;
  if (/\bHOLD/.test(u)) return `institutional`;
  return ``;
}
function tradingDirectionGlyph(side) {
  if (side === `buy`) return `▲`;
  if (side === `sell`) return `▼`;
  if (side === `institutional`) return `◆`;
  return `●`;
}
function tapeSourceLabel(card) {
  if (card?.type === `form_4`) return `Form 4`;
  if (card?.type === `congress_trade`) return card.chamber && card.chamber !== `Congress` ? card.chamber : `Congress`;
  if (card?.type === `institutional_13f`) return `13F`;
  return `Filing`;
}
function TapeFilingLabel({ row, card, children }) {
  let href = filingActionHref(row, card);
  if (!href) return children || null;
  return (0, w.jsx)(`a`, {
    href,
    target: `_blank`,
    rel: `noopener noreferrer`,
    className: `vortx-tape-source-link`,
    onClick: (event) => event.stopPropagation(),
    title: /own-disp/i.test(href)
      ? `SEC reporting owner filings. Research only.`
      : `Official filing document. Research only.`,
    children,
  });
}
function TapeSourceLink({ card, row }) {
  let label = tapeSourceLabel(card),
    href = filingActionHref(row, card);
  if (href)
    return (0, w.jsx)(TapeFilingLabel, {
      row,
      card,
      children: label,
    });
  return (0, w.jsxs)(`span`, {
    className: `vortx-tape-source vortx-tape-source--missing`,
    title:
      card?.type === `institutional_13f`
        ? `No EDGAR index URL on this 13F. A holdings report is only usable once the filing receipt exists.`
        : `No filing receipt on this row`,
    children: [
      label,
      (0, w.jsx)(`span`, {
        className: `vortx-tape-source__miss`,
        children: `No receipt`,
      }),
    ],
  });
}
function thirteenfFormLabel(title = ``, summary = ``) {
  let blob = `${title} ${summary}`,
    tagged = blob.match(/Form on record:\s*(13F(?:-(?:HR|NT))?(?:\/A)?)/i);
  if (tagged) {
    let raw = String(tagged[1] || ``).toUpperCase();
    return raw === `13F` ? `13F-HR` : raw;
  }
  let match = blob.match(/\b13F(?:-(HR|NT))?(\/A)?\b/i);
  if (!match) return `13F-HR`;
  return `13F-${String(match[1] || `HR`).toUpperCase()}${match[2] ? `/A` : ``}`;
}
function thirteenfPeriodLabel(filingDate) {
  let raw = String(filingDate || ``).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return ``;
  let year = Number(raw.slice(0, 4)),
    month = Number(raw.slice(5, 7));
  if (month <= 2) return `Q4 ${year - 1}`;
  if (month <= 5) return `Q1 ${year}`;
  if (month <= 8) return `Q2 ${year}`;
  if (month <= 11) return `Q3 ${year}`;
  return `Q3 ${year}`;
}
function tapeColumnMode({ stream, typeFilter, rows, home = !1 } = {}) {
  if (home) return `home`;
  if (stream === `congress` || typeFilter === `congress_trade`) return `congress_trade`;
  if (stream === `thirteenf` || typeFilter === `institutional_13f`) return `institutional_13f`;
  if (stream === `insider` || typeFilter === `form_4`) return `form_4`;
  let types = [
    ...new Set(
      (rows || [])
        .map((row) => String(row.event_type || row.source_record_type || ``))
        .filter(Boolean),
    ),
  ];
  if (types.length === 1) {
    if (types[0] === `congress_trade`) return `congress_trade`;
    if (types[0] === `institutional_13f`) return `institutional_13f`;
    if (types[0] === `form_4`) return `form_4`;
  }
  return `mixed`;
}
function tapeThead(mode = `mixed`) {
  let cols =
    mode === `home`
      ? [`Ticker`, `Bought or sold`, `Amount`, `Who`]
      : mode === `congress_trade`
        ? [`Time`, `House or Senate`, `Company`, `Bought or sold`, `Who`, `Record`, `Watch`]
        : mode === `institutional_13f`
          ? [`Time`, `Filing`, `Period`, `Who`, `Record`, `Watch`]
          : [`Time`, `Ticker`, `Bought or sold`, `Amount`, `Who`, `Record`, `Watch`];
  return (0, w.jsx)(`thead`, {
    children: (0, w.jsxs)(`tr`, {
      children: cols.map((label, i) =>
        (0, w.jsx)(
          `th`,
          { className: label === `Bought or sold` ? `vortx-tape__side-head` : void 0, children: label },
          i,
        ),
      ),
    }),
  });
}
function tapeColCount(mode = `mixed`) {
  if (mode === `home`) return 4;
  return mode === `institutional_13f` ? 6 : 7;
}
function normalizeFilerKey(name) {
  return String(name || ``)
    .toLowerCase()
    .replace(
      /^(hon\.?|rep\.?|sen\.?|senator|representative|congressman|congresswoman)\s+/i,
      ``,
    )
    .replace(/[^a-z0-9]+/g, ` `)
    .trim();
}
function splitMashedFilerName(raw) {
  let s = String(raw || ``).replace(/\s+/g, ` `).trim();
  if (!s) return s;
  return s
    .replace(/([a-z])([A-Z])/g, `$1 $2`)
    .replace(/([A-Z]+)([A-Z][a-z])/g, `$1 $2`)
    .replace(/\s+/g, ` `)
    .trim();
}
function formatFilerDisplayName(name, type) {
  let raw = splitMashedFilerName(String(name || ``).replace(/\s+/g, ` `).trim());
  if (!raw || type === `institutional_13f`) return raw;
  let words = raw.split(` `);
  if (words.length < 2) return raw;
  let letters = raw.replace(/[^A-Za-z]/g, ``);
  if (!letters || letters !== letters.toUpperCase()) return raw;
  return words
    .map((word) =>
      /^[A-Z]{2,4}$/.test(word) ? word : word.slice(0, 1) + word.slice(1).toLowerCase(),
    )
    .join(` `);
}
function filerInitials(name) {
  let parts = String(name || ``)
    .replace(/[^A-Za-z\s]/g, ` `)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return `?`;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
function filerHue(name) {
  let s = String(name || `x`),
    hue = 216;
  for (let i = 0; i < s.length; i++) hue = (hue * 33 + s.charCodeAt(i)) >>> 0;
  return hue % 360;
}
function filerSeedMark(seed) {
  let s = String(seed || ``),
    n = 0,
    alphabet = `ABCDEFGHJKLMNPQRSTUVWXYZ`;
  if (!s) return `F`;
  for (let i = 0; i < s.length; i++) n = (n * 33 + s.charCodeAt(i)) >>> 0;
  return `${alphabet[n % 24]}${alphabet[Math.floor(n / 24) % 24]}`;
}
function congressPortraitUrl(bioguide) {
  let id = String(bioguide || ``).trim();
  if (!/^[A-Za-z][0-9]{6}$/.test(id)) return ``;
  return `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275/${id}.jpg`;
}
let congressBioguideMap = null,
  congressBioguideLoad = null;
function loadCongressBioguide() {
  if (congressBioguideMap) return Promise.resolve(congressBioguideMap);
  if (congressBioguideLoad) return congressBioguideLoad;
  congressBioguideLoad = fetch(`/congress-bioguide.json`, { credentials: `same-origin` })
    .then((r) => (r.ok ? r.json() : {}))
    .then((m) => {
      congressBioguideMap = m && typeof m === `object` ? m : {};
      return congressBioguideMap;
    })
    .catch(() => {
      congressBioguideMap = {};
      return congressBioguideMap;
    });
  return congressBioguideLoad;
}
let filerPortraitMemo = new Map();
function loadPublicFilerPortrait({ type, name, issuer, ticker, locked }) {
  let key = `${type}|${locked ? `` : name}|${issuer}|${ticker}`;
  if (filerPortraitMemo.has(key)) return filerPortraitMemo.get(key);
  let params = new URLSearchParams({ type: type || `` });
  if (!locked && name) params.set(`name`, name);
  if (issuer) params.set(`issuer`, issuer);
  if (ticker) params.set(`ticker`, ticker);
  if (locked) params.set(`locked`, `1`);
  let pending = fetch(`/api/filer-portrait?${params.toString()}`, {
    credentials: `same-origin`,
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => {
      let src = String(body?.src || ``),
        allowed =
          /^https:\/\/upload\.wikimedia\.org\//.test(src) ||
          /^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//.test(src) ||
          /^https:\/\/financialmodelingprep\.com\/image-stock\/[A-Z]{1,5}\.png$/.test(src);
      return body?.ok && allowed ? { src, kind: body.kind || `company` } : null;
    })
    .catch(() => null);
  filerPortraitMemo.set(key, pending);
  return pending;
}
function entityFilerProps(entity, events = [], unlocked = !1) {
  let rows = (events || []).filter((row) => row.entity_id === entity?.id),
    trading = rows.find((row) =>
      [`form_4`, `congress_trade`, `institutional_13f`].includes(String(row.event_type || ``)),
    ),
    row = trading || rows[0],
    type = String(row?.event_type || entity?.entity_type || ``),
    card = [`form_4`, `congress_trade`, `institutional_13f`].includes(type)
      ? parseTradingCardFields(row)
      : null,
    locked = !unlocked && !entity?.preview_unlocked;
  if (card) {
    return {
      name: locked ? `` : card.filerName || entity?.canonical_name || ``,
      type: card.type,
      locked,
      issuer: card.type === `institutional_13f` && locked ? `` : card.issuer || ``,
      ticker:
        card.type === `institutional_13f` && locked ? `` : card.ticker || entity?.ticker || ``,
      seed: entity?.id || ``,
    };
  }
  return {
    name: locked ? `` : entity?.canonical_name || ``,
    type,
    locked,
    issuer: locked ? `` : entity?.canonical_name || ``,
    ticker: locked ? `` : entity?.ticker || ``,
    seed: entity?.id || ``,
  };
}
function FilerFace({
  name = ``,
  type = ``,
  locked = !1,
  issuer = ``,
  ticker = ``,
  seed = ``,
  size = `md`,
} = {}) {
  let [photo, setPhoto] = (0, l.useState)(``),
    [photoKind, setPhotoKind] = (0, l.useState)(``),
    [broken, setBroken] = (0, l.useState)(!1),
    queryIssuer = type === `institutional_13f` && locked ? `` : issuer,
    queryTicker = type === `institutional_13f` && locked ? `` : ticker,
    hueSeed = seed || name || type,
    fundRow = type === `institutional_13f`,
    showPhoto = Boolean(photo) && !broken && (photoKind !== `person` || !locked),
    kind = showPhoto
      ? photoKind || (fundRow ? `fund` : `person`)
      : fundRow
        ? `fund`
        : locked
          ? `locked`
          : `person`;
  (0, l.useEffect)(() => {
    setPhoto(``);
    setPhotoKind(``);
    setBroken(!1);
    let cancelled = !1;
    if (type === `congress_trade` && !locked && name) {
      loadCongressBioguide().then((map) => {
        if (cancelled) return;
        setPhoto(congressPortraitUrl(map[normalizeFilerKey(name)]));
        setPhotoKind(`person`);
      });
      return () => {
        cancelled = !0;
      };
    }
    if (fundRow && locked) return;
    if (!queryIssuer && !queryTicker && (locked || !name)) return;
    loadPublicFilerPortrait({
      type,
      name,
      issuer: queryIssuer,
      ticker: queryTicker,
      locked,
    }).then((hit) => {
      if (cancelled || !hit) return;
      setPhoto(hit.src);
      setPhotoKind(hit.kind);
    });
    return () => {
      cancelled = !0;
    };
  }, [name, type, locked, queryIssuer, queryTicker, fundRow]);
  return (0, w.jsxs)(`span`, {
    className: `vortx-filer-face vortx-filer-face--${size}`,
    "data-kind": kind,
    "data-type": type || `unknown`,
    "aria-hidden": `true`,
    style: { [`--filer-h`]: String(filerHue(hueSeed)) },
    children: [
      showPhoto
        ? (0, w.jsx)(`img`, {
            className: `vortx-filer-face__photo`,
            src: photo,
            alt: ``,
            width: size === `sm` ? 32 : 44,
            height: size === `sm` ? 32 : 44,
            referrerPolicy: `no-referrer`,
            onError: () => setBroken(!0),
          })
        : (0, w.jsx)(`span`, {
            className: `vortx-filer-face__mark`,
            children: locked
              ? fundRow
                ? filerSeedMark(hueSeed)
                : ``
              : filerInitials(name),
          }),
      (0, w.jsx)(`span`, { className: `vortx-filer-face__pip` }),
    ],
  });
}
function FilerNameCell({
  name,
  type,
  locked,
  issuer = ``,
  ticker = ``,
  seed = ``,
  size = `sm`,
  entityId = ``,
  onOpenWhale,
} = {}) {
  let display = formatFilerDisplayName(name, type) || `-`,
    openable = Boolean(onOpenWhale && entityId),
    inner = [
      (0, w.jsx)(
        FilerFace,
        {
          name: name || ``,
          type: type || ``,
          locked: Boolean(locked),
          issuer,
          ticker,
          seed,
          size,
        },
        `face`,
      ),
      locked
        ? (0, w.jsx)(
            `span`,
            {
              className: `vortx-trade-locked-chip`,
              title: `Subscribe to see the person's name`,
              children: `Name hidden`,
            },
            `hidden`,
          )
        : (0, w.jsx)(`span`, { className: `vortx-filer__name`, children: display }, `name`),
      openable
        ? (0, w.jsx)(`span`, { className: `vortx-filer__desk`, children: `Their trades` }, `desk`)
        : null,
    ];
  if (openable) {
    return (0, w.jsx)(`button`, {
      type: `button`,
      className: `vortx-filer vortx-filer--open`,
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenWhale(entityId);
      },
      children: inner,
    });
  }
  return (0, w.jsxs)(`span`, {
    className: `vortx-filer`,
    children: inner,
  });
}
function tapeSkeleton({ rows = 8, columnMode = `mixed` } = {}) {
  return (0, w.jsx)(`div`, {
    className: `vortx-tape-wrap`,
    "aria-busy": `true`,
    "aria-live": `polite`,
    children: (0, w.jsxs)(`table`, {
      className: `vortx-tape`,
      children: [
        tapeThead(columnMode),
        (0, w.jsx)(`tbody`, {
          children: Array.from({ length: rows }, (_, i) =>
            (0, w.jsx)(
              `tr`,
              {
                className: `vortx-tape__row vortx-tape__row--skeleton`,
                children: Array.from({ length: tapeColCount(columnMode) }, (_, c) =>
                  (0, w.jsx)(
                    `td`,
                    {
                      children: (0, w.jsx)(`span`, { className: `vortx-skel` }),
                    },
                    c,
                  ),
                ),
              },
              i,
            ),
          ),
        }),
      ],
    }),
  });
}
function tradingTapeRow(
  row,
  {
    onOpenPricing,
    starred = !1,
    flash = !1,
    onToggleWatch,
    canWatch = !1,
    featured = !1,
    card: cardOverride,
    columnMode = `mixed`,
    onFilterTicker,
    onOpenWhale,
  } = {},
) {
  let card = cardOverride || parseTradingCardFields(row),
    locked = Boolean(card.filerLocked),
    entityId = row.entity_id,
    mode =
      columnMode === `congress_trade` ||
      columnMode === `institutional_13f` ||
      columnMode === `home`
        ? columnMode
        : `mixed`,
    unlock = () => {
      if (entityId && onOpenWhale) {
        onOpenWhale(entityId);
        return;
      }
      if (!locked) return;
      trackMarketingStep(`locked_card_click`, card.type || `tape`);
      openNebulaPricing(onOpenPricing, featured ? `pulse_exemplar` : `tape_row`);
    },
    timeCell = (0, w.jsx)(`td`, {
      className: `vortx-tape__time data-font`,
      children: formatPublicElapsed(row.filing_date, locked, row.created_at || row.updated_at),
    }),
    filerCell = (0, w.jsx)(`td`, {
      className: `vortx-tape__filer`,
      children: (0, w.jsx)(FilerNameCell, {
        name: card.filerName || (!locked ? card.issuer : ``),
        type: card.type,
        locked,
        issuer: card.issuer || ``,
        ticker: card.ticker || ``,
        seed: entityId || row.id,
        size: `sm`,
        entityId,
        onOpenWhale,
      }),
    }),
    sourceCell = (0, w.jsx)(`td`, {
      className: `vortx-tape__source vortx-tape__muted`,
      children: (0, w.jsx)(TapeSourceLink, { card, row }),
    }),
    watchCell = (0, w.jsx)(`td`, {
      children: entityId
        ? (0, w.jsx)(WatchTradeButton, {
            entityId,
            starred,
            flash,
            disabled: !canWatch && !onToggleWatch,
            onToggle: onToggleWatch
              ? onToggleWatch
              : () => openNebulaPricing(onOpenPricing, `tape_watch`),
            size: `sm`,
            noun:
              card.type === `institutional_13f`
                ? `fund`
                : card.type === `congress_trade`
                  ? `member`
                  : `person`,
          })
        : null,
    }),
    homeTicker = (0, w.jsx)(`td`, {
      className: `vortx-tape__ticker`,
      children: card.ticker
        ? (0, w.jsxs)(`span`, {
            className: `vortx-ticker-pair`,
            children: [
              (0, w.jsx)(TickerTapeLink, {
                ticker: card.ticker,
                eventType: card.type,
                onFilter: onFilterTicker,
                className: `vortx-ticker-link`,
              }),
              (0, w.jsx)(LiveQuoteLinks, {
                ticker: card.ticker,
                compact: !0,
              }),
            ],
          })
        : card.issuer || `-`,
    }),
    cells =
      mode === `home`
        ? [
            homeTicker,
            (0, w.jsx)(`td`, {
              className: `vortx-tape__side`,
              children: (0, w.jsxs)(`span`, {
                className: tradingActionClass(card.side),
                children: [
                  (0, w.jsx)(`span`, {
                    className: `vortx-trade-action__dir`,
                    "aria-hidden": `true`,
                    children: tradingDirectionGlyph(card.side),
                  }),
                  card.actionLabel || (card.side === `buy` ? `BOUGHT` : `SOLD`),
                ],
              }),
            }, `side`),
            (0, w.jsx)(`td`, {
              className: `vortx-tape__amount`,
              children: card.amountLabel || `-`,
            }, `amt`),
            filerCell,
          ]
      : mode === `congress_trade`
        ? [
            timeCell,
            (0, w.jsx)(`td`, { children: congressOfficeLabel({ chamber: card.chamber, seat: card.seat }) }, `chamber`),
            (0, w.jsx)(`td`, {
              children: card.ticker
                ? (0, w.jsxs)(`span`, {
                    className: `vortx-ticker-pair`,
                    children: [
                      (0, w.jsx)(TickerTapeLink, {
                        ticker: card.ticker,
                        eventType: card.type,
                        onFilter: onFilterTicker,
                        className: `vortx-ticker-link`,
                      }),
                      (0, w.jsx)(LiveQuoteLinks, {
                        ticker: card.ticker,
                        compact: !0,
                      }),
                    ],
                  })
                : (0, w.jsxs)(`span`, {
                    className: `vortx-ticker-pair`,
                    children: [
                      card.issuer || card.seat || `No ticker on this trade`,
                      (0, w.jsx)(TapeNextAction, { card, row }),
                    ],
                  }),
            }, `asset`),
            (0, w.jsx)(`td`, {
              children: (0, w.jsxs)(`span`, {
                className: tradingActionClass(card.side),
                children: [
                  (0, w.jsx)(`span`, {
                    className: `vortx-trade-action__dir`,
                    "aria-hidden": `true`,
                    children: tradingDirectionGlyph(card.side),
                  }),
                  card.actionLabel || `Disclosed`,
                ],
              }),
            }, `disc`),
            filerCell,
            sourceCell,
            watchCell,
          ]
        : mode === `institutional_13f`
          ? [
              timeCell,
              (0, w.jsx)(
                `td`,
                {
                  className: `vortx-tape__ticker`,
                  children: (0, w.jsxs)(`span`, {
                    className: `vortx-ticker-pair`,
                    children: [
                      (0, w.jsx)(TapeFilingLabel, {
                        row,
                        children: card.formLabel || `13F-HR`,
                      }),
                      (0, w.jsx)(TapeNextAction, { card, row }),
                    ],
                  }),
                },
                `form`,
              ),
              (0, w.jsx)(`td`, { className: `vortx-tape__muted`, children: card.periodLabel || `-` }, `period`),
              filerCell,
              sourceCell,
              watchCell,
            ]
          : [
              timeCell,
              (0, w.jsx)(`td`, {
                className: `vortx-tape__ticker`,
                children: card.ticker
                  ? (0, w.jsxs)(`span`, {
                      className: `vortx-ticker-pair`,
                      children: [
                        (0, w.jsx)(TickerTapeLink, {
                          ticker: card.ticker,
                          eventType: card.type,
                          onFilter: onFilterTicker,
                          className: `vortx-ticker-link`,
                        }),
                        (0, w.jsx)(LiveQuoteLinks, {
                          ticker: card.ticker,
                          compact: !0,
                        }),
                      ],
                    })
                  : (0, w.jsxs)(`span`, {
                      className: `vortx-ticker-pair`,
                      children: [
                        card.holdingsReport
                          ? `No ticker on this filing`
                          : card.issuer || card.seat || `No ticker on this trade`,
                        (0, w.jsx)(TapeNextAction, { card, row }),
                      ],
                    }),
              }, `ticker`),
              (0, w.jsx)(`td`, {
                className: `vortx-tape__side`,
                children: (0, w.jsxs)(`span`, {
                  className: tradingActionClass(card.side),
                  children: [
                    (0, w.jsx)(`span`, {
                      className: `vortx-trade-action__dir`,
                      "aria-hidden": `true`,
                      children: tradingDirectionGlyph(card.side),
                    }),
                    card.actionLabel || `Filed`,
                  ],
                }),
              }, `side`),
              (0, w.jsx)(`td`, {
                className: `vortx-tape__amount`,
                children: card.amountLabel
                  ? card.amountLabel
                  : card.holdingsReport
                    ? card.periodLabel || `Holdings report`
                    : card.type === `congress_trade`
                      ? `See the record`
                      : `Not on this filing`,
              }, `amt`),
              filerCell,
              sourceCell,
              watchCell,
            ];
  return (0, w.jsxs)(
    `tr`,
    {
      className: `vortx-tape__row${locked ? ` vortx-tape__row--locked` : ``}${featured ? ` vortx-tape__row--featured` : ``}`,
      onClick: locked || (entityId && onOpenWhale) ? unlock : void 0,
      onKeyDown: locked && !(entityId && onOpenWhale)
        ? (e) => {
            if (e.key === `Enter` || e.key === ` `) {
              e.preventDefault();
              unlock();
            }
          }
        : void 0,
      role: locked && !(entityId && onOpenWhale) ? `button` : void 0,
      tabIndex: locked && !(entityId && onOpenWhale) ? 0 : void 0,
      children: cells,
    },
    row.id || `${card.type}-${card.filingDate}-${card.issuer}`,
  );
}
function tradingTapeTable({
  rows = [],
  onOpenPricing,
  starSet,
  watchFlashId = ``,
  onToggleWatch,
  canWatch = !1,
  featuredId,
  featuredEntityId,
  columnMode = `mixed`,
  empty,
  onFilterTicker,
  onOpenWhale,
}) {
  return (0, w.jsx)(`div`, {
    className: `vortx-tape-wrap mt-4`,
    children: (0, w.jsxs)(`table`, {
      className: columnMode === `home` ? `vortx-tape vortx-tape--home` : `vortx-tape`,
      children: [
        tapeThead(columnMode),
        (0, w.jsx)(`tbody`, {
          children: rows.length
            ? rows.map((row) =>
                tradingTapeRow(row, {
                  onOpenPricing,
                  starred: row.entity_id ? starSet?.has(row.entity_id) : !1,
                  flash: row.entity_id && watchFlashId === row.entity_id,
                  onToggleWatch,
                  canWatch,
                  featured: Boolean(
                    (featuredId && row.id === featuredId) ||
                      (featuredEntityId && row.entity_id === featuredEntityId),
                  ),
                  columnMode,
                  onFilterTicker,
                  onOpenWhale,
                }),
              )
            : (0, w.jsx)(`tr`, {
                children: (0, w.jsx)(`td`, {
                  colSpan: tapeColCount(columnMode),
                  children: empty || `No trades in this list yet.`,
                }),
              }),
        }),
      ],
    }),
  });
}
function tradingStreamCard(
  row,
  onOpenPricing,
  {
    starred: starred = !1,
    flash: flash = !1,
    onToggleWatch: onToggleWatch,
    canWatch: canWatch = !1,
  } = {},
) {
  let card = parseTradingCardFields(row),
    accent = tradingCategoryAccent(card.type),
    entityId = row.entity_id,
    unlock = () => {
      if (!card.filerLocked) return;
      trackMarketingStep(`locked_card_click`, card.type || `stream`);
      openNebulaPricing(onOpenPricing, `stream_card`);
    };
  return (0, w.jsxs)(
    `article`,
    {
      className: card.filerLocked
        ? `vortx-trade-card vortx-trade-card--locked glass-panel rounded-2xl p-4`
        : `vortx-trade-card glass-panel rounded-2xl p-4`,
      style: { borderLeft: `4px solid ${accent}` },
      onClick: card.filerLocked ? unlock : void 0,
      onKeyDown: card.filerLocked
        ? (e) => {
            if (e.key === `Enter` || e.key === ` `) {
              e.preventDefault();
              unlock();
            }
          }
        : void 0,
      role: card.filerLocked ? `button` : void 0,
      tabIndex: card.filerLocked ? 0 : void 0,
      children: [
        (0, w.jsxs)(`div`, {
          className: `flex items-start justify-between gap-3`,
          children: [
            (0, w.jsx)(`div`, {
              className: `min-w-0 flex-1`,
              children: tradingCardBody(card, row, { size: `lg` }),
            }),
            (0, w.jsxs)(`div`, {
              className: `shrink-0 text-right`,
              children: [
                (0, w.jsx)(`p`, {
                  className: `data-font text-xs text-soft`,
                  children: formatPublicElapsed(row.filing_date, card.filerLocked, row.created_at || row.updated_at),
                }),
                entityId
                  ? (0, w.jsx)(`div`, {
                      className: `mt-2`,
                      children: (0, w.jsx)(WatchTradeButton, {
                        entityId,
                        starred,
                        flash,
                        onToggle: canWatch
                          ? onToggleWatch
                          : () => openNebulaPricing(onOpenPricing, `stream_watch`),
                        size: `sm`,
                        noun:
                          card.type === `institutional_13f`
                            ? `fund`
                            : card.type === `congress_trade`
                              ? `member`
                              : `person`,
                      }),
                    })
                  : null,
              ],
            }),
          ],
        }),
      ],
    },
    row.id || `${card.type}-${card.filingDate}-${card.issuer}`,
  );
}
function tradingCardBody(card, row, { size = `sm` } = {}) {
  let early = youWereEarlyBadge(row),
    freePreview = Boolean(row.free_preview) && !card.filerLocked;
  if (freePreview) trackMarketingStepOnce(`free_name_view`, `free_name_view`, card.type || `trade`);
  return (0, w.jsxs)(w.Fragment, {
    children: [
      (0, w.jsxs)(`div`, {
        className: `vortx-trade-card__top`,
        children: [
          tradingHeroSignals(card, row),
          size === `sm`
            ? (0, w.jsx)(`span`, {
                className: `vortx-trade-card__time data-font text-xs text-soft`,
                children: formatPublicElapsed(row.filing_date, card.filerLocked, row.created_at || row.updated_at),
              })
            : null,
        ],
      }),
      card.holdingsReport
        ? (0, w.jsx)(`p`, {
            className: `vortx-trade-holdings-badge mt-1 text-[10px] font-semibold uppercase tracking-wide text-terminal-green`,
            children: `Not a trade`,
          })
        : null,
      freePreview
        ? (0, w.jsx)(`p`, {
            className: `vortx-trade-free-preview mt-1 text-[10px] font-semibold uppercase tracking-wide text-terminal-blue`,
            children: `Free preview · 1 name this session`,
          })
        : null,
      (0, w.jsxs)(`div`, {
        className: `vortx-trade-card__who mt-2 flex items-start gap-2`,
        children: [
          (0, w.jsx)(FilerFace, {
            name: card.filerName || ``,
            type: card.type,
            locked: Boolean(card.filerLocked),
            issuer: card.issuer || ``,
            ticker: card.ticker || ``,
            seed: entityId || row.id,
            size: size === `sm` ? `sm` : `md`,
          }),
          tradingHeadlineNodes(card, size),
        ],
      }),
      early,
      (0, w.jsx)(`p`, {
        className: `mt-1.5 text-xs leading-5 text-muted`,
        children: renderJargonText(card.sourceMeta),
      }),
      card.filerLocked
        ? (0, w.jsx)(`p`, {
            className: `vortx-trade-unlock-line mt-1.5 text-[11px] font-semibold text-terminal-blue`,
            children: lockedUnlockLabel(card),
          })
        : null,
    ],
  });
}
function tradingStreamView({
  stream: stream,
  events: events,
  onOpenPricing: onOpenPricing,
  onOpenOverview: onOpenOverview,
  feedPrivileged: feedPrivileged,
  onOpenStream: onOpenStream,
  showTypeToggle: showTypeToggle = !1,
  authToken: authToken,
  starIds: starIds = [],
  watchFlashId: watchFlashId = ``,
  onToggleWatch: onToggleWatch,
  watchRefreshKey: watchRefreshKey = 0,
  feedLoading: feedLoading = !1,
  forcedQuery: forcedQuery = ``,
  onQueryChange: onQueryChange,
}) {
  let meta =
    {
      congress: {
        eyebrow: `Congress Trades`,
        title: `Who in Congress traded`,
        intro: `Stock trades Congress already reported. Buy/sell and company stay free. Names show after you subscribe so the next House filing does not sit unread. House records update when the clerk posts them; Senate is not a daily feed yet.`,
        empty: `House records are thin right now, and Senate is not updating daily. Insider and fund rows are live. See names after you subscribe.`,
        types: [`congress_trade`],
        watchedScope: `congress`,
        watchedTitle: `Most watched lawmakers`,
      },
      insider: {
        eyebrow: `Insider Trades`,
        title: `Which company insiders traded`,
        intro: `See which executives and large owners already bought or sold, and in which companies. Buy/sell and company stay free. Names show after you subscribe so the next insider filing does not slip by.`,
        empty: `Insider trades update as new SEC filings post. Check back shortly, or see names after you subscribe.`,
        types: [`form_4`],
        watchedScope: `insider`,
        watchedTitle: `Most watched insiders`,
      },
      thirteenf: {
        eyebrow: `Fund Holdings`,
        title: `Which big funds reported`,
        intro: `See which big funds already reported their holdings. Names show after you subscribe so the next quarterly report does not sit in a government archive unread.`,
        empty: `Fund holdings update as new SEC filings post. Check back shortly, or see names after you subscribe.`,
        types: [`institutional_13f`],
        watchedScope: `thirteenf`,
        watchedTitle: `Most watched funds`,
      },
    }[stream] || {
      eyebrow: `Trading feed`,
      title: `Browse people and trades`,
      intro: `Lawmaker, insider, and fund trades they already filed. Ticker, bought or sold, and company are free. Names show after you subscribe so the next one does not slip by.`,
      empty: `Trades refresh daily. Check back shortly, or open Today's Trades.`,
      types: [`form_4`, `congress_trade`, `institutional_13f`],
      watchedScope: `overview`,
      watchedTitle: `Most watched today`,
    };
  let prefs = readTradeListPrefs(stream),
    [typeFilter, setTypeFilter] = (0, l.useState)(prefs.typeFilter || `all`),
    [sortMode, setSortMode] = (0, l.useState)(prefs.sort || `recent`),
    [sideFilter, setSideFilter] = (0, l.useState)(prefs.side || `all`),
    [tickerQuery, setTickerQuery] = (0, l.useState)(
      () => readTapeQueryFromLocation() || prefs.query || ``,
    ),
    [visibleLimit, setVisibleLimit] = (0, l.useState)(10),
    [whaleId, openWhale, closeWhale] = useWhaleWho(),
    mixed = meta.types.length > 1,
    coverageMap = useCoverageEnrich(events),
    starSet = (0, l.useMemo)(() => new Set(starIds || []), [starIds]);
  (0, l.useEffect)(() => {
    writeTradeListPrefs(stream, {
      typeFilter,
      sort: sortMode,
      side: sideFilter,
      query: tickerQuery,
    });
  }, [typeFilter, sortMode, sideFilter, tickerQuery]);
  (0, l.useEffect)(() => {
    let next = readTradeListPrefs(stream);
    setTypeFilter(next.typeFilter || `all`);
    setSortMode(next.sort || `recent`);
    setSideFilter(next.side || `all`);
    setTickerQuery(sanitizeTapeQuery(forcedQuery) || readTapeQueryFromLocation() || next.query || ``);
    setVisibleLimit(10);
  }, [stream, forcedQuery]);
  (0, l.useEffect)(() => {
    setVisibleLimit(10);
  }, [typeFilter, sortMode, sideFilter, tickerQuery]);
  let rows = (events || []).filter((e) => meta.types.includes(e.event_type || e.source_record_type));
  if (mixed && typeFilter !== `all`) {
    rows = rows.filter((e) => (e.event_type || e.source_record_type) === typeFilter);
  }
  let seen = new Set(),
    typedRows = [];
  for (let row of rows) {
    let key = `${row.short_title || row.title || ``}|${row.filing_date || ``}|${row.event_type || ``}`;
    if (seen.has(key)) continue;
    seen.add(key);
    typedRows.push(mergeCoverageOntoEvent(row, coverageMap));
    if (typedRows.length >= 100) break;
  }
  let sideOptions = actionFilterOptions(typedRows, stream);
  (0, l.useEffect)(() => {
    let allowed = new Set(sideOptions.map(([id]) => id));
    if (sideFilter !== `all` && !allowed.has(sideFilter)) setSideFilter(`all`);
  }, [stream, sideFilter, sideOptions]);
  let uniqueRows = applyTradeListControls(typedRows, {
    sort: sortMode,
    side: sideFilter,
    query: tickerQuery,
  });
  let shownRows = uniqueRows.slice(0, visibleLimit),
    canWatch = Boolean(authToken && onToggleWatch);
  return (0, w.jsxs)(`section`, {
    className: `vortx-page-section mx-auto max-w-6xl px-6 py-6`,
    children: [
      (0, w.jsxs)(`div`, {
        className: `vortx-page-hero`,
        children: [
          (0, w.jsx)(`h2`, {
            className: `display-font text-2xl text-ink`,
            children: meta.title,
          }),
          tapeHowToRead(meta.intro),
        ],
      }),
      showTypeToggle
        ? (0, w.jsxs)(`div`, {
            className: `vortx-trade-filters vortx-trade-filters--category mt-6`,
            children: [
              (0, w.jsx)(`p`, {
                className: `vortx-trade-filters__axis`,
                children: `Show`,
              }),
              (0, w.jsxs)(`div`, {
                className: `vortx-trade-filters__chips`,
                children: [
                  [
                    [`congress`, `Congress`],
                    [`insider`, `Insider`],
                    [`thirteenf`, `Funds`],
                  ].map(([id, label]) =>
                    (0, w.jsx)(
                      `button`,
                      {
                        type: `button`,
                        onClick: () => onOpenStream?.(id),
                        className:
                          stream === id
                            ? `vortx-trade-filter vortx-trade-filter--active`
                            : `vortx-trade-filter`,
                        children: label,
                      },
                      id,
                    ),
                  ),
                ],
              }),
            ],
          })
        : null,
      (0, w.jsxs)(`div`, {
        className: `mt-3 flex flex-wrap items-center gap-3`,
        children: [
          onOpenOverview
            ? (0, w.jsx)(`button`, {
                type: `button`,
                onClick: onOpenOverview,
                className: `text-sm text-muted underline-offset-4 hover:text-ink hover:underline`,
                children: `Today's Trades`,
              })
            : null,
        ],
      }),
      mixed
        ? (0, w.jsxs)(`div`, {
            className: `vortx-trade-filters vortx-trade-filters--category mt-6`,
            children: [
              (0, w.jsx)(`p`, {
                className: `vortx-trade-filters__axis`,
                children: `Who traded`,
              }),
              (0, w.jsxs)(`div`, {
                className: `vortx-trade-filters__chips`,
                children: [
                  [
                    [`all`, `All`],
                    [`form_4`, `Insiders`],
                    [`congress_trade`, `Congress`],
                    [`institutional_13f`, `Funds`],
                  ].map(([id, label]) =>
                    (0, w.jsx)(
                      `button`,
                      {
                        type: `button`,
                        onClick: () => setTypeFilter(id),
                        className:
                          typeFilter === id
                            ? `vortx-trade-filter vortx-trade-filter--active`
                            : `vortx-trade-filter`,
                        children: filterChipLabel(id, label),
                      },
                      id,
                    ),
                  ),
                ],
              }),
            ],
          })
        : null,
      (0, w.jsx)(tradeListControlBar, {
        streamKey: stream,
        sort: sortMode,
        side: sideFilter,
        query: tickerQuery,
        onSort: setSortMode,
        onSide: setSideFilter,
        onQuery: (q) => {
          setTickerQuery(q);
          onQueryChange?.(sanitizeTapeQuery(q));
        },
        sideOptions,
        showSideFilter: sideOptions.length > 1,
      }),
      feedLoading
        ? (0, w.jsx)(`div`, {
            className: `mt-4`,
            children: (0, w.jsx)(tapeSkeleton, {
              rows: 8,
              columnMode: tapeColumnMode({
                stream,
                typeFilter: mixed ? typeFilter : ``,
                rows: shownRows,
              }),
            }),
          })
        : uniqueRows.length
        ? (0, w.jsxs)(`div`, {
            className: `mt-4`,
            children: [
              (0, w.jsxs)(`p`, {
                className: `vortx-proof-chip mb-2`,
                children: [
                  `Showing `,
                  shownRows.length,
                  ` of `,
                  uniqueRows.length,
                  ` in this list`,
                ],
              }),
              (0, w.jsx)(tradingTapeTable, {
                rows: shownRows,
                onOpenPricing,
                starSet,
                watchFlashId,
                onToggleWatch,
                canWatch,
                columnMode: tapeColumnMode({
                  stream,
                  typeFilter: mixed ? typeFilter : ``,
                  rows: shownRows,
                }),
                onFilterTicker: setTickerQuery,
                onOpenWhale: openWhale,
              }),
              whaleId
                ? (0, w.jsx)(whaleWatchPanel, {
                    entityId: whaleId,
                    events: uniqueRows,
                    onClose: closeWhale,
                    onOpenPricing,
                    onToggleWatch,
                    starred: starSet.has(whaleId),
                    canWatch,
                  })
                : null,
              uniqueRows.length > visibleLimit
                ? (0, w.jsx)(`button`, {
                    type: `button`,
                    className: `vortx-load-more`,
                    onClick: () => setVisibleLimit((n) => n + 10),
                    children: `Load more`,
                  })
                : null,
              (0, w.jsxs)(`details`, {
                className: `vortx-more-block`,
                open: !0,
                children: [
                  (0, w.jsx)(`summary`, { children: meta.watchedTitle }),
                  (0, w.jsx)(mostWatchedModule, {
                    scope: meta.watchedScope,
                    title: meta.watchedTitle,
                    refreshKey: watchRefreshKey,
                    onOpenWhale: openWhale,
                  }),
                ],
              }),
            ],
          })
        : (0, w.jsxs)(`div`, {
            className: `mt-8 rounded-lg border border-dashed border-metallic p-6`,
            children: [
              (0, w.jsx)(`p`, {
                className: `text-sm text-muted`,
                children: feedPrivileged
                  ? stream === `congress`
                    ? `No STOCK Act rows in the live window yet. House PTR is index-only when clerk data is thin; Senate eFD is not live daily. Form 4 and 13F are live.`
                    : meta.empty
                  : meta.empty,
              }),
              (0, w.jsxs)(`div`, {
                className: `mt-4 flex flex-wrap gap-3`,
                children: feedPrivileged
                  ? [
                      onOpenStream
                        ? (0, w.jsx)(`button`, {
                            type: `button`,
                            onClick: () => onOpenStream(`insider`),
                            className: `terminal-button-solid rounded-xl px-4 py-2.5 text-sm font-semibold`,
                            children: `Open Insider Trades`,
                            key: `insider`,
                          })
                        : null,
                      onOpenStream
                        ? (0, w.jsx)(`button`, {
                            type: `button`,
                            onClick: () => onOpenStream(`thirteenf`),
                            className: `rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink`,
                            children: `Open Fund Holdings`,
                            key: `13f`,
                          })
                        : null,
                      onOpenOverview
                        ? (0, w.jsx)(`button`, {
                            type: `button`,
                            onClick: onOpenOverview,
                            className: `rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink`,
                            children: `Open Today's Trades`,
                            key: `ov`,
                          })
                        : null,
                    ]
                  : [
                      (0, w.jsx)(`button`, {
                        type: `button`,
                        onClick: onOpenPricing,
                        className: `terminal-button-solid rounded-xl px-4 py-2.5 text-sm font-semibold`,
                        children: primaryUnlockCta(),
                        key: `price`,
                      }),
                      onOpenOverview
                        ? (0, w.jsx)(`button`, {
                            type: `button`,
                            onClick: onOpenOverview,
                            className: `rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink`,
                            children: `Open Today's Trades`,
                            key: `ov2`,
                          })
                        : null,
                    ],
              }),
              (0, w.jsx)(`p`, {
                className: `mt-3 text-xs text-soft`,
                children: `Research only. Not trading, financial, or investment advice.`,
              }),
            ],
          }),
    ],
  });
}
function casesPublicView({ onOpenAdmin: e, isAdmin: t }) {
  let n = c({
    queryKey: [`public-cases-index`],
    queryFn: () => d(`/api/cases`),
  });
  return (0, w.jsxs)(`section`, {
    className: `mx-auto max-w-4xl px-6 py-10`,
    children: [
      (0, w.jsx)(`p`, { className: `eyebrow`, children: `Cases` }),
      (0, w.jsx)(`h2`, {
        className: `display-font mt-3 text-5xl text-ink`,
        children: `The layoff notice beat the headline`,
      }),
      (0, w.jsx)(`p`, {
        className: `mt-3 text-sm leading-6 text-muted`,
        children: `Short case files on WARN layoff notices from the public record. Public filings only. Not investment advice.`,
      }),
      t
        ? (0, w.jsxs)(`div`, {
            className: `mt-4 flex flex-wrap gap-3`,
            children: [
              (0, w.jsx)(`button`, {
                type: `button`,
                onClick: () => e(`admin`),
                className: `terminal-button-solid rounded-xl px-4 py-2.5 text-sm font-semibold`,
                children: `Open case review queue`,
              }),
              (0, w.jsx)(`a`, {
                href: `https://vortxmkt.substack.com`,
                target: `_blank`,
                rel: `noreferrer`,
                className: `inline-flex rounded-xl border border-metallic px-4 py-2.5 text-sm font-semibold text-muted no-underline transition hover:text-ink`,
                children: `Subscribe on Substack`,
              }),
            ],
          })
        : null,
      n.isLoading
        ? (0, w.jsx)(`p`, { className: `mt-8 text-sm text-muted`, children: `Loading published cases…` })
        : n.error
          ? (0, w.jsx)(`p`, {
              className: `mt-8 text-sm text-rose-300`,
              children: n.error instanceof Error ? n.error.message : `Could not load cases.`,
            })
          : (n.data?.cases || []).length
            ? (0, w.jsxs)(`div`, {
                className: `mt-8 space-y-4`,
                children: [
                  ...(n.data?.cases || []).map((r) =>
                    (0, w.jsxs)(
                      `article`,
                      {
                        className: `glass-panel rounded-2xl p-5`,
                        children: [
                          (0, w.jsx)(`h3`, {
                            className: `display-font text-2xl text-ink`,
                            children: (0, w.jsx)(`a`, {
                              href: `/cases/${r.slug}`,
                              className: `text-ink underline-offset-4 hover:underline`,
                              children: r.headline,
                            }),
                          }),
                          (0, w.jsx)(`p`, { className: `mt-2 text-sm text-muted`, children: r.dek || `` }),
                          (0, w.jsxs)(`p`, {
                            className: `data-font mt-2 text-xs text-soft`,
                            children: [
                              String(r.record_type || `record`).replace(/_/g, ` `),
                              r.published_at ? ` · ${String(r.published_at).slice(0, 10)}` : ``,
                            ],
                          }),
                        ],
                      },
                      r.slug,
                    ),
                  ),
                  (n.data?.cases || []).length < 3
                    ? (0, w.jsxs)(`div`, {
                        className: `glass-panel rounded-2xl border border-dashed border-metallic p-6`,
                        children: [
                          (0, w.jsx)(`p`, {
                            className: `eyebrow text-soft`,
                            children: `More coming`,
                          }),
                          (0, w.jsx)(`p`, {
                            className: `mt-2 text-sm leading-6 text-muted`,
                            children: `New case files publish regularly. Check back soon for WARN layoff stories.`,
                          }),
                        ],
                      })
                    : null,
                ],
              })
            : (0, w.jsxs)(`div`, {
                className: `mt-8 space-y-4`,
                children: [
                  (0, w.jsxs)(`div`, {
                    className: `glass-panel rounded-2xl border border-dashed border-metallic p-6`,
                    children: [
                      (0, w.jsx)(`p`, {
                        className: `eyebrow text-soft`,
                        children: `Coming soon`,
                      }),
                      (0, w.jsx)(`p`, {
                        className: `mt-2 text-sm leading-6 text-muted`,
                        children: `WARN layoff case files are in review. Meanwhile, open Layoff Search or Pricing to unlock the source trail.`,
                      }),
                      (0, w.jsxs)(`div`, {
                        className: `mt-4 flex flex-wrap gap-3`,
                        children: [
                          (0, w.jsx)(`a`, {
                            href: `/layoff-search`,
                            className: `terminal-button-solid inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold no-underline`,
                            children: `Search WARN notices`,
                          }),
                          (0, w.jsx)(`a`, {
                            href: `/pricing?plan=nebula`,
                            className: `inline-flex rounded-xl border border-metallic px-4 py-2.5 text-sm font-semibold text-muted no-underline transition hover:text-ink`,
                            children: `Unlock with Vortx`,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
    ],
  });
}
function adminCaseReviewQueue({ adminToken: e }) {
  let t = c({
      queryKey: [`admin-case-drafts`, e],
      queryFn: () => adminCasesDraftsApi(e),
      enabled: !!e,
      retry: !1,
    }),
    [n, r] = (0, l.useState)({}),
    [i, a] = (0, l.useState)(``),
    [busy, setBusy] = (0, l.useState)(!1);
  async function o(id, action, item) {
    a(`working...`);
    setBusy(!0);
    try {
      let edits =
        action === `approve`
          ? {
              body: n[id]?.body ?? item.body,
              video_script: n[id]?.video_script ?? item.video_script,
              headline: n[id]?.headline ?? item.headline,
              dek: n[id]?.dek ?? item.dek,
            }
          : void 0;
      let res = await adminCaseReviewApi(e, { id, action, edits });
      if (action === `approve`) {
        let bits = [`Published`];
        if (res?.discord?.posted) bits.push(`Discord ${res.discord.posted_count || 1} ch`);
        if (res?.substack?.posted) bits.push(`Substack live`);
        else if (res?.substack?.drafted) bits.push(`Substack draft`);
        else if (res?.substack_composer_url) bits.push(`Substack: copy/open composer`);
        if (res?.x?.posted) bits.push(`X posted`);
        a(bits.join(` · `));
        if (!res?.substack?.posted && res?.substack_post?.full_text) {
          try {
            await navigator.clipboard.writeText(res.substack_post.full_text);
          } catch {}
        }
      } else a(`Rejected`);
      await t.refetch();
    } catch (err) {
      a(err instanceof Error ? err.message : `Review failed.`);
    } finally {
      setBusy(!1);
    }
  }
  async function bulk(action) {
    if (
      !window.confirm(
        action === `approve_all`
          ? `Approve all pending drafts? Each publishes to Discord PNG channels and Substack when configured.`
          : `Reject all pending drafts?`,
      )
    )
      return;
    a(`bulk working...`);
    setBusy(!0);
    try {
      let res = await adminCaseReviewApi(e, { action });
      a(
        action === `approve_all`
          ? `Bulk approved ${res.published || 0} · failed ${res.failed || 0}`
          : `Bulk rejected ${res.rejected || 0}`,
      );
      await t.refetch();
    } catch (err) {
      a(err instanceof Error ? err.message : `Bulk review failed.`);
    } finally {
      setBusy(!1);
    }
  }
  async function generateDrafts() {
    a(`Generating case drafts...`);
    setBusy(!0);
    try {
      let res = await adminCasesGenerateApi(e, {});
      a(
        res?.skipped
          ? `Draft job skipped: ${res.skipped}`
          : `Draft job done · created ${res?.generated ?? 0} pending review`,
      );
      await t.refetch();
    } catch (err) {
      a(err instanceof Error ? err.message : `Generate failed.`);
    } finally {
      setBusy(!1);
    }
  }
  async function s(text, label) {
    try {
      (await navigator.clipboard.writeText(text), a(label || `Copied`));
    } catch {
      a(`Copy failed.`);
    }
  }
  if (t.isLoading)
    return (0, w.jsxs)(`div`, {
      id: `case-review-queue`,
      className: `mt-6 glass-panel rounded-3xl border border-terminal-blue/25 p-5`,
      children: [
        (0, w.jsx)(`p`, { className: `eyebrow`, children: `Case review queue` }),
        (0, w.jsx)(`p`, { className: `mt-2 text-sm text-muted`, children: `Loading AI drafts…` }),
      ],
    });
  if (t.error)
    return (0, w.jsxs)(`div`, {
      id: `case-review-queue`,
      className: `mt-6 glass-panel rounded-3xl border border-metallic p-5`,
      children: [
        (0, w.jsx)(`p`, { className: `eyebrow`, children: `Case review queue` }),
        (0, w.jsx)(`p`, {
          className: `mt-2 text-sm text-muted`,
          children:
            t.error instanceof Error
              ? t.error.message
              : `Could not load drafts. Confirm you are signed in as an active admin.`,
        }),
      ],
    });
  let u = t.data?.pending || [],
    d = t.data?.recent_published || [],
    f = t.data?.substack?.composer_url || ``,
    substackAuto = Boolean(t.data?.substack?.auto_publish_configured);
  return (0, w.jsxs)(`div`, {
    id: `case-review-queue`,
    className: `mt-6 glass-panel rounded-3xl border border-terminal-blue/25 p-5`,
    children: [
      (0, w.jsxs)(`div`, {
        className: `flex flex-wrap items-start justify-between gap-4`,
        children: [
          (0, w.jsxs)(`div`, {
            children: [
              (0, w.jsx)(`p`, {
                className: `eyebrow text-terminal-blue`,
                children: `Case review queue`,
              }),
              (0, w.jsx)(`p`, {
                className: `mt-1 text-xs text-soft`,
                children: substackAuto
                  ? `Approve publishes the case file, Discord PNG channels, and vortxmkt Substack.`
                  : `Approve publishes the case + Discord PNGs. Copy opens the Substack composer. Add a Substack session cookie only if you want auto-post.`,
              }),
            ],
          }),
          (0, w.jsxs)(`div`, {
            className: `flex flex-wrap gap-2`,
            children: [
              (0, w.jsx)(`button`, {
                type: `button`,
                disabled: busy,
                onClick: () => void generateDrafts(),
                className: `rounded-xl border border-terminal-blue/40 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900`,
                children: `Generate drafts`,
              }),
              u.length
                ? (0, w.jsx)(`button`, {
                    type: `button`,
                    disabled: busy,
                    onClick: () => void bulk(`approve_all`),
                    className: `terminal-button-solid rounded-xl px-3 py-2 text-xs font-semibold`,
                    children: `Approve all`,
                  })
                : null,
              u.length
                ? (0, w.jsx)(`button`, {
                    type: `button`,
                    disabled: busy,
                    onClick: () => void bulk(`reject_all`),
                    className: `rounded-xl border border-rose-300/40 px-3 py-2 text-xs font-semibold text-rose-700`,
                    children: `Reject all`,
                  })
                : null,
              (0, w.jsx)(`a`, {
                href: `/?view=cases`,
                className: `rounded-xl border border-white/10 px-3 py-2 text-xs text-muted transition hover:border-terminal-blue/40 hover:text-ink`,
                children: `Public cases index`,
              }),
              f
                ? (0, w.jsx)(`a`, {
                    href: f,
                    target: `_blank`,
                    rel: `noreferrer`,
                    className: `rounded-xl border border-white/10 px-3 py-2 text-xs text-muted transition hover:border-terminal-blue/40 hover:text-ink`,
                    children: `Open Substack composer`,
                  })
                : null,
            ],
          }),
        ],
      }),
      i
        ? (0, w.jsx)(`p`, {
            className: `mt-3 text-xs text-terminal-green`,
            children: i,
          })
        : null,
      u.length
        ? u.map((item) => {
            let sf = item.source_fields || {},
              bodyVal = n[item.id]?.body ?? item.body ?? ``,
              scriptVal = n[item.id]?.video_script ?? item.video_script ?? ``;
            return (0, w.jsxs)(
              `div`,
              {
                className: `mt-4 rounded-2xl border border-white/10 bg-black/40 p-4`,
                children: [
                  (0, w.jsxs)(`p`, {
                    className: `data-font text-xs text-soft`,
                    children: [
                      (item.record_type || `record`).replace(/_/g, ` `),
                      ` · pending review`,
                    ],
                  }),
                  (0, w.jsx)(`h3`, {
                    className: `display-font mt-2 text-2xl text-ink`,
                    children: item.headline,
                  }),
                  (0, w.jsx)(`p`, {
                    className: `mt-2 text-sm text-muted`,
                    children: item.dek || ``,
                  }),
                  (0, w.jsx)(`textarea`, {
                    className: `input mt-3 min-h-40 w-full text-sm`,
                    value: bodyVal,
                    onChange: (ev) =>
                      r((prev) => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], body: ev.target.value },
                      })),
                  }),
                  (0, w.jsx)(`p`, {
                    className: `mt-3 text-xs text-soft`,
                    children: `Video script (60-90s narration)`,
                  }),
                  (0, w.jsx)(`textarea`, {
                    className: `input mt-1 min-h-28 w-full text-sm`,
                    value: scriptVal,
                    onChange: (ev) =>
                      r((prev) => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], video_script: ev.target.value },
                      })),
                  }),
                  (0, w.jsxs)(`p`, {
                    className: `data-font mt-2 text-xs text-soft`,
                    children: [
                      `Source: `,
                      sf.entity_name || `n/a`,
                      ` · `,
                      sf.record_type || ``,
                      ` · filed `,
                      sf.filing_date || `n/a`,
                      ` · `,
                      sf.jurisdiction || ``,
                      Array.isArray(sf.named_parties) && sf.named_parties.length
                        ? ` · parties: ${sf.named_parties.map((p) => p.name).join(`, `)}`
                        : ``,
                    ],
                  }),
                  (0, w.jsxs)(`div`, {
                    className: `mt-3 flex flex-wrap gap-2`,
                    children: [
                      (0, w.jsx)(`button`, {
                        type: `button`,
                        disabled: busy,
                        className: `terminal-button-solid rounded-xl px-4 py-2 text-xs font-semibold`,
                        onClick: () => void o(item.id, `approve`, item),
                        children: substackAuto
                          ? `Approve · Discord · Substack`
                          : `Approve & publish`,
                      }),
                      (0, w.jsx)(`button`, {
                        type: `button`,
                        disabled: busy,
                        className: `rounded-xl border border-rose-300/40 px-4 py-2 text-xs font-semibold text-rose-200`,
                        onClick: () => void o(item.id, `reject`, item),
                        children: `Reject`,
                      }),
                      (0, w.jsx)(`button`, {
                        type: `button`,
                        className: `rounded-xl border border-white/10 px-3 py-2 text-xs text-muted`,
                        onClick: () => void s(scriptVal, `Video script copied`),
                        children: `Copy video script`,
                      }),
                      item.substack_post
                        ? (0, w.jsx)(`button`, {
                            type: `button`,
                            className: `rounded-xl border border-white/10 px-3 py-2 text-xs text-muted`,
                            onClick: () =>
                              void s(item.substack_post.full_text, `Substack post copied`),
                            children: `Copy Substack post`,
                          })
                        : null,
                    ],
                  }),
                ],
              },
              item.id,
            );
          })
        : (0, w.jsx)(`p`, {
            className: `mt-4 text-sm text-muted`,
            children: `No drafts waiting for review. Generate drafts pulls WARN layoff notices first. Reject leftover 13F drafts yourself.`,
          }),
      d.length
        ? (0, w.jsxs)(w.Fragment, {
            children: [
              (0, w.jsx)(`p`, {
                className: `mt-6 text-sm font-semibold text-ink`,
                children: `Recently published`,
              }),
              d.map((item) =>
                (0, w.jsxs)(
                  `div`,
                  {
                    className: `mt-3 rounded-2xl border border-white/10 bg-black/30 p-4`,
                    children: [
                      (0, w.jsx)(`p`, {
                        className: `text-sm text-ink`,
                        children: item.headline,
                      }),
                      (0, w.jsxs)(`div`, {
                        className: `mt-2 flex flex-wrap gap-2`,
                        children: [
                          (0, w.jsx)(`a`, {
                            href: `/cases/${item.slug}`,
                            target: `_blank`,
                            rel: `noreferrer`,
                            className: `text-xs text-terminal-blue underline underline-offset-4`,
                            children: `View live`,
                          }),
                          (0, w.jsx)(`button`, {
                            type: `button`,
                            className: `text-xs text-muted underline underline-offset-4`,
                            onClick: () => void s(item.video_script || ``, `Video script copied`),
                            children: `Copy video script`,
                          }),
                          item.substack_post
                            ? (0, w.jsx)(`button`, {
                                type: `button`,
                                className: `text-xs text-muted underline underline-offset-4`,
                                onClick: () =>
                                  void s(item.substack_post.full_text, `Substack post copied`),
                                children: `Copy Substack`,
                              })
                            : null,
                        ],
                      }),
                    ],
                  },
                  item.id,
                ),
              ),
            ],
          })
        : null,
    ],
  });
}
function casesStickyRail({ onOpenCases: onOpenCases, hidden: hidden }) {
  let q = c({
      queryKey: [`cases-sticky-rail`],
      queryFn: () => d(`/api/cases`),
      staleTime: 6e4,
      refetchInterval: 18e4,
    }),
    rows = (q.data?.cases || []).slice(0, 8);
  if (hidden) return null;
  return (0, w.jsxs)(`aside`, {
    className: `vortx-cases-rail`,
    "aria-label": `Case files feed`,
    children: [
      (0, w.jsxs)(`div`, {
        className: `vortx-cases-rail__head`,
        children: [
          (0, w.jsx)(`p`, { className: `eyebrow`, children: `Case files` }),
          (0, w.jsx)(`button`, {
            type: `button`,
            className: `vortx-cases-rail__all`,
            onClick: () => onOpenCases?.(),
            children: `All`,
          }),
        ],
      }),
      q.isLoading
        ? (0, w.jsx)(`p`, {
            className: `vortx-cases-rail__muted`,
            children: `Loading…`,
          })
        : rows.length
          ? (0, w.jsx)(`ul`, {
              className: `vortx-cases-rail__list`,
              children: rows.map((row) =>
                (0, w.jsx)(
                  `li`,
                  {
                    children: (0, w.jsxs)(`a`, {
                      href: `/cases/${row.slug}`,
                      className: `vortx-cases-rail__item`,
                      children: [
                        (0, w.jsx)(`span`, {
                          className: `vortx-cases-rail__type`,
                          children: String(row.record_type || `case`).replace(/_/g, ` `),
                        }),
                        (0, w.jsx)(`span`, {
                          className: `vortx-cases-rail__title`,
                          children: row.headline,
                        }),
                      ],
                    }),
                  },
                  row.id || row.slug,
                ),
              ),
            })
          : (0, w.jsx)(`p`, {
              className: `vortx-cases-rail__muted`,
              children: `New case files publish after admin approval.`,
            }),
      (0, w.jsx)(`a`, {
        href: `https://vortxmkt.substack.com`,
        target: `_blank`,
        rel: `noreferrer`,
        className: `vortx-cases-rail__substack`,
        children: `Substack`,
      }),
    ],
  });
}
function adminStreamerSpotlight({ adminToken: e }) {
  let t = c({
      queryKey: [`admin-stream-pulse`, e],
      queryFn: () => adminStreamPulseApi(e),
      enabled: !!e,
      retry: !1,
      refetchInterval: 12e4,
    }),
    [n, r] = (0, l.useState)(``);
  if (t.isLoading)
    return (0, w.jsxs)(`div`, {
      className: `mt-6 glass-panel rounded-3xl border border-terminal-amber/20 p-5`,
      children: [
        (0, w.jsx)(`p`, { className: `eyebrow`, children: `Streamer spotlight` }),
        (0, w.jsx)(`p`, {
          className: `mt-2 text-sm text-muted`,
          children: `Loading layoff-first demo leads…`,
        }),
      ],
    });
  if (t.error)
    return (0, w.jsxs)(`div`, {
      className: `mt-6 glass-panel rounded-3xl border border-metallic p-5`,
      children: [
        (0, w.jsx)(`p`, { className: `eyebrow`, children: `Streamer spotlight` }),
        (0, w.jsx)(`p`, {
          className: `mt-2 text-sm text-muted`,
          children: `Could not load stream pulse. Refresh after signing in as admin.`,
        }),
      ],
    });
  let a = t.data,
    o = a?.news_spotlight;
  async function i() {
    let e = (a?.overlay_lines || []).join(`
`);
    (await navigator.clipboard.writeText(e), r(`Copied overlay lines`));
  }
  return (0, w.jsxs)(`div`, {
    className: `mt-6 glass-panel rounded-3xl border border-terminal-amber/20 p-5`,
    children: [
      (0, w.jsxs)(`div`, {
        className: `flex flex-wrap items-start justify-between gap-4`,
        children: [
          (0, w.jsxs)(`div`, {
            children: [
              (0, w.jsx)(`p`, {
                className: `eyebrow text-terminal-amber`,
                children: `Streamer spotlight`,
              }),
              (0, w.jsx)(`p`, {
                className: `mt-1 text-xs text-soft`,
                children: `Admin only · layoff-first cases for streams and video`,
              }),
            ],
          }),
          (0, w.jsxs)(`button`, {
            type: `button`,
            onClick: () => void i(),
            className: `rounded-xl border border-white/10 px-3 py-2 text-xs text-muted transition hover:border-terminal-blue/40 hover:text-ink`,
            children: n || `Copy overlay lines`,
          }),
        ],
      }),
      (0, w.jsx)(`p`, {
        className: `mt-3 text-sm text-terminal-amber`,
        children: a?.stream_hook || `Trend-aligned public-record lead`,
      }),
      (0, w.jsx)(`p`, {
        className: `data-font mt-1 text-xs text-soft`,
        children: a?.pulse_line || `Pulse status unavailable`,
      }),
      Array.isArray(a?.config_warnings) && a.config_warnings.length
        ? (0, w.jsxs)(`div`, {
            className: `mt-3 rounded-xl border border-terminal-amber/35 bg-terminal-amber/10 p-3`,
            children: [
              (0, w.jsx)(`p`, {
                className: `text-xs font-semibold uppercase tracking-wide text-terminal-amber`,
                children: `Ops config warnings`,
              }),
              (0, w.jsx)(`ul`, {
                className: `mt-2 list-disc space-y-1 pl-4 text-xs text-ink`,
                children: a.config_warnings.map((line) =>
                  (0, w.jsx)(`li`, { children: line }, line),
                ),
              }),
            ],
          })
        : null,
      o
        ? (0, w.jsxs)(`div`, {
            className: `mt-4 rounded-2xl border border-white/10 bg-black/40 p-4`,
            children: [
              (0, w.jsx)(`p`, {
                className: `display-font text-2xl text-ink`,
                children: o.company,
              }),
              (0, w.jsxs)(`p`, {
                className: `data-font mt-1 text-xs text-muted`,
                children: [
                  o.type,
                  ` · `,
                  o.filed,
                  ` · `,
                  o.jurisdiction,
                  ` · score `,
                  o.score,
                ],
              }),
              (0, w.jsxs)(`div`, {
                className: `mt-3 flex flex-wrap gap-2`,
                children: [
                  (0, w.jsx)(`a`, {
                    href: o.signal_url,
                    className: `rounded-xl border border-terminal-blue/40 bg-terminal-blue/10 px-3 py-2 text-xs text-terminal-blue`,
                    children: `Open signal`,
                  }),
                  (0, w.jsx)(`a`, {
                    href: o.pricing_url,
                    className: `rounded-xl border border-white/10 px-3 py-2 text-xs text-muted`,
                    children: `Pricing page`,
                  }),
                ],
              }),
            ],
          })
        : null,
      (0, w.jsxs)(`div`, {
        className: `mt-4 grid gap-3 md:grid-cols-2`,
        children: [
          (0, w.jsxs)(`div`, {
            className: `rounded-2xl border border-metallic bg-black/30 p-4`,
            children: [
              (0, w.jsx)(`p`, {
                className: `data-font text-xs text-soft`,
                children: `Trending terms`,
              }),
              (0, w.jsx)(`p`, {
                className: `mt-2 text-sm text-ink`,
                children: (a?.trending_terms || []).slice(0, 4).join(` · `) || `n/a`,
              }),
              (0, w.jsxs)(`p`, {
                className: `data-font mt-2 text-xs text-terminal-green`,
                children: [a?.trendy_hashtag || `#PublicRecords`],
              }),
            ],
          }),
          (0, w.jsxs)(`div`, {
            className: `rounded-2xl border border-metallic bg-black/30 p-4`,
            children: [
              (0, w.jsx)(`p`, {
                className: `data-font text-xs text-soft`,
                children: `Active ingest runs`,
              }),
              (0, w.jsx)(`div`, {
                className: `mt-2 space-y-2`,
                children: (a?.active_ingest_runs || []).slice(0, 4).map((e) =>
                  (0, w.jsxs)(
                    `p`,
                    {
                      className: `data-font text-xs text-muted`,
                      children: [
                        e.name,
                        ` · `,
                        e.status,
                        e.last_success_at ? ` · ${e.last_success_at.slice(0, 16)}` : ``,
                      ],
                    },
                    e.slug,
                  ),
                ),
              }),
            ],
          }),
        ],
      }),
      (0, w.jsxs)(`div`, {
        className: `mt-4`,
        children: [
          (0, w.jsx)(`p`, {
            className: `data-font text-xs text-soft`,
                children: `Top layoff signals`,
          }),
          (0, w.jsx)(`div`, {
            className: `mt-2 grid gap-2 md:grid-cols-2`,
            children: (a?.top_signals || []).slice(0, 4).map((e) =>
              (0, w.jsxs)(
                `div`,
                {
                  className: `rounded-xl border border-white/10 bg-black/25 px-3 py-2`,
                  children: [
                    (0, w.jsx)(`p`, {
                      className: `text-sm text-ink`,
                      children: e.company,
                    }),
                    (0, w.jsxs)(`p`, {
                      className: `data-font mt-1 text-xs text-soft`,
                      children: [e.type, ` · `, e.filed, ` · score `, e.score],
                    }),
                  ],
                },
                e.slug,
              ),
            ),
          }),
        ],
      }),
    ],
  });
}
function ue({ token: e, onSession: t }) {
  let n = c({
    queryKey: [`admin-dashboard`, e],
    queryFn: () => v(e),
    enabled: !!e,
    retry: !1,
  });
  (0, l.useEffect)(() => {
    if (typeof window > `u`) return;
    let hash = window.location.hash.replace(/^#/, ``);
    if (hash !== `case-review-queue` && hash !== `cases`) return;
    let timer = window.setTimeout(() => {
      document.getElementById(`case-review-queue`)?.scrollIntoView({
        behavior: `smooth`,
        block: `start`,
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [e, n.data]);
  if (!e)
    return (0, w.jsx)($, {
      title: `Admin login`,
      copy: `Admin actions require Supabase Auth, an active admin profile, and Worker-side role verification.`,
      setupNote: `Bootstrap locally: add VORTX_ADMIN_EMAILS, VORTX_ADMIN_BOOTSTRAP_EMAIL, and VORTX_ADMIN_BOOTSTRAP_PASSWORD, then run npm run admin:bootstrap.`,
      targetView: `admin`,
      allowSignup: !1,
      onSession: t,
    });
  if (n.error)
    return (0, w.jsx)(`section`, {
      className: `mx-auto max-w-4xl px-6 py-12`,
      children: (0, w.jsxs)(`div`, {
        className: `glass-panel rounded-3xl p-6`,
        children: [
          (0, w.jsx)(`p`, { className: `eyebrow`, children: `Admin denied` }),
          (0, w.jsx)(`h2`, {
            className: `display-font mt-3 text-4xl text-ink`,
            children: `This account is not an active admin.`,
          }),
          (0, w.jsx)(`p`, {
            className: `mt-3 text-sm text-muted`,
            children:
              n.error instanceof Error
                ? n.error.message
                : `Admin role required.`,
          }),
        ],
      }),
    });
  async function r(t) {
    (await y(e, {
      slug: t.slug,
      enabled: !t.enabled,
      disabled_reason: `Disabled from admin console.`,
    }),
      await n.refetch());
  }
  async function i(t, r) {
    (await x(e, { id: t, status: r }), await n.refetch());
  }
  return (0, w.jsxs)(`section`, {
    className: `mx-auto max-w-6xl px-6 py-10`,
    children: [
      (0, w.jsx)(`p`, { className: `eyebrow`, children: `Admin Console` }),
      (0, w.jsx)(`h2`, {
        className: `display-font mt-3 text-5xl text-ink`,
        children: `Full operational control.`,
      }),
      (0, w.jsxs)(`div`, {
        className: `mt-4 flex flex-wrap gap-3`,
        children: [
          (0, w.jsx)(`button`, {
            type: `button`,
            onClick: () => {
              let el = document.getElementById(`case-review-queue`);
              el?.scrollIntoView({ behavior: `smooth`, block: `start` });
            },
            className: `terminal-button-solid rounded-xl px-4 py-2.5 text-sm font-semibold`,
            children: `Jump to case review queue`,
          }),
          (0, w.jsx)(`a`, {
            href: `/?view=cases`,
            className: `inline-flex rounded-xl border border-metallic px-4 py-2.5 text-sm font-semibold text-muted no-underline transition hover:text-ink`,
            children: `Public cases index`,
          }),
          (0, w.jsx)(`a`, {
            href: browseHref(`insider`),
            className: `inline-flex rounded-xl border border-metallic px-4 py-2.5 text-sm font-semibold text-muted no-underline transition hover:text-ink`,
            children: `Insider pulse`,
          }),
          (0, w.jsx)(`a`, {
            href: browseHref(`congress`),
            className: `inline-flex rounded-xl border border-metallic px-4 py-2.5 text-sm font-semibold text-muted no-underline transition hover:text-ink`,
            children: `Congress pulse`,
          }),
          (0, w.jsx)(`a`, {
            href: `/?view=customer`,
            className: `inline-flex rounded-xl border border-metallic px-4 py-2.5 text-sm font-semibold text-muted no-underline transition hover:text-ink`,
            children: `My Desk`,
          }),
        ],
      }),
      (0, w.jsxs)(`div`, {
        className: `glass-panel mt-6 rounded-2xl p-5`,
        children: [
          (0, w.jsx)(`p`, { className: `eyebrow`, children: `Where the trading desk lives` }),
          (0, w.jsx)(`p`, {
            className: `mt-2 text-sm leading-6 text-muted`,
            children: `Admin is ops (sources, audits, case review). The live trading feed lives on Insider Trades, Congress Trades, Fund Holdings, and My Desk. Dark mockups are not a separate admin route.`,
          }),
        ],
      }),
      (0, w.jsxs)(`div`, {
        className: `mt-6 grid gap-4 md:grid-cols-4`,
        children: [
          (0, w.jsxs)(`article`, {
            className: `glass-panel rounded-2xl p-5`,
            children: [
              (0, w.jsx)(`p`, {
                className: `data-font text-xs text-soft`,
                children: `users`,
              }),
              (0, w.jsx)(`p`, {
                className: `data-font mt-2 text-2xl text-terminal-blue`,
                children: n.data?.profiles.length ?? 0,
              }),
            ],
          }),
          (0, w.jsxs)(`article`, {
            className: `glass-panel rounded-2xl p-5`,
            children: [
              (0, w.jsx)(`p`, {
                className: `data-font text-xs text-soft`,
                children: `sources`,
              }),
              (0, w.jsx)(`p`, {
                className: `data-font mt-2 text-2xl text-terminal-blue`,
                children: n.data?.sources.length ?? 0,
              }),
            ],
          }),
          (0, w.jsxs)(`article`, {
            className: `glass-panel rounded-2xl p-5`,
            children: [
              (0, w.jsx)(`p`, {
                className: `data-font text-xs text-soft`,
                children: `audits`,
              }),
              (0, w.jsx)(`p`, {
                className: `data-font mt-2 text-2xl text-terminal-blue`,
                children: n.data?.audits.length ?? 0,
              }),
            ],
          }),
          (0, w.jsxs)(`article`, {
            className: `glass-panel rounded-2xl p-5`,
            children: [
              (0, w.jsx)(`p`, {
                className: `data-font text-xs text-soft`,
                children: `checkouts`,
              }),
              (0, w.jsx)(`p`, {
                className: `data-font mt-2 text-2xl text-terminal-blue`,
                children: n.data?.checkouts.length ?? 0,
              }),
            ],
          }),
        ],
      }),
      (0, w.jsx)(adminCaseReviewQueue, { adminToken: e }),
      (0, w.jsx)(adminStreamerSpotlight, { adminToken: e }),
      (0, w.jsx)(`p`, {
        className: `mt-3 text-xs text-soft`,
        children: `Streamer spotlight loads layoff-first, trend-aligned leads for video. Cases prefer WARN notices over 13F holdings. Copy overlay lines into OBS or your stream deck.`,
      }),
      (0, w.jsxs)(`div`, {
        className: `mt-6 glass-panel rounded-3xl p-5`,
        children: [
          (0, w.jsx)(`p`, { className: `eyebrow`, children: `Blind Spot Scanner` }),
          (0, w.jsxs)(`div`, {
            className: `mt-4 grid gap-4 md:grid-cols-4`,
            children: [
              (0, w.jsxs)(`div`, {
                children: [
                  (0, w.jsx)(`p`, { className: `data-font text-xs text-soft`, children: `scans (7d)` }),
                  (0, w.jsx)(`p`, {
                    className: `data-font mt-1 text-2xl text-terminal-blue`,
                    children: n.data?.ops?.blind_spot_scan_summary?.scans_last_7d ?? 0,
                  }),
                ],
              }),
              (0, w.jsxs)(`div`, {
                children: [
                  (0, w.jsx)(`p`, { className: `data-font text-xs text-soft`, children: `avg entities / scan` }),
                  (0, w.jsx)(`p`, {
                    className: `data-font mt-1 text-2xl text-terminal-blue`,
                    children: n.data?.ops?.blind_spot_scan_summary?.avg_entities_per_scan ?? 0,
                  }),
                ],
              }),
              (0, w.jsxs)(`div`, {
                children: [
                  (0, w.jsx)(`p`, { className: `data-font text-xs text-soft`, children: `email capture rate` }),
                  (0, w.jsx)(`p`, {
                    className: `data-font mt-1 text-2xl text-terminal-blue`,
                    children: n.data?.ops?.blind_spot_scan_summary?.email_capture_rate ?? 0,
                  }),
                ],
              }),
              (0, w.jsxs)(`div`, {
                children: [
                  (0, w.jsx)(`p`, { className: `data-font text-xs text-soft`, children: `top scanned entities` }),
                  (0, w.jsx)(`p`, {
                    className: `data-font mt-1 text-xs text-muted`,
                    children: (n.data?.ops?.blind_spot_scan_summary?.top_scanned_entities || [])
                      .slice(0, 5)
                      .map((row) => `${row.entity_id.slice(0, 8)}… (${row.scan_count})`)
                      .join(` · `) || `n/a`,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      (0, w.jsxs)(`div`, {
        className: `mt-6 glass-panel rounded-3xl p-5`,
        children: [
          (0, w.jsx)(`p`, {
            className: `eyebrow`,
            children: `Source controls`,
          }),
          (0, w.jsx)(`div`, {
            className: `mt-4 grid gap-3 md:grid-cols-2`,
            children: (n.data?.sources || []).map((e) =>
              (0, w.jsx)(
                `div`,
                {
                  className: `rounded-2xl border border-metallic bg-black/40 p-4`,
                  children: (0, w.jsxs)(`div`, {
                    className: `flex items-center justify-between gap-4`,
                    children: [
                      (0, w.jsxs)(`div`, {
                        children: [
                          (0, w.jsx)(`p`, {
                            className: `text-sm text-ink`,
                            children: e.name,
                          }),
                          (0, w.jsxs)(`p`, {
                            className: `data-font mt-1 text-xs text-soft`,
                            children: [e.slug, ` / `, e.record_type],
                          }),
                        ],
                      }),
                      (0, w.jsx)(`button`, {
                        type: `button`,
                        onClick: () => void r(e),
                        className: `text-xs text-terminal-blue underline underline-offset-4`,
                        children: e.enabled ? `disable` : `enable`,
                      }),
                    ],
                  }),
                },
                e.slug,
              ),
            ),
          }),
        ],
      }),
      (0, w.jsxs)(`div`, {
        className: `mt-6 glass-panel rounded-3xl p-5`,
        children: [
          (0, w.jsx)(`p`, {
            className: `eyebrow`,
            children: `Service fulfillment`,
          }),
          (0, w.jsx)(`div`, {
            className: `mt-4 grid gap-3 md:grid-cols-2`,
            children: (n.data?.service_requests || []).map((e) =>
              (0, w.jsx)(
                `div`,
                {
                  className: `rounded-2xl border border-metallic bg-black/40 p-4`,
                  children: (0, w.jsxs)(`div`, {
                    className: `flex items-start justify-between gap-4`,
                    children: [
                      (0, w.jsxs)(`div`, {
                        children: [
                          (0, w.jsx)(`p`, {
                            className: `text-sm text-ink`,
                            children: e.subject,
                          }),
                          (0, w.jsxs)(`p`, {
                            className: `data-font mt-1 text-xs text-soft`,
                            children: [
                              e.owner_email,
                              ` / `,
                              e.request_type,
                              ` / `,
                              e.priority,
                            ],
                          }),
                        ],
                      }),
                      (0, w.jsxs)(`select`, {
                        className: `input max-w-36 text-xs`,
                        value: e.status,
                        onChange: (t) => void i(e.id, t.target.value),
                        children: [
                          (0, w.jsx)(`option`, {
                            value: `queued`,
                            children: `queued`,
                          }),
                          (0, w.jsx)(`option`, {
                            value: `in_review`,
                            children: `in review`,
                          }),
                          (0, w.jsx)(`option`, {
                            value: `delivered`,
                            children: `delivered`,
                          }),
                          (0, w.jsx)(`option`, {
                            value: `closed`,
                            children: `closed`,
                          }),
                        ],
                      }),
                    ],
                  }),
                },
                e.id,
              ),
            ),
          }),
        ],
      }),
    ],
  });
}
function pricingCheckIcon(e) {
  return (0, w.jsx)(`span`, {
    className: e ? `vortx-pricing-check vortx-pricing-check--yes` : `vortx-pricing-check vortx-pricing-check--no`,
    "aria-hidden": `true`,
    children: e ? `✓` : `✕`,
  });
}
function acceptableUsePopover({
  open: e,
  checked: t,
  onCheck: n,
  onConfirm: r,
  onDismiss: a,
  pendingPlan: o,
}) {
  if (!e) return null;
  let s = F[o]?.name || o || `plan`;
  return (0, w.jsx)(`div`, {
    className: `vortx-aup-popover`,
    role: `dialog`,
    "aria-modal": `false`,
    "aria-label": `Acceptable use acknowledgement`,
    children: (0, w.jsxs)(`div`, {
      className: `vortx-aup-popover__panel`,
      children: [
        (0, w.jsx)(`p`, {
          className: `vortx-aup-popover__title`,
          children: `Quick confirm`,
        }),
        (0, w.jsxs)(`p`, {
          className: `vortx-aup-popover__hint`,
          children: [`One check for `, s, `, then Stripe.`],
        }),
        (0, w.jsxs)(`label`, {
          className: `vortx-aup-popover__label`,
          children: [
            (0, w.jsx)(`input`, {
              type: `checkbox`,
              className: `mt-0.5 accent-terminal-blue`,
              checked: t,
              onChange: (e) => n(e.target.checked),
            }),
            (0, w.jsxs)(`span`, {
              children: [
                `I agree this is public-record research only, not advice, and not a consumer report. I accept the `,
                (0, w.jsx)(`a`, {
                  href: `/legal`,
                  className: `underline underline-offset-4`,
                  children: `Legal notice`,
                }),
                `.`,
              ],
            }),
          ],
        }),
        (0, w.jsxs)(`div`, {
          className: `vortx-aup-popover__actions`,
          children: [
            (0, w.jsx)(`button`, {
              type: `button`,
              onClick: r,
              disabled: !t,
              className: `vortx-aup-popover__confirm`,
              children: `Continue to Stripe`,
            }),
            (0, w.jsx)(`button`, {
              type: `button`,
              onClick: a,
              className: `vortx-aup-popover__dismiss`,
              children: `Not now`,
            }),
          ],
        }),
      ],
    }),
  });
}
function pricingCard({
  plan: e,
  meta: t,
  featured: n,
  checkoutLoading: r,
  onCheckout: a,
  onRequestAccess: o,
  aupChecked: aupChecked = !1,
}) {
  let s = e.plan === `custom`,
    limited = e.plan === `scout` || e.plan === `sentinel`,
    c = s ? `Custom quote` : L[e.plan] || e.monthly_price,
    lTag = PRICING_CARD_TAGLINES[e.plan] || t.outcome,
    d = r === e.plan,
    planName =
      String(t.name || ``).trim() ||
      String(e.label || ``).trim() ||
      String(e.plan || ``).trim(),
    bandLabel =
      e.plan === `pulsar` || e.plan === `supernova` || e.plan === `galactic`
        ? `API & data`
          : limited
            ? `Limited · names hidden`
          : n
            ? `Featured`
            : `Retail`,
    p = s
      ? `Contact sales`
      : n
        ? `Start 7-day trial → ${c}`
        : limited
          ? `Start limited · names hidden`
          : `Choose ${planName}`,
    handleClick = () => {
      s ? o?.() : a(e.plan);
    },
    ctaBlocked = !1,
    renderCta = (i) =>
      (0, w.jsx)(`button`, {
        type: `button`,
        onClick: handleClick,
        disabled: d || ctaBlocked,
        "aria-disabled": d || ctaBlocked ? `true` : `false`,
        title: void 0,
        "aria-describedby": s ? void 0 : `pricing-aup`,
        className:
          i === `primary` || n
            ? `vortx-pricing-card__cta vortx-pricing-card__cta--primary`
            : `vortx-pricing-card__cta`,
        children: d ? `Opening checkout…` : p,
      }),
    cardClass = n
      ? `vortx-pricing-card vortx-pricing-card--featured`
      : limited
        ? `vortx-pricing-card vortx-pricing-card--limited`
        : `vortx-pricing-card`;
  return (0, w.jsxs)(`article`, {
    id: `pricing-tier-${e.plan}`,
    className: cardClass,
    children: [
      n
        ? (0, w.jsx)(`span`, {
            className: `vortx-pricing-card__ribbon`,
            children: `Most popular`,
          })
        : null,
      (0, w.jsxs)(`div`, {
        className: n
          ? `vortx-pricing-card__header vortx-pricing-card__header--featured`
          : `vortx-pricing-card__header`,
        children: [
          n
            ? null
            : (0, w.jsx)(`p`, {
                className: `vortx-pricing-card__eyebrow`,
                children: bandLabel,
              }),
          (0, w.jsx)(`h3`, {
            className: `vortx-pricing-card__title`,
            children: planName,
          }),
          (0, w.jsx)(`p`, {
            className: `vortx-pricing-card__price`,
            children: c,
          }),
          (0, w.jsx)(`p`, {
            className: `vortx-pricing-card__billing`,
            children: `Billed monthly · cancel anytime`,
          }),
        ],
      }),
      (0, w.jsx)(`p`, {
        className: n
          ? `vortx-pricing-card__tag vortx-pricing-card__tag--featured`
          : `vortx-pricing-card__tag`,
        children: lTag,
      }),
      e.plan === `scout` || e.plan === `sentinel`
        ? (0, w.jsx)(`p`, {
            className: `vortx-pricing-card__alert-note`,
            children: t.subAlert,
          })
        : null,
      e.plan === `nebula`
        ? (0, w.jsx)(`p`, {
            className: `vortx-pricing-card__alert-note vortx-pricing-card__alert-note--nebula`,
            children: `See the lawmaker or insider on each trade. Watch a name and we email you when they file again.`,
          })
        : null,
      renderCta(`primary`),
      (0, w.jsx)(`ul`, {
        className: `vortx-pricing-card__features`,
        children: PRICING_CARD_CHECKLIST.map((t) => {
          let n = t.has(e),
            r = typeof t.label === `function` ? t.label(e) : t.label;
          return (0, w.jsxs)(
            `li`,
            {
              className: n
                ? `vortx-pricing-card__feature vortx-pricing-card__feature--yes`
                : `vortx-pricing-card__feature vortx-pricing-card__feature--no`,
              children: [pricingCheckIcon(n), (0, w.jsx)(`span`, { children: r })],
            },
            r,
          );
        }),
      }),
    ],
  });
}
function pricingCardsGrid({
  plans: e,
  checkoutLoading: n,
  onCheckout: r,
  onRequestAccess: a,
  planIds: planIds = PRICING_CARD_PLANS,
  showCustom: showCustom = !0,
  eyebrow: eyebrow = `Choose your plan`,
  subcopy: subcopy = `Every visitor sees ticker, buy/sell, company, and a person desk. Paid plans add the name, unusual size, and email when they file again.`,
  aupChecked: aupChecked = !1,
}) {
  let o = (0, l.useMemo)(() => {
      let t = new Map(e.map((e) => [e.plan, e]));
      return planIds.map((n) => {
        let r = t.get(n),
          i = F[n],
          limits = PLAN_LIMIT_FALLBACKS[n] || { watchlist_limit: 0, alert_limit: 0 };
        if (r) {
          return {
            ...r,
            watchlist_limit:
              r.watchlist_limit == null || Number(r.watchlist_limit) === 0
                ? limits.watchlist_limit
                : r.watchlist_limit,
            alert_limit:
              r.alert_limit == null || Number(r.alert_limit) === 0
                ? limits.alert_limit
                : r.alert_limit,
          };
        }
        return i
          ? {
              plan: n,
              label: i.name,
              monthly_price: L[n] || `Custom`,
              watchlist_limit: limits.watchlist_limit,
              alert_limit: limits.alert_limit,
            }
          : null;
      }).filter(Boolean);
    }, [e, planIds]),
    s = (e) => F[e.plan] || { name: e.label, outcome: ``, copy: ``, subAlert: null };
  return (0, w.jsxs)(`div`, {
    className: `mt-8`,
    children: [
      (0, w.jsx)(`p`, {
        className: `eyebrow`,
        children: eyebrow,
      }),
      (0, w.jsx)(`p`, {
        className: `mt-2 max-w-2xl text-sm leading-6 text-muted`,
        children: subcopy,
      }),
      (0, w.jsx)(`div`, {
        className: `vortx-pricing-grid mt-6`,
        children: o.map((e) =>
          (0, w.jsx)(
            pricingCard,
            {
              plan: e,
              meta: s(e),
              featured: e.plan === FEATURED_PLAN_ID,
              checkoutLoading: n,
              onCheckout: r,
              onRequestAccess: a,
              aupChecked,
            },
            e.plan,
          ),
        ),
      }),
      showCustom
        ? (0, w.jsxs)(`article`, {
            className: `vortx-pricing-card vortx-pricing-card--custom mt-8 max-w-2xl`,
            children: [
              (0, w.jsxs)(`div`, {
                className: `vortx-pricing-card__header`,
                children: [
                  (0, w.jsx)(`p`, {
                    className: `vortx-pricing-card__eyebrow`,
                    children: `Custom quote`,
                  }),
                  (0, w.jsx)(`h3`, {
                    className: `vortx-pricing-card__title`,
                    children: `Custom`,
                  }),
                  (0, w.jsx)(`p`, {
                    className: `vortx-pricing-card__price`,
                    children: `Custom quote`,
                  }),
                ],
              }),
              (0, w.jsx)(`div`, {
                className: `vortx-pricing-card__body`,
                children: (0, w.jsx)(`p`, {
                  className: `vortx-pricing-card__copy`,
                  children: F.custom.copy,
                }),
              }),
              (0, w.jsx)(`button`, {
                type: `button`,
                onClick: () => a?.(),
                className: `vortx-pricing-card__cta vortx-pricing-card__cta--primary`,
                children: `Contact sales`,
              }),
            ],
          })
        : null,
    ],
  });
}
function de({
  plans: e,
  onRequestAccess: t,
  teamsLine: ln,
  companiesTracked: ct,
  recordsSurfaced: rs,
  subscriberCount: dc,
  scanEntityIds: scanIds,
  authEmail: authEmail,
  authToken: authToken,
  marketing: mk,
}) {
  let featured = featuredExample(mk),
    [n, r] = (0, l.useState)(``),
    [a, o] = (0, l.useState)(``),
    [s, c] = (0, l.useState)(!1),
    [aupOpen, setAupOpen] = (0, l.useState)(!1),
    [pendingPlan, setPendingPlan] = (0, l.useState)(``),
    checkoutSuccess = (0, l.useMemo)(() => {
      if (typeof window > `u`) return null;
      let e = new URLSearchParams(window.location.search);
      return e.get(`checkout`) === `success` ? e.get(`plan`) || `your plan` : null;
    }, []),
    u = (0, l.useMemo)(
      () => [...e].sort((e, t) => I.indexOf(e.plan) - I.indexOf(t.plan)),
      [e],
    );
  (0, l.useEffect)(() => {
    if (typeof window > `u`) return;
    let e = new URLSearchParams(window.location.search).get(`plan`);
    if (!e) return;
    let t = window.setTimeout(() => {
      if (PRICING_API_PLANS.includes(e)) {
        let n = document.getElementById(`pricing-api-plans`);
        if (n) n.open = !0;
      }
      if (PRICING_LIMITED_PLANS.includes(e)) {
        let n = document.getElementById(`pricing-limited-plans`);
        if (n) n.open = !0;
      }
      document.getElementById(`pricing-tier-${e}`)?.scrollIntoView({ behavior: `smooth`, block: `center` });
    }, 120);
    return () => window.clearTimeout(t);
  }, []);
  async function runCheckout(e) {
    o(e);
    try {
      await C(e, authEmail || void 0, authToken || void 0, {
        accepted: s,
        acceptedAt: new Date().toISOString(),
      });
    } catch (e) {
      r(e instanceof Error ? e.message : `Checkout failed.`);
    } finally {
      (o(``), setPendingPlan(``));
    }
  }
  async function d(e) {
    if ((r(``), !s)) {
      trackMarketingStep(`aup_shown`, e);
      setPendingPlan(e);
      setAupOpen(!0);
      return;
    }
    // trial_start is recorded once from the Stripe webhook (subscription.created + trialing).
    await runCheckout(e);
  }
  (0, l.useEffect)(() => {
    if (checkoutSuccess) trackMarketingStep(`checkout_success_view`, String(checkoutSuccess));
  }, [checkoutSuccess]);
  return (0, w.jsxs)(`section`, {
    className: `vortx-page-section mx-auto max-w-6xl px-6 py-10`,
    children: [
      (0, w.jsxs)(`div`, {
        className: `vortx-page-hero`,
        children: [
          (0, w.jsx)(`p`, { className: `eyebrow`, children: PRICING_COPY.eyebrow }),
          (0, w.jsx)(`h2`, {
            className: `display-font text-5xl text-ink`,
            children: PRICING_COPY.headline,
          }),
          (0, w.jsx)(`p`, {
            className: `max-w-3xl text-base leading-7 text-muted`,
            children: PRICING_COPY.subcopy,
          }),
          (0, w.jsxs)(`div`, {
            className: `vortx-pricing-why mt-6 grid gap-3 md:grid-cols-2`,
            children: [
              (0, w.jsxs)(`article`, {
                className: `glass-panel rounded-2xl p-4`,
                children: [
                  (0, w.jsx)(`p`, {
                    className: `eyebrow text-terminal-blue`,
                    children: PRICING_COPY.levelTitle,
                  }),
                  (0, w.jsx)(`p`, {
                    className: `mt-2 text-sm leading-6 text-muted`,
                    children: PRICING_COPY.levelCopy,
                  }),
                ],
              }),
              (0, w.jsxs)(`article`, {
                className: `glass-panel rounded-2xl p-4`,
                children: [
                  (0, w.jsx)(`p`, {
                    className: `eyebrow text-terminal-blue`,
                    children: PRICING_COPY.timingTitle,
                  }),
                  (0, w.jsx)(`p`, {
                    className: `mt-2 text-sm leading-6 text-muted`,
                    children: PRICING_COPY.timingCopy,
                  }),
                ],
              }),
            ],
          }),
          ctaReassureLine({ className: `max-w-3xl text-sm leading-6 text-muted` }),
        ],
      }),
      checkoutSuccess
        ? (0, w.jsxs)(`div`, {
            className: `glass-panel mt-6 max-w-3xl rounded-2xl border border-terminal-green/35 p-4`,
            children: [
              (0, w.jsx)(`p`, {
                className: `text-sm font-medium text-terminal-green`,
                children: `Payment received for ${checkoutSuccess}.`,
              }),
              (0, w.jsx)(`p`, {
                className: `mt-2 text-sm font-semibold text-ink`,
                children: `Next: open today's trades and pick one name to watch.`,
              }),
              (0, w.jsxs)(`p`, {
                className: `mt-2 text-sm leading-6 text-muted`,
                children: [
                  `Use the same email as Stripe. `,
                  (0, w.jsx)(`a`, {
                    href: `/?view=customer&onboard=watch`,
                    className: `text-terminal-blue underline underline-offset-4`,
                    children: `Open desk · watch someone →`,
                  }),
                ],
              }),
            ],
          })
        : null,
      n
        ? (0, w.jsx)(`div`, {
            className: `mt-5 rounded-2xl border border-rose-300/20 bg-rose-950/20 p-4 text-sm text-rose-100`,
            children: n,
          })
        : null,
      (0, w.jsx)(`p`, {
        className: `mt-8 text-sm text-muted`,
        children: `Sign in before checkout, or use the same email at Stripe and when you create your Vortx account. Checkout never shows your address on this page.`,
      }),
      scanIds?.length
        ? (0, w.jsxs)(`div`, {
            className: `glass-panel mt-4 max-w-3xl rounded-2xl border border-terminal-blue/30 bg-terminal-blue/5 p-4`,
            children: [
              (0, w.jsx)(`p`, {
                className: `eyebrow`,
                children: `From your company scan`,
              }),
              (0, w.jsxs)(`p`, {
                className: `mt-2 text-sm leading-6 text-ink`,
                children: [
                  `Subscribe to pre-load ongoing monitoring for `,
                  scanIds.length,
                  ` scanned entit`,
                  scanIds.length === 1 ? `y` : `ies`,
                  `.`,
                ],
              }),
            ],
          })
        : null,
      (0, w.jsxs)(`label`, {
        id: `pricing-aup`,
        className: `mt-6 flex max-w-3xl cursor-pointer items-start gap-2 text-sm leading-6 text-muted`,
        children: [
          (0, w.jsx)(`input`, {
            type: `checkbox`,
            className: `mt-1 accent-terminal-blue`,
            checked: s,
            onChange: (ev) => {
              c(ev.target.checked);
              if (ev.target.checked) trackMarketingStep(`aup_accept`, `inline`);
            },
          }),
          (0, w.jsx)(`span`, {
            children: `I understand this is public-record research only, not investment, trading, or legal advice.`,
          }),
        ],
      }),
      (0, w.jsx)(pricingCardsGrid, {
        plans: u,
        checkoutLoading: a,
        onCheckout: d,
        onRequestAccess: t,
        planIds: PRICING_RETAIL_PLANS,
        showCustom: !1,
        aupChecked: s,
        eyebrow: `What you get`,
        subcopy: `Vortx plans: the $150/month plan (Nebula) shows the person who filed, a link to the original document, watchlists, and email alerts. Scout ($20) and Sentinel ($50) keep a few names open on the public tape. Full names on every row start at $150/month. 7-day trial, card required.`,
      }),
      (0, w.jsx)(`p`, {
        className: `mt-4 max-w-3xl text-sm leading-6 text-muted`,
        children: `Ticker, buy/sell, and company stay free. Pay only if you want the names and alerts.`,
      }),
      (0, w.jsxs)(`details`, {
        id: `pricing-api-plans`,
        className: `glass-panel mt-6 rounded-2xl p-5`,
        children: [
          (0, w.jsxs)(`summary`, {
            className: `cursor-pointer list-none`,
            children: [
              (0, w.jsx)(`p`, { className: `eyebrow`, children: `API plans` }),
              (0, w.jsx)(`h3`, {
                className: `display-font mt-2 text-3xl text-ink`,
                children: PRICING_COPY.investorToggle,
              }),
              (0, w.jsx)(`p`, {
                className: `mt-2 max-w-3xl text-sm leading-6 text-muted`,
                children: PRICING_COPY.investorSubcopy,
              }),
            ],
          }),
          (0, w.jsx)(`div`, {
            className: `mt-6`,
            children: (0, w.jsx)(pricingCardsGrid, {
              plans: u,
              checkoutLoading: a,
              onCheckout: d,
              onRequestAccess: t,
              planIds: PRICING_API_PLANS,
              showCustom: !0,
              aupChecked: s,
              eyebrow: `API & higher limits`,
              subcopy: `For desks that need exports, source URLs, and higher watchlist caps.`,
            }),
          }),
          (0, w.jsxs)(`p`, {
            className: `mt-4 max-w-3xl text-sm leading-6 text-muted`,
            children: [
              `Operator and Professional include individual CSV export. Enterprise adds the filtered bounds API and visible-map export. `,
              (0, w.jsx)(`a`, {
                href: `/docs/map-api.html`,
                className: `font-semibold text-terminal-blue underline underline-offset-4`,
                children: `Read the Enterprise Map API docs`,
              }),
              `.`,
            ],
          }),
          (0, w.jsxs)(`blockquote`, {
            className: `glass-panel mt-8 max-w-3xl rounded-2xl p-5`,
            children: [
              (0, w.jsxs)(`p`, {
                className: `text-sm leading-7 text-ink`,
                children: [`"`, RESEARCHER_TRUST_QUOTE.quote, `"`],
              }),
              (0, w.jsxs)(`footer`, {
                className: `mt-3 text-xs text-muted`,
                children: [
                  RESEARCHER_TRUST_QUOTE.name,
                  `, `,
                  RESEARCHER_TRUST_QUOTE.title,
                  `, `,
                  RESEARCHER_TRUST_QUOTE.company,
                ],
              }),
            ],
          }),
        ],
      }),
      (0, w.jsx)(acceptableUsePopover, {
        open: aupOpen,
        checked: s,
        onCheck: (next) => {
          c(next);
          if (next) trackMarketingStep(`aup_accept`, pendingPlan || `popover`);
        },
        onConfirm: () => {
          if (!s || !pendingPlan) return;
          setAupOpen(!1);
          void runCheckout(pendingPlan);
        },
        onDismiss: () => {
          setAupOpen(!1);
          setPendingPlan(``);
        },
        pendingPlan,
      }),
    ],
  });
}
function fe() {
  return (0, w.jsx)(`section`, {
    className: `vortx-legal-page mx-auto max-w-6xl px-6 py-10`,
    "aria-labelledby": `vortx-legal-title`,
    children: (0, w.jsxs)(`div`, {
      className: `vortx-legal-shell`,
      children: [
        (0, w.jsx)(`p`, { className: `vortx-legal-kicker`, children: `Legal notice` }),
        (0, w.jsx)(`h1`, {
          id: `vortx-legal-title`,
          className: `vortx-legal-title`,
          children: `Vortx Data LLC public-records notice`,
        }),
        (0, w.jsx)(`p`, {
          className: `vortx-legal-lead`,
          children: O,
        }),
        (0, w.jsxs)(`p`, {
          className: `vortx-legal-meta`,
          children: [
            `Effective September 10, 2026 · Vortx Data LLC · `,
            (0, w.jsx)(`a`, {
              className: `vortx-legal-mail`,
              href: `mailto:contact@vortxmkt.com`,
              children: `contact@vortxmkt.com`,
            }),
          ],
        }),
        (0, w.jsx)(`p`, {
          className: `vortx-legal-banner`,
          children: `Research only. Vortx is not a consumer reporting agency and this is not a consumer report. Do not use it to hire, fire, rent, lend, insure, or make any other FCRA eligibility decision.`,
        }),
        (0, w.jsx)(`nav`, {
          "aria-label": `Notice sections`,
          children: (0, w.jsx)(`ul`, {
            className: `vortx-legal-toc`,
            children: j.map((e) =>
              (0, w.jsx)(
                `li`,
                {
                  children: (0, w.jsx)(`a`, {
                    href: `#${String(e.title)
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, `-`)
                      .replace(/^-+|-+$/g, ``)
                      .slice(0, 80)}`,
                    children: e.title,
                  }),
                },
                e.title,
              ),
            ),
          }),
        }),
        (0, w.jsx)(`div`, {
          className: `vortx-legal-grid`,
          children: j.map((e) =>
            (0, w.jsxs)(
              `article`,
              {
                id: String(e.title)
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, `-`)
                  .replace(/^-+|-+$/g, ``)
                  .slice(0, 80),
                className: `vortx-legal-card`,
                children: [
                  (0, w.jsx)(`h2`, { children: e.title }),
                  (0, w.jsx)(`p`, { children: e.copy }),
                ],
              },
              e.title,
            ),
          ),
        }),
        (0, w.jsx)(`p`, {
          className: `vortx-legal-foot`,
          children: `By using vortxmkt.com or any Vortx product, you agree to this notice. If you do not agree, do not use the site. Paid plans may add a subscriber agreement; if those conflict, the subscriber agreement controls for paid features. This page is not a substitute for advice from your own counsel. Print or save this page. Questions: contact@vortxmkt.com.`,
        }),
      ],
    }),
  });
}
function pe({ open: e, onClose: t }) {
  let [n, r] = (0, l.useState)({
      name: ``,
      email: ``,
      company: ``,
      use_case: `credit`,
      message: ``,
      website: ``,
    }),
    [i, a] = (0, l.useState)(`idle`),
    [o, s] = (0, l.useState)(``);
  async function c() {
    (s(``), a(`loading`));
    try {
      (await S(n), a(`sent`));
    } catch (e) {
      (a(`idle`), s(e instanceof Error ? e.message : `Request failed.`));
    }
  }
  return e
    ? (0, w.jsx)(`div`, {
        className: `fixed inset-0 z-50 bg-black/85 px-4 py-10 backdrop-blur-md`,
        role: `dialog`,
        "aria-modal": `true`,
        children: (0, w.jsxs)(`div`, {
          className: `glass-panel mx-auto max-w-xl rounded-3xl p-5`,
          children: [
            (0, w.jsxs)(`div`, {
              className: `flex items-start justify-between gap-4`,
              children: [
                (0, w.jsxs)(`div`, {
                  children: [
                    (0, w.jsx)(`p`, {
                      className: `eyebrow`,
                      children: `Access Briefing`,
                    }),
                    (0, w.jsx)(`h2`, {
                      className: `display-font mt-3 text-4xl text-ink`,
                      children: `Tell us the mandate.`,
                    }),
                    (0, w.jsx)(`p`, {
                      className: `mt-3 text-sm leading-6 text-muted`,
                      children: `We qualify serious teams around use case, source coverage, and delivery workflow. No public claims, no redistribution, no automated advice.`,
                    }),
                  ],
                }),
                (0, w.jsx)(`button`, {
                  type: `button`,
                  onClick: t,
                  className: `data-font text-xs text-soft underline underline-offset-4`,
                  children: `close`,
                }),
              ],
            }),
            i === `sent`
              ? (0, w.jsx)(`div`, {
                  className: `mt-6 rounded-2xl border border-terminal-green/20 bg-terminal-green/10 p-4 text-sm text-terminal-green`,
                  children: `Request queued. We will review fit and source coverage before opening a sales conversation.`,
                })
              : (0, w.jsxs)(`div`, {
                  className: `mt-6 grid gap-3`,
                  children: [
                    (0, w.jsx)(`input`, {
                      className: `input hidden`,
                      tabIndex: -1,
                      autoComplete: `off`,
                      value: n.website,
                      onChange: (e) => r({ ...n, website: e.target.value }),
                    }),
                    (0, w.jsx)(`input`, {
                      className: `input w-full`,
                      value: n.name,
                      onChange: (e) => r({ ...n, name: e.target.value }),
                      placeholder: `Name`,
                    }),
                    (0, w.jsx)(`input`, {
                      className: `input w-full`,
                      value: n.email,
                      onChange: (e) => r({ ...n, email: e.target.value }),
                      type: `email`,
                      placeholder: `Work email`,
                    }),
                    (0, w.jsx)(`input`, {
                      className: `input w-full`,
                      value: n.company,
                      onChange: (e) => r({ ...n, company: e.target.value }),
                      placeholder: `Company / fund / firm`,
                    }),
                    (0, w.jsxs)(`select`, {
                      className: `input w-full`,
                      value: n.use_case,
                      onChange: (e) => r({ ...n, use_case: e.target.value }),
                      children: [
                        (0, w.jsx)(`option`, {
                          value: `investors`,
                          children: `Investor / trader due diligence`,
                        }),
                        (0, w.jsx)(`option`, {
                          value: `smb`,
                          children: `Small business ; vendor & client vetting`,
                        }),
                        (0, w.jsx)(`option`, {
                          value: `journalism`,
                          children: `Journalism / research`,
                        }),
                        (0, w.jsx)(`option`, {
                          value: `real_estate`,
                          children: `Real estate ; liens & title diligence`,
                        }),
                        (0, w.jsx)(`option`, {
                          value: `legal_ops`,
                          children: `Paralegal / legal ops`,
                        }),
                        (0, w.jsx)(`option`, {
                          value: `hr_workforce`,
                          children: `HR / workforce planning`,
                        }),
                        (0, w.jsx)(`option`, {
                          value: `credit`,
                          children: `Credit / portfolio monitoring`,
                        }),
                        (0, w.jsx)(`option`, {
                          value: `litigation`,
                          children: `Litigation analytics`,
                        }),
                        (0, w.jsx)(`option`, {
                          value: `collections`,
                          children: `Collections / recovery`,
                        }),
                        (0, w.jsx)(`option`, {
                          value: `competitive`,
                          children: `Competitive intelligence`,
                        }),
                        (0, w.jsx)(`option`, {
                          value: `other`,
                          children: `Other`,
                        }),
                      ],
                    }),
                    (0, w.jsx)(`textarea`, {
                      className: `input min-h-28 w-full`,
                      value: n.message,
                      onChange: (e) => r({ ...n, message: e.target.value }),
                      placeholder: `What jurisdictions, entities, or signals matter?`,
                    }),
                    (0, w.jsx)(`button`, {
                      type: `button`,
                      onClick: () => void c(),
                      disabled: i === `loading`,
                      className: `text-left text-sm text-terminal-blue underline underline-offset-4 transition duration-200 hover:text-ink disabled:opacity-60`,
                      children:
                        i === `loading`
                          ? `queueing...`
                          : `see last week's signals`,
                    }),
                  ],
                }),
            o
              ? (0, w.jsx)(`p`, {
                  className: `mt-3 text-sm text-rose-200`,
                  children: o,
                })
              : null,
          ],
        }),
      })
    : null;
}
function scanLockedEventPreview({ recordType: e, filingDate: t, jurisdiction: n, label: r }) {
  return (0, w.jsxs)(`div`, {
    className: `rounded-xl border border-metallic bg-black/50 p-4`,
    children: [
      (0, w.jsx)(`p`, {
        className: `text-xs uppercase tracking-[0.2em] text-soft`,
        children: r || `Additional record`,
      }),
      (0, w.jsx)(`p`, {
        className: `mt-2 text-sm capitalize text-muted blur-[3px] select-none`,
        children: e,
      }),
      (0, w.jsxs)(`p`, {
        className: `mt-1 text-xs text-soft blur-[3px] select-none`,
        children: [n || `jurisdiction`, ` · Filed `, t || `recent`],
      }),
      (0, w.jsx)(`p`, {
        className: `mt-3 text-xs text-accent`,
        children: `Unlock to view full record detail`,
      }),
    ],
  });
}
function scanEntityResultCard({ result: e, index: t, upgradeHref: upgradeHref }) {
  let n = e.event_count_90d > 0,
    adjacentMessage =
      e.adjacent_signals?.message || (n ? null : e.no_signals_message);
  return (0, w.jsxs)(i.article, {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay: t * 0.12 },
    className: `rounded-2xl border border-metallic bg-black/40 p-5`,
    children: [
      (0, w.jsxs)(`div`, {
        className: `flex flex-wrap items-start justify-between gap-3`,
        children: [
          (0, w.jsxs)(`div`, {
            children: [
              (0, w.jsx)(`h3`, {
                className: `display-font text-2xl text-ink`,
                children: e.name,
              }),
              (0, w.jsx)(`p`, {
                className: `mt-1 text-sm text-muted`,
                children:
                  formatJurisdictionLabel(e.jurisdiction) || `Unknown jurisdiction`,
              }),
            ],
          }),
          n
            ? (0, w.jsx)(`span`, {
                className: `data-font rounded-lg border border-terminal-blue/30 bg-terminal-blue/10 px-3 py-1.5 text-sm text-terminal-blue`,
                children: e.score,
              })
            : null,
        ],
      }),
      (0, w.jsx)(`p`, {
        className: `mt-4 text-sm leading-6 text-muted`,
        children: e.headline,
      }),
      n
        ? (0, w.jsxs)(w.Fragment, {
            children: [
              (0, w.jsx)(`div`, {
                className: `mt-4 flex flex-wrap gap-2`,
                children: Object.entries(e.events_by_type || {}).map(([t, n]) =>
                  (0, w.jsxs)(
                    `span`,
                    {
                      className: `data-font rounded-full border border-metallic px-2.5 py-1 text-xs text-muted`,
                      children: [scanEventLabel(t), ` · `, n],
                    },
                    t,
                  ),
                ),
              }),
              e.top_event
                ? (0, w.jsxs)(`div`, {
                    className: `mt-4 rounded-xl border border-metallic bg-black/45 p-4`,
                    children: [
                      (0, w.jsx)(`p`, {
                        className: `text-xs uppercase tracking-[0.2em] text-soft`,
                        children: e.teaser_unlocked
                          ? `Most recent high-severity record`
                          : `Record preview`,
                      }),
                      e.top_event.locked
                        ? (0, w.jsx)(scanLockedEventPreview, {
                            recordType: e.top_event.record_type,
                            filingDate: e.top_event.filing_date,
                            jurisdiction: e.top_event.jurisdiction,
                            label: `Top record`,
                          })
                        : (0, w.jsxs)(w.Fragment, {
                            children: [
                              (0, w.jsx)(`p`, {
                                className: `mt-2 text-sm font-medium text-ink`,
                                children: e.top_event.title,
                              }),
                              e.top_event.summary
                                ? (0, w.jsx)(`p`, {
                                    className: `mt-2 text-sm leading-6 text-muted`,
                                    children: e.top_event.summary,
                                  })
                                : null,
                              (0, w.jsxs)(`p`, {
                                className: `mt-3 text-xs text-soft`,
                                children: [
                                  e.top_event.jurisdiction,
                                  ` · `,
                                  e.top_event.record_type,
                                  ` · Filed `,
                                  e.top_event.filing_date || `recent`,
                                  ` · Confidence `,
                                  e.top_event.confidence,
                                  `%`,
                                ],
                              }),
                            ],
                          }),
                    ],
                  })
                : null,
              e.locked_summary
                ? (0, w.jsx)(`p`, {
                    className: `mt-3 text-sm text-accent`,
                    children: e.locked_summary,
                  })
                : null,
              e.additional_events?.length && e.teaser_unlocked
                ? (0, w.jsx)(`div`, {
                    className: `mt-3 space-y-2`,
                    children: e.additional_events.map((t) =>
                      t.locked
                        ? (0, w.jsx)(
                            scanLockedEventPreview,
                            {
                              recordType: t.record_type,
                              filingDate: t.filing_date,
                              jurisdiction: t.jurisdiction,
                            },
                            t.id,
                          )
                        : (0, w.jsxs)(
                            `div`,
                            {
                              className: `rounded-xl border border-metallic bg-black/45 p-4`,
                              children: [
                                (0, w.jsx)(`p`, {
                                  className: `text-sm font-medium text-ink`,
                                  children: t.title,
                                }),
                                (0, w.jsxs)(`p`, {
                                  className: `mt-2 text-xs text-soft`,
                                  children: [
                                    t.jurisdiction,
                                    ` · `,
                                    t.record_type,
                                    ` · Filed `,
                                    t.filing_date || `recent`,
                                  ],
                                }),
                              ],
                            },
                            t.id,
                          ),
                    ),
                  })
                : null,
              (0, w.jsx)(`button`, {
                type: `button`,
                onClick: () => {
                  window.location.assign(upgradeHref || `/?view=pricing`);
                },
                className: `terminal-button-solid mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold`,
                children: [`Monitor this entity · Vortx from `, STARTER_PRICE],
              }),
            ],
          })
        : (0, w.jsxs)(`div`, {
            className: `mt-3 rounded-xl border border-metallic bg-black/30 p-3`,
            children: [
              (0, w.jsx)(`p`, {
                className: `text-xs uppercase tracking-[0.14em] text-soft`,
                children: `Scan result · monitored sources (90 days)`,
              }),
              (0, w.jsx)(`p`, {
                className: `mt-2 text-sm leading-6 text-soft`,
                children: adjacentMessage,
              }),
              e.adjacent_signals?.count
                ? (0, w.jsx)(`p`, {
                    className: `mt-2 text-xs leading-5 text-muted`,
                    children: e.no_signals_message,
                  })
                : null,
              (0, w.jsx)(`button`, {
                type: `button`,
                onClick: () => {
                  window.location.assign(upgradeHref || `/?view=pricing`);
                },
                className: `terminal-button-solid mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold`,
                children: [`Start monitoring · Vortx from `, STARTER_PRICE],
              }),
            ],
          }),
    ],
  });
}
function scanMonitoringUpgradeModal({ open: e, entityCount: t, scoutHref: n, starterHref: r, onClose: i }) {
  return e
    ? (0, w.jsx)(`div`, {
        className: `fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4`,
        role: `dialog`,
        "aria-modal": `true`,
        children: (0, w.jsxs)(`div`, {
          className: `glass-panel max-w-lg rounded-3xl border border-terminal-blue/30 p-6 shadow-2xl`,
          children: [
            (0, w.jsx)(`p`, { className: `eyebrow`, children: `Next step` }),
            (0, w.jsxs)(`h2`, {
              className: `display-font mt-2 text-3xl text-ink`,
              children: [
                `Monitor `,
                t,
                ` `,
                t === 1 ? `company` : `companies`,
                ` before the next filing`,
              ],
            }),
            (0, w.jsxs)(`p`, {
              className: `mt-3 text-sm leading-6 text-muted`,
              children: [
                `Your scan results are unlocked. Start a 7-day Vortx trial to see the names, watch them, and get email alerts.`,
              ],
            }),
            (0, w.jsxs)(`div`, {
              className: `mt-6 flex flex-col gap-3 sm:flex-row`,
              children: [
                (0, w.jsx)(`button`, {
                  type: `button`,
                  onClick: () => window.location.assign(`/?view=pricing&plan=nebula`),
                  className: `terminal-button-solid rounded-xl px-5 py-3 text-sm font-semibold`,
                  children: [`Start 7-day trial · `, FEATURED_PLAN_PRICE],
                }),
                (0, w.jsx)(`button`, {
                  type: `button`,
                  onClick: () => window.location.assign(r),
                  className: `rounded-xl border border-metallic px-5 py-3 text-sm font-semibold text-ink`,
                  children: [`Open Pricing · Vortx`, ],
                }),
              ],
            }),
            (0, w.jsx)(`button`, {
              type: `button`,
              onClick: i,
              className: `mt-4 text-sm text-muted underline underline-offset-4`,
              children: `Keep browsing results`,
            }),
          ],
        }),
      })
    : null;
}
function blindSpotScanWizard() {
  let [n, r] = (0, l.useState)(`input`),
    [a, o] = (0, l.useState)(``),
    [s, c] = (0, l.useState)([]),
    [u, d] = (0, l.useState)({}),
    [f, p] = (0, l.useState)([]),
    [m, h] = (0, l.useState)(!1),
    [_, v] = (0, l.useState)(``),
    [y, b] = (0, l.useState)(!1),
    [x, S] = (0, l.useState)(null),
    [emailNotice, setEmailNotice] = (0, l.useState)(``),
    [showUpgradeModal, setShowUpgradeModal] = (0, l.useState)(!1),
    C = SCAN_COPY,
    T = (0, l.useMemo)(() => scanParseNames(a), [a]),
    E = (0, l.useMemo)(() => Object.values(u).filter(Boolean), [u]);
  async function k() {
    (S(null), b(!0));
    try {
      let n = await scanMatchApi(T, `competitors`);
      (c(n.results),
        d(
          Object.fromEntries(
            n.results
              .filter((e) => e.matches[0])
              .map((e) => [e.input, e.matches[0].entity_id]),
          ),
        ),
        r(`match`));
    } catch (e) {
      S(e instanceof Error ? e.message : `Match failed.`);
    } finally {
      b(!1);
    }
  }
  async function A() {
    if (!E.length) {
      S(`Select at least one matched entity.`);
      return;
    }
    (S(null), b(!0));
    try {
      let e = await scanResultsApi(E);
      (p(e.entities), r(`results`));
    } catch (e) {
      S(e instanceof Error ? e.message : `Scan failed.`);
    } finally {
      b(!1);
    }
  }
  async function j(t) {
    (t.preventDefault(), S(null), setEmailNotice(``), b(!0));
    try {
      let t = await scanUnlockApi(_, E, `competitors`);
      (p(t.entities),
        h(!0),
        r(`unlocked`),
        setShowUpgradeModal(!0),
        trackMarketingStep(`scan_email_submit`, String(E.length)),
        setEmailNotice(
          t.email_sent
            ? `Confirmation email sent to ${_}. Check spam if it does not arrive in a few minutes.`
            : `Results unlocked here. Email delivery is not configured yet; save this page or export after you subscribe.`,
        ));
    } catch (e) {
      S(e instanceof Error ? e.message : `Unlock failed.`);
    } finally {
      b(!1);
    }
  }
  let N = `/?view=pricing&watchlist=${encodeURIComponent(E.join(`,`))}`;
  return (0, w.jsxs)(w.Fragment, {
    children: [
      (0, w.jsx)(scanMonitoringUpgradeModal, {
        open: showUpgradeModal && n === `unlocked`,
        entityCount: E.length,
        scoutHref: `${N}&plan=scout`,
        starterHref: N,
        onClose: () => setShowUpgradeModal(!1),
      }),
      (0, w.jsxs)(`section`, {
    className: `mx-auto max-w-3xl px-6 py-10`,
    children: [
      (0, w.jsxs)(`div`, {
        className: `glass-panel rounded-3xl p-6`,
        children: [
          (0, w.jsx)(`p`, { className: `eyebrow`, children: C.eyebrow }),
          (0, w.jsx)(`h1`, {
            className: `display-font mt-3 text-5xl text-ink`,
            children: C.headline,
          }),
          (0, w.jsx)(`p`, {
            className: `mt-4 text-sm leading-6 text-muted`,
            children: C.helper,
          }),
          n === `input`
            ? (0, w.jsxs)(`div`, {
                className: `mt-6 space-y-4`,
                children: [
                  (0, w.jsx)(`textarea`, {
                    value: a,
                    onChange: (e) => o(e.target.value),
                    rows: 5,
                    placeholder: C.placeholder,
                    className: `w-full rounded-xl border border-metallic bg-black/40 px-4 py-3 text-sm text-ink outline-none focus:border-terminal-blue/40`,
                  }),
                  (0, w.jsx)(`button`, {
                    type: `button`,
                    disabled: y || !T.length,
                    onClick: () => void k(),
                    className: `vortx-scan-match-btn terminal-button-solid rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50`,
                    children: y ? `Matching…` : `Match companies`,
                  }),
                ],
              })
            : null,
          n === `match`
            ? (0, w.jsxs)(`div`, {
                className: `mt-6 space-y-4`,
                children: [
                  s.map((e) =>
                    (0, w.jsxs)(
                      `div`,
                      {
                        className: `rounded-xl border border-metallic bg-black/35 p-4`,
                        children: [
                          (0, w.jsx)(`p`, {
                            className: `text-sm font-medium text-ink`,
                            children: e.input,
                          }),
                          e.matches.length
                            ? (0, w.jsxs)(w.Fragment, {
                                children: [
                                  (0, w.jsx)(`p`, {
                                    className: `mt-2 text-xs uppercase tracking-[0.14em] text-soft`,
                                    children: `Matched entity (name confidence)`,
                                  }),
                                  (0, w.jsx)(`select`, {
                                    value: u[e.input] || ``,
                                    onChange: (t) =>
                                      d((n) => ({ ...n, [e.input]: t.target.value })),
                                    className: `mt-2 w-full rounded-lg border border-metallic bg-black/50 px-3 py-2 text-sm`,
                                    children: e.matches.map((e) =>
                                      (0, w.jsxs)(
                                        `option`,
                                        {
                                          value: e.entity_id,
                                          children: [
                                            e.name,
                                            ` · `,
                                            e.jurisdiction || `Unknown`,
                                            ` · `,
                                            Math.round(e.confidence * 100),
                                            `% name match`,
                                          ],
                                        },
                                        e.entity_id,
                                      ),
                                    ),
                                  }),
                                ],
                              })
                            : (0, w.jsx)(`p`, {
                                className: `mt-2 text-sm text-muted`,
                                children: `No close match found. Try a fuller legal name or ticker.`,
                              }),
                        ],
                      },
                      e.input,
                    ),
                  ),
                  (0, w.jsxs)(`div`, {
                    className: `flex flex-wrap gap-3`,
                    children: [
                      (0, w.jsx)(`button`, {
                        type: `button`,
                        disabled: y || !E.length,
                        onClick: () => void A(),
                        className: `vortx-scan-match-btn terminal-button-solid rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50`,
                        children: y ? `Scanning…` : `Run scan`,
                      }),
                      (0, w.jsx)(`button`, {
                        type: `button`,
                        onClick: () => r(`input`),
                        className: `terminal-button rounded-xl px-4 py-2.5 text-sm`,
                        children: `Edit list`,
                      }),
                    ],
                  }),
                ],
              })
            : null,
          (n === `results` || n === `unlocked`) && f.length
            ? (0, w.jsxs)(`div`, {
                className: `mt-8 space-y-4`,
                children: [
                  f.map((e, t) =>
                    (0, w.jsx)(
                      scanEntityResultCard,
                      { result: e, index: t, upgradeHref: N },
                      e.entity_id,
                    ),
                  ),
                  n === `results` && !m
                    ? (0, w.jsxs)(`form`, {
                        onSubmit: (e) => void j(e),
                        className: `rounded-2xl border border-terminal-blue/30 bg-terminal-blue/5 p-5`,
                        children: [
                          (0, w.jsxs)(`h2`, {
                            className: `display-font text-2xl text-ink`,
                            children: [
                              `Unlock full results for all `,
                              E.length,
                              ` entit`,
                              E.length === 1 ? `y` : `ies`,
                              ` you scanned`,
                            ],
                          }),
                          (0, w.jsx)(`p`, {
                            className: `mt-2 text-sm text-muted`,
                            children: `We'll email you your scan results. Unsubscribe anytime.`,
                          }),
                          (0, w.jsx)(`input`, {
                            type: `email`,
                            required: !0,
                            value: _,
                            onChange: (e) => v(e.target.value),
                            placeholder: `Work email`,
                            className: `mt-4 w-full rounded-xl border border-metallic bg-black/40 px-4 py-3 text-sm`,
                          }),
                          (0, w.jsx)(`button`, {
                            type: `submit`,
                            disabled: y,
                            className: `terminal-button-solid mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50`,
                            children: y ? `Unlocking…` : `Unlock full results`,
                          }),
                        ],
                      })
                    : null,
                  n === `unlocked`
                    ? (0, w.jsxs)(`div`, {
                        className: `rounded-2xl border border-metallic bg-black/40 p-5`,
                        children: [
                          emailNotice
                            ? (0, w.jsx)(`p`, {
                                className: `text-sm text-terminal-green`,
                                children: emailNotice,
                              })
                            : null,
                          (0, w.jsxs)(`p`, {
                            className: `mt-2 text-sm text-muted`,
                            children: [
                              `Set up ongoing monitoring for these `,
                              E.length,
                              ` entit`,
                              E.length === 1 ? `y` : `ies`,
                              `.`,
                            ],
                          }),
                          (0, w.jsx)(`button`, {
                            type: `button`,
                            onClick: () => {
                              saveScanWatchlistIds(E);
                              window.location.assign(N);
                            },
                            className: `terminal-button-solid mt-4 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold`,
                            children: `Set up monitoring → Pricing`,
                          }),
                        ],
                      })
                    : null,
                ],
              })
            : null,
          x
            ? (0, w.jsx)(`p`, {
                className: `mt-4 text-sm text-rose-300`,
                children: x,
              })
            : null,
        ],
      }),
      (0, w.jsx)(`p`, {
        className: `mt-6 text-xs leading-5 text-muted`,
        children: `Records are allegations or administrative artifacts, not judgments. Research and business intelligence only. Not legal, financial, credit, trading, or investment advice.`,
      }),
    ],
  }),
    ],
  });
}
function me({ onOpenPricing: e, onOpenCustomer: t, onRequestAccess: n }) {
  return (0, w.jsx)(`footer`, {
    className: `vortx-site-footer border-t border-white/10 px-6 py-10`,
    children: (0, w.jsxs)(`div`, {
      className: `mx-auto grid max-w-6xl gap-6 md:grid-cols-[1.2fr_1fr_1fr]`,
      children: [
        (0, w.jsxs)(`div`, {
          children: [
            (0, w.jsx)(`p`, {
              className: `eyebrow`,
              children: `Vortx Data LLC`,
            }),
            (0, w.jsx)(`p`, {
              className: `mt-3 max-w-xl text-sm leading-6 text-muted`,
              children: `Follow Congress, insider Form 4, and 13F filings. Public records only. Not trading, financial, or investment advice.`,
            }),
          ],
        }),
        (0, w.jsxs)(`div`, {
          className: `space-y-2 text-sm`,
          children: [
            (0, w.jsx)(`button`, {
              type: `button`,
              onClick: e,
              className: `block text-terminal-blue underline underline-offset-4`,
              children: `Pricing`,
            }),
            (0, w.jsx)(`button`, {
              type: `button`,
              onClick: t,
              className: `block text-muted underline underline-offset-4 transition hover:text-ink`,
              children: `Customer login`,
            }),
            (0, w.jsx)(`a`, {
              href: `/legal`,
              className: `block text-muted underline underline-offset-4 transition hover:text-ink`,
              children: `Legal`,
            }),
            (0, w.jsx)(`a`, {
              href: `/?view=sources`,
              className: `block text-muted underline underline-offset-4 transition hover:text-ink`,
              children: `Data sources`,
            }),
          ],
        }),
        (0, w.jsxs)(`div`, {
          className: `data-font space-y-2 text-xs text-soft`,
          children: [
            (0, w.jsx)(`p`, { children: `source transparency / enabled` }),
            (0, w.jsx)(`p`, {
              children: `subscriber data / internal use only`,
            }),
            (0, w.jsx)(`p`, { children: `security headers / active` }),
          ],
        }),
      ],
    }),
  });
}
function mapDrawerFact(label, value, key = label) {
  if (!label || value == null || value === ``) return null;
  return (0, w.jsxs)(
    `div`,
    {
      className: `vortx-map-drawer__fact`,
      children: [
        (0, w.jsx)(`dt`, { children: label }),
        (0, w.jsx)(`dd`, { children: value }),
      ],
    },
    key,
  );
}
function mapFallbackSignalLabel(feature) {
  let type = String(feature?.properties?.eventType || `public filing`)
    .replaceAll(`_`, ` `)
    .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    filed = feature?.properties?.filingDate || `Date pending`;
  return `${type} · ${filed}`;
}
function mapSignalDrawer({
  drawer,
  signal,
  access,
  starred,
  flash,
  onToggleWatch,
  onClose,
  onOpenPricing,
  onCopy,
  actionStatus,
}) {
  if (drawer.state === `idle`) return null;
  if (drawer.state === `loading`)
    return (0, w.jsxs)(`aside`, {
      className: `vortx-map-drawer`,
      role: `dialog`,
      "aria-modal": `false`,
      "aria-label": `Loading map signal`,
      children: [
        (0, w.jsxs)(`div`, {
          className: `vortx-map-drawer__header`,
          children: [
            (0, w.jsx)(`p`, { className: `font-semibold`, children: `Loading signal…` }),
            (0, w.jsx)(`button`, {
              type: `button`,
              className: `vortx-map-drawer__close`,
              onClick: onClose,
              "aria-label": `Close signal drawer`,
              children: `×`,
            }),
          ],
        }),
        (0, w.jsx)(`div`, {
          className: `vortx-map-drawer__body`,
          children: (0, w.jsx)(`div`, {
            className: `h-28 animate-pulse rounded-xl bg-slate-200/60`,
          }),
        }),
      ],
    });
  if (drawer.state === `error`)
    return (0, w.jsxs)(`aside`, {
      className: `vortx-map-drawer`,
      role: `dialog`,
      "aria-modal": `false`,
      "aria-label": `Map signal error`,
      children: [
        (0, w.jsxs)(`div`, {
          className: `vortx-map-drawer__header`,
          children: [
            (0, w.jsx)(`p`, { className: `font-semibold`, children: `Signal unavailable` }),
            (0, w.jsx)(`button`, {
              type: `button`,
              className: `vortx-map-drawer__close`,
              onClick: onClose,
              "aria-label": `Close signal drawer`,
              children: `×`,
            }),
          ],
        }),
        (0, w.jsx)(`div`, {
          className: `vortx-map-drawer__body text-sm text-rose-700`,
          children: drawer.message || `Signal details could not load.`,
        }),
      ],
    });
  if (!signal || !access) return null;
  let displayName = access.masked ? signal.maskedEntityLabel : signal.entityName,
    tapeType =
      signal.eventType === `cross_signal`
        ? signal.crossSignal?.tradeEventType || signal.eventType
        : signal.eventType,
    tapeTicker = sanitizeTapeQuery(signal.ticker),
    amountValue =
      signal.amount != null ? Number(signal.amount).toLocaleString(`en-US`) : null,
    facts = [
      mapDrawerFact(
        `Ticker`,
        tapeTicker
          ? (0, w.jsx)(TickerTapeLink, {
              ticker: tapeTicker,
              eventType: tapeType,
            })
          : null,
      ),
      mapDrawerFact(`Issuer`, signal.issuerName),
      mapDrawerFact(`Location`, signal.location?.label),
      mapDrawerFact(`Location confidence`, signal.location?.confidence),
      mapDrawerFact(`Location precision`, signal.location?.precision),
      mapDrawerFact(`Filing date`, signal.filingDate),
      mapDrawerFact(`Transaction date`, signal.tradeDate),
      mapDrawerFact(
        `Affected workers`,
        signal.workers != null ? Number(signal.workers).toLocaleString(`en-US`) : null,
      ),
      mapDrawerFact(
        signal.amountLabel && signal.amountLabel !== `Affected workers`
          ? signal.amountLabel
          : signal.workers != null
            ? null
            : `Amount`,
        amountValue,
      ),
      mapDrawerFact(`Transaction`, signal.transactionAction),
      mapDrawerFact(`Source`, signal.sourceName),
    ].filter(Boolean);
  return (0, w.jsxs)(`aside`, {
    className: `vortx-map-drawer`,
    role: `dialog`,
    "aria-modal": `false`,
    "aria-labelledby": `vortx-map-drawer-title`,
    children: [
      (0, w.jsxs)(`div`, {
        className: `vortx-map-drawer__header`,
        children: [
          (0, w.jsxs)(`div`, {
            className: `vortx-map-drawer__who min-w-0`,
            children: [
              (0, w.jsx)(FilerFace, {
                name: access.masked ? `` : signal.entityName || ``,
                type:
                  signal.eventType === `cross_signal`
                    ? signal.crossSignal?.tradeEventType || `form_4`
                    : signal.eventType || ``,
                locked: Boolean(access.masked),
                issuer: signal.issuerName || ``,
                ticker: signal.ticker || ``,
                seed: signal.watchEntityId || signal.id || ``,
                size: `md`,
              }),
              (0, w.jsxs)(`div`, {
                className: `min-w-0`,
                children: [
                  (0, w.jsx)(`span`, {
                    className: `vortx-map-drawer__badge`,
                    children: signal.signalTypeLabel,
                  }),
                  (0, w.jsxs)(`h3`, {
                    id: `vortx-map-drawer-title`,
                    className: `vortx-map-drawer__title`,
                    children: [
                      displayName,
                      signal.ticker ? ` (${signal.ticker})` : ``,
                    ],
                  }),
                  (0, w.jsx)(`p`, {
                    className: `mt-1 text-xs text-muted`,
                    children: `Filed ${signal.filingDate}`,
                  }),
                ],
              }),
            ],
          }),
          (0, w.jsx)(`button`, {
            type: `button`,
            className: `vortx-map-drawer__close`,
            onClick: onClose,
            "aria-label": `Close signal drawer`,
            children: `×`,
          }),
        ],
      }),
      (0, w.jsxs)(`div`, {
        className: `vortx-map-drawer__body`,
        children: [
          signal.crossSignal
            ? (0, w.jsxs)(`div`, {
                className: `vortx-map-cross-box`,
                children: [
                  (0, w.jsx)(`p`, {
                    className: `text-sm font-semibold leading-6`,
                    children: signal.crossSignal.factualCopy,
                  }),
                  (0, w.jsx)(`p`, {
                    className: `vortx-map-cross-box__disclaimer`,
                    children:
                      signal.crossSignal.standingDisclaimer ||
                      `This shows the timing relationship between two public filings. It is not evidence of insider knowledge, coordination, or wrongdoing.`,
                  }),
                ],
              })
            : null,
          access.masked
            ? (0, w.jsxs)(`div`, {
                className: `vortx-map-drawer__locked ${signal.crossSignal ? `mt-3` : ``}`,
                children: [
                  (0, w.jsx)(`p`, {
                    className: `text-sm leading-6`,
                    children: signal.crossSignal
                      ? `Names remain locked on this timing relationship.`
                      : signal.maskedSummary,
                  }),
                  (0, w.jsx)(`button`, {
                    type: `button`,
                    className: `vortx-map-action vortx-map-action--primary mt-3`,
                    onClick: onOpenPricing,
                    children: `See the name behind this trade → Vortx, $150/mo`,
                  }),
                ],
              })
            : (0, w.jsxs)(w.Fragment, {
                children: [
                  facts.length
                    ? (0, w.jsx)(`dl`, {
                        className: `vortx-map-drawer__facts`,
                        children: facts,
                      })
                    : null,
                  signal.summary && !signal.crossSignal
                    ? (0, w.jsx)(`p`, {
                        className: `vortx-map-drawer__story`,
                        children: signal.summary,
                      })
                    : null,
                ],
              }),
          (0, w.jsxs)(`div`, {
            className: `vortx-map-action-row mt-5`,
            children: [
              tapeTicker
                ? (0, w.jsx)(LiveQuoteLinks, { ticker: tapeTicker })
                : null,
              signal.watchEntityId
                ? (0, w.jsx)(WatchTradeButton, {
                    entityId: signal.watchEntityId,
                    starred,
                    flash,
                    onToggle: onToggleWatch,
                    size: `sm`,
                  })
                : null,
              (0, w.jsx)(`button`, {
                type: `button`,
                className: `vortx-map-action`,
                onClick: onCopy,
                children: `Copy signal link`,
              }),
            ],
          }),
          actionStatus
            ? (0, w.jsx)(`p`, {
                className: `mt-3 text-xs text-muted`,
                role: `status`,
                children: actionStatus,
              })
            : null,
          (0, w.jsx)(`p`, {
            className: `mt-5 border-t border-line pt-4 text-[11px] leading-5 text-soft`,
            children: signal.disclaimer,
          }),
        ],
      }),
    ],
  });
}
function geographicSignalMapView({
  authToken,
  profile,
  feedAccess,
  starIds = [],
  watchFlashId = ``,
  onToggleWatch,
  onOpenPricing,
  focusSignal = ``,
  focusTick = 0,
}) {
  let [theme, setTheme] = (0, l.useState)(() => {
      try {
        return localStorage.getItem(`vortx-map-theme`) === `light` ? `light` : `dark`;
      } catch {
        return `dark`;
      }
    }),
    [status, setStatus] = (0, l.useState)({
      state: `loading`,
      count: 0,
      distressCount: 0,
      tradeCount: 0,
      crossCount: 0,
      bounds: ``,
      message: ``,
      capped: !1,
      crossSignals: 0,
      fallbackFeatures: [],
    }),
    [selectedId, setSelectedId] = (0, l.useState)(() => {
      if (typeof window > `u`) return ``;
      return new URLSearchParams(window.location.search).get(`signal`) || ``;
    }),
    [drawer, setDrawer] = (0, l.useState)({
      state: `idle`,
      data: null,
      message: ``,
    }),
    [actionStatus, setActionStatus] = (0, l.useState)(``),
    [filterTypes, setFilterTypes] = (0, l.useState)([
      `warn`,
      `bankruptcy`,
      `liens`,
      `congress`,
      `form4`,
    ]),
    [searchInput, setSearchInput] = (0, l.useState)(``),
    [searchQuery, setSearchQuery] = (0, l.useState)(``),
    [crossOnly, setCrossOnly] = (0, l.useState)(!1),
    [globeHintOpen, setGlobeHintOpen] = (0, l.useState)(() => {
      try {
        return localStorage.getItem(`vortx-map-hint-dismissed`) !== `1`;
      } catch {
        return !0;
      }
    }),
    containerRef = (0, l.useRef)(null),
    controllerRef = (0, l.useRef)(null);
  (0, l.useEffect)(() => {
    let active = !0;
    if (!containerRef.current || !window.VortxMap?.create) {
      setStatus({
        state: `error`,
        count: 0,
        bounds: ``,
        message: `Map runtime could not load.`,
        capped: !1,
      });
      return;
    }
    window.VortxMap
      .create(containerRef.current, {
        theme,
        authToken,
        filters: {
          types: filterTypes,
          query: searchQuery,
          crossOnly,
        },
        onPointClick: (id) => {
          if (active) setSelectedId(id);
        },
        onStatus: (next) => {
          if (active) setStatus((current) => ({ ...current, ...next }));
        },
      })
      .then((controller) => {
        if (!active) {
          controller?.destroy?.();
          return;
        }
        controllerRef.current = controller;
      })
      .catch((error) => {
        if (!active) return;
        setStatus({
          state: `error`,
          count: 0,
          bounds: ``,
          message: error instanceof Error ? error.message : `Map runtime could not load.`,
          capped: !1,
        });
      });
    return () => {
      active = !1;
      controllerRef.current?.destroy?.();
      controllerRef.current = null;
    };
  }, []);
  (0, l.useEffect)(() => {
    try {
      localStorage.setItem(`vortx-map-theme`, theme);
    } catch {}
    controllerRef.current?.setTheme?.(theme);
  }, [theme]);
  (0, l.useEffect)(() => {
    controllerRef.current?.setAuthToken?.(authToken || ``);
  }, [authToken]);
  (0, l.useEffect)(() => {
    let timeout = window.setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);
  (0, l.useEffect)(() => {
    controllerRef.current?.setFilters?.({
      types: filterTypes,
      query: searchQuery,
      crossOnly,
    });
  }, [filterTypes, searchQuery, crossOnly]);
  (0, l.useEffect)(() => {
    let next = String(focusSignal || ``);
    setSelectedId(next);
    if (!next) controllerRef.current?.resetView?.();
  }, [focusSignal, focusTick]);
  (0, l.useEffect)(() => {
    if (!selectedId) return;
    let onKeyDown = (event) => {
      if (event.key === `Escape`) setSelectedId(``);
    };
    window.addEventListener(`keydown`, onKeyDown);
    return () => window.removeEventListener(`keydown`, onKeyDown);
  }, [selectedId]);
  (0, l.useEffect)(() => {
    let active = !0,
      abortController = new AbortController(),
      url = new URL(window.location.href);
    if (!selectedId) {
      (url.searchParams.delete(`signal`),
        window.history.replaceState(null, ``, `${url.pathname}${url.search}${url.hash}`),
        setDrawer({ state: `idle`, data: null, message: `` }));
      return () => abortController.abort();
    }
    (url.searchParams.set(`signal`, selectedId),
      window.history.replaceState(null, ``, `${url.pathname}${url.search}${url.hash}`),
      setActionStatus(``),
      setDrawer({ state: `loading`, data: null, message: `` }));
    fetch(`/api/map/signal?id=${encodeURIComponent(selectedId)}`, {
      headers: {
        accept: `application/json`,
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      },
      signal: abortController.signal,
    })
      .then(async (response) => {
        let payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok)
          throw Error(payload.message || `Signal details could not load.`);
        if (active) setDrawer({ state: `ready`, data: payload, message: `` });
      })
      .catch((error) => {
        if (!active || error?.name === `AbortError`) return;
        setDrawer({
          state: `error`,
          data: null,
          message: error instanceof Error ? error.message : `Signal details could not load.`,
        });
      });
    return () => {
      active = !1;
      abortController.abort();
    };
  }, [selectedId, authToken]);
  (0, l.useEffect)(() => {
    if (drawer.state !== `ready`) return;
    let loc = drawer.data?.signal?.location,
      lng = Number(loc?.longitude),
      lat = Number(loc?.latitude);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    let tries = 0,
      tick = () => {
        let ctl = controllerRef.current;
        if (ctl?.focusLngLat) {
          ctl.focusLngLat(lng, lat);
          return;
        }
        if (tries++ < 40) window.setTimeout(tick, 50);
      };
    tick();
  }, [drawer.state, selectedId]);
  async function copySignalLink() {
    let link = drawer.data?.signal?.signalLink;
    if (!link) return;
    try {
      let absolute = new URL(link, window.location.origin).toString();
      await navigator.clipboard.writeText(absolute);
      setActionStatus(`Signal link copied.`);
    } catch {
      setActionStatus(`Copy failed.`);
    }
  }
  async function downloadMapCsv(path, fallbackName) {
    setActionStatus(`Preparing CSV…`);
    try {
      let response = await fetch(path, {
        headers: {
          accept: `text/csv,application/json`,
          ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
        },
      });
      if (!response.ok) {
        let payload = await response.json().catch(() => ({}));
        throw Error(payload.message || `CSV export failed.`);
      }
      let blob = await response.blob(),
        disposition = response.headers.get(`content-disposition`) || ``,
        filename = disposition.match(/filename="([^"]+)"/i)?.[1] || fallbackName,
        href = URL.createObjectURL(blob),
        anchor = document.createElement(`a`);
      ((anchor.href = href),
        (anchor.download = filename),
        document.body.appendChild(anchor),
        anchor.click(),
        anchor.remove(),
        URL.revokeObjectURL(href),
        setActionStatus(`CSV downloaded.`));
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : `CSV export failed.`);
    }
  }
  async function exportVisibleMap() {
    let viewport = controllerRef.current?.getViewport?.(),
      bounds = viewport?.bounds;
    if (!bounds) {
      setActionStatus(`Map viewport is not ready.`);
      return;
    }
    let params = new URLSearchParams({ bounds });
    if (viewport?.filters?.types?.length)
      params.set(`types`, viewport.filters.types.join(`,`));
    if (viewport?.filters?.query) params.set(`q`, viewport.filters.query);
    if (viewport?.filters?.crossOnly) params.set(`cross_only`, `1`);
    await downloadMapCsv(
      `/api/map/signals.csv?${params.toString()}`,
      `vortx-visible-map.csv`,
    );
  }
  function toggleMapFilter(type) {
    setFilterTypes((current) => {
      if (current.includes(type)) {
        return current.length === 1 ? current : current.filter((value) => value !== type);
      }
      return [...current, type];
    });
  }
  function dismissGlobeHint() {
    setGlobeHintOpen(!1);
    try {
      localStorage.setItem(`vortx-map-hint-dismissed`, `1`);
    } catch {}
  }
  let loading = status.state === `loading`,
    hasError = status.state === `error` || status.state === `tile_error`,
    canBulkExport = Boolean(
      feedAccess?.subscriber &&
        (feedAccess?.capabilities?.mapBulkExport || profile?.role === `admin`),
    ),
    signal = drawer.data?.signal,
    drawerAccess = drawer.data?.access,
    drawerStarred = signal?.watchEntityId
      ? starIds.includes(signal.watchEntityId)
      : !1,
    mapFilterOptions = [
      [`warn`, `WARN`],
      [`bankruptcy`, `Bankruptcies`],
      [`liens`, `Liens`],
      [`congress`, `Congressional Trades`],
      [`form4`, `Insider Form 4`],
    ],
    visibleCount = Number(status.count) || 0,
    distressCount = Number(status.distressCount) || 0,
    tradeCount = Number(status.tradeCount) || 0,
    crossCount = Number(status.crossCount) || 0,
    mapHero = loading
      ? {
          kicker: `In view`,
          value: 0,
          label: `loading viewport`,
            hint: `Pins appear where a filing lists an address.`,
        }
      : crossCount > 0
        ? {
            kicker: `Needs attention`,
            value: crossCount,
            label: `overlapping trade and layoff pins here`,
            hint: `A trade and a layoff or bankruptcy show up at the same place around the same time. Tap a gold pin.`,
          }
        : distressCount > 0
          ? {
              kicker: `In view`,
              value: distressCount,
              label: `layoff, bankruptcy, or lien records here`,
              hint: `${visibleCount} pin${visibleCount === 1 ? `` : `s`} visible. Red pins are layoff, bankruptcy, or lien records.`,
            }
          : {
              kicker: `In view`,
              value: visibleCount,
              label: `pins in this view`,
              hint: `Green pins are Congress or insider trades. Tap a pin to read it.`,
            };
  return (0, w.jsx)(`section`, {
    className: `vortx-map-page ${theme === `dark` ? `vortx-map-page--dark` : ``}`,
    children: (0, w.jsxs)(`div`, {
      className: `mx-auto max-w-7xl px-4 py-8 sm:px-6`,
      children: [
        (0, w.jsxs)(`div`, {
          className: `vortx-map-page__header flex flex-wrap items-end justify-between gap-4`,
          children: [
            (0, w.jsxs)(`div`, {
              className: `vortx-page-hero`,
              children: [
                (0, w.jsx)(`p`, {
                  className: `eyebrow`,
                  children: `Map`,
                }),
                (0, w.jsx)(`h2`, {
                  className: `display-font text-4xl sm:text-5xl`,
                  children: `See where those trades and layoffs landed`,
                }),
                (0, w.jsx)(`p`, {
                  className: `vortx-map-page__subcopy`,
                  children: `Each pin is the address on a public filing. Research only, not trading advice.`,
                }),
              ],
            }),
            (0, w.jsxs)(`div`, {
              className: `flex flex-wrap items-center gap-2`,
              children: [
                canBulkExport
                  ? (0, w.jsx)(`button`, {
                      type: `button`,
                      className: `vortx-map-action`,
                      onClick: () => void exportVisibleMap(),
                      children: `Export visible map points (CSV)`,
                    })
                  : null,
                (0, w.jsxs)(`div`, {
                  className: `vortx-map-theme-toggle`,
                  role: `group`,
                  "aria-label": `Map theme`,
                  children: [
                    (0, w.jsx)(`button`, {
                      type: `button`,
                      "aria-pressed": theme === `light`,
                      onClick: () => setTheme(`light`),
                      children: `Light`,
                    }),
                    (0, w.jsx)(`button`, {
                      type: `button`,
                      "aria-pressed": theme === `dark`,
                      onClick: () => setTheme(`dark`),
                      children: `Dark`,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        (0, w.jsxs)(`div`, {
          className: `vortx-map-brief`,
          children: [
            (0, w.jsxs)(`article`, {
              className: `vortx-map-verdict`,
              children: [
                (0, w.jsx)(`p`, {
                  className: `vortx-map-verdict__kicker`,
                  children: mapHero.kicker,
                }),
                (0, w.jsx)(AnimatedStatValue, {
                  className: `vortx-map-verdict__value`,
                  value: mapHero.value,
                }),
                (0, w.jsx)(`p`, {
                  className: `vortx-map-verdict__label`,
                  children: mapHero.label,
                }),
                (0, w.jsx)(`p`, {
                  className: `vortx-map-verdict__hint`,
                  children: mapHero.hint,
                }),
              ],
            }),
            (0, w.jsxs)(`div`, {
              className: `vortx-map-support`,
              children: [
                (0, w.jsxs)(`div`, {
                  className: `vortx-map-stats`,
                  children: [
                    (0, w.jsxs)(`span`, {
                      className: `vortx-map-stat-chip`,
                      children: [
                        (0, w.jsx)(`span`, {
                          className: `vortx-map-stat-chip__dot`,
                          "aria-hidden": `true`,
                        }),
                        loading
                          ? `Loading viewport…`
                          : (0, w.jsxs)(`span`, {
                              children: [
                                (0, w.jsx)(AnimatedStatValue, {
                                  tag: `span`,
                                  className: `vortx-map-stat-num`,
                                  value: visibleCount,
                                }),
                                ` visible`,
                              ],
                            }),
                      ],
                    }),
                    !loading && distressCount > 0
                      ? (0, w.jsxs)(`span`, {
                          className: `vortx-map-stat-chip vortx-map-stat-chip--distress`,
                          children: [
                            (0, w.jsx)(`span`, {
                              className: `vortx-map-stat-chip__dot`,
                              "aria-hidden": `true`,
                            }),
                            (0, w.jsx)(AnimatedStatValue, {
                              tag: `span`,
                              className: `vortx-map-stat-num`,
                              value: distressCount,
                            }),
                            ` distress`,
                          ],
                        })
                      : null,
                    !loading && tradeCount > 0
                      ? (0, w.jsxs)(`span`, {
                          className: `vortx-map-stat-chip vortx-map-stat-chip--trade`,
                          children: [
                            (0, w.jsx)(`span`, {
                              className: `vortx-map-stat-chip__dot`,
                              "aria-hidden": `true`,
                            }),
                            (0, w.jsx)(AnimatedStatValue, {
                              tag: `span`,
                              className: `vortx-map-stat-num`,
                              value: tradeCount,
                            }),
                            ` trade`,
                          ],
                        })
                      : null,
                    !loading && crossCount > 0
                      ? (0, w.jsxs)(`span`, {
                          className: `vortx-map-stat-chip vortx-map-stat-chip--cross`,
                          children: [
                            (0, w.jsx)(`span`, {
                              className: `vortx-map-stat-chip__dot`,
                              "aria-hidden": `true`,
                            }),
                            (0, w.jsx)(AnimatedStatValue, {
                              tag: `span`,
                              className: `vortx-map-stat-num`,
                              value: crossCount,
                            }),
                            ` overlaps`,
                          ],
                        })
                      : null,
                    status.capped
                      ? (0, w.jsx)(`span`, {
                          className: `vortx-map-stat-chip`,
                          children: `This view is full. Zoom in`,
                        })
                      : null,
                  ],
                }),
                (0, w.jsxs)(`div`, {
                  className: `vortx-map-page__legend`,
                  "aria-label": `Map legend`,
                  children: [
                    (0, w.jsxs)(`span`, {
                      className: `vortx-map-legend-item`,
                      children: [
                        (0, w.jsx)(`span`, {
                          className: `vortx-map-legend-dot vortx-map-legend-dot--distress`,
                          "aria-hidden": `true`,
                        }),
                        `Layoff, bankruptcy, or lien`,
                      ],
                    }),
                    (0, w.jsxs)(`span`, {
                      className: `vortx-map-legend-item`,
                      children: [
                        (0, w.jsx)(`span`, {
                          className: `vortx-map-legend-dot vortx-map-legend-dot--trade`,
                          "aria-hidden": `true`,
                        }),
                        `Congress or insider trade`,
                      ],
                    }),
                    (0, w.jsxs)(`span`, {
                      className: `vortx-map-legend-item`,
                      children: [
                        (0, w.jsx)(`span`, {
                          className: `vortx-map-legend-dot vortx-map-legend-dot--cross`,
                          "aria-hidden": `true`,
                        }),
                        `Trade + layoff overlap`,
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        (0, w.jsxs)(`details`, {
          className: `vortx-map-story`,
          "aria-label": `How to read this map`,
          children: [
            (0, w.jsx)(`summary`, { children: `How to read this map` }),
            (0, w.jsx)(`p`, {
              className: `vortx-map-story__lead`,
              children: `Spot a ticker on Today's Trades, then see whether more trades or a layoff cluster at that company. Pins are addresses from the filing. If we cannot place the address, it stays off the map.`,
            }),
            (0, w.jsxs)(`div`, {
              className: `vortx-map-story__grid`,
              children: [
                (0, w.jsxs)(`div`, {
                  className: `vortx-map-story__pillar`,
                  children: [
                    (0, w.jsx)(`strong`, { children: `Trade pins` }),
                    (0, w.jsx)(`span`, {
                      children: `Form 4 and Congress trades plot at the issuer business address, including foreign private issuers.`,
                    }),
                  ],
                }),
                (0, w.jsxs)(`div`, {
                  className: `vortx-map-story__pillar`,
                  children: [
                    (0, w.jsx)(`strong`, { children: `Distress pins` }),
                    (0, w.jsx)(`span`, {
                      children: `WARN plants, bankruptcies, and liens when those U.S. records have an address we can resolve.`,
                    }),
                  ],
                }),
                (0, w.jsxs)(`div`, {
                  className: `vortx-map-story__pillar`,
                  children: [
                    (0, w.jsx)(`strong`, { children: `Your move` }),
                    (0, w.jsx)(`span`, {
                      children: `Filter, search a city or ticker, click a pin, then Watch the name on My Desk.`,
                    }),
                  ],
                }),
                (0, w.jsxs)(`div`, {
                  className: `vortx-map-story__pillar`,
                  children: [
                    (0, w.jsx)(`strong`, { children: `Not a signal` }),
                    (0, w.jsx)(`span`, {
                      children: `A pin is a public filing location. It is not a buy, sell, or hold recommendation.`,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        (0, w.jsxs)(`div`, {
          className: `vortx-map-page__status mt-2 flex flex-wrap justify-end gap-2 text-xs leading-5`,
          children: [
            status.crossSignals
              ? (0, w.jsx)(`p`, {
                  className: `data-font`,
                  children: `${Number(status.crossSignals)} overlapping pin${Number(status.crossSignals) === 1 ? `` : `s`} in this view`,
                })
              : null,
            actionStatus
              ? (0, w.jsx)(`p`, {
                  className: `data-font`,
                  children: actionStatus,
                })
              : null,
          ],
        }),
        (0, w.jsxs)(`div`, {
          className: `vortx-map-toolbar mt-4`,
          children: [
            (0, w.jsxs)(`details`, {
              className: `vortx-map-filter-menu`,
              children: [
                (0, w.jsxs)(`summary`, {
                  children: [`Signal types · `, filterTypes.length],
                }),
                (0, w.jsx)(`div`, {
                  className: `vortx-map-filter-menu__panel`,
                  children: mapFilterOptions.map(([id, label]) =>
                    (0, w.jsxs)(
                      `label`,
                      {
                        children: [
                          (0, w.jsx)(`input`, {
                            type: `checkbox`,
                            checked: filterTypes.includes(id),
                            onChange: () => toggleMapFilter(id),
                          }),
                          (0, w.jsx)(`span`, { children: label }),
                        ],
                      },
                      id,
                    ),
                  ),
                }),
              ],
            }),
            (0, w.jsx)(`label`, {
              className: `vortx-map-search`,
              children: (0, w.jsx)(`input`, {
                type: `search`,
                value: searchInput,
                onChange: (event) => setSearchInput(event.target.value),
                placeholder: feedAccess?.subscriber
                  ? `Search entity, politician, ticker, state, or city`
                  : `Search state or city · names stay hidden`,
                "aria-label": `Search map signals`,
              }),
            }),
            (0, w.jsxs)(`label`, {
              className: `vortx-map-cross-toggle`,
              children: [
                (0, w.jsx)(`input`, {
                  type: `checkbox`,
                  checked: crossOnly,
                  onChange: (event) => setCrossOnly(event.target.checked),
                }),
                (0, w.jsx)(`span`, { children: `Show overlapping pins only` }),
              ],
            }),
            (0, w.jsxs)(`div`, {
              className: `vortx-map-toolbar__actions`,
              children: [
                (0, w.jsx)(`button`, {
                  type: `button`,
                  className: `vortx-map-reset`,
                  onClick: () => controllerRef.current?.resetView?.(),
                  children: `Recenter globe`,
                }),
              ],
            }),
          ],
        }),
        hasError
          ? (0, w.jsxs)(`div`, {
              className: `mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900`,
              role: `alert`,
              children: [
                (0, w.jsx)(`span`, {
                  children: status.message || `Map data could not load.`,
                }),
                status.state === `error`
                  ? (0, w.jsx)(`button`, {
                      type: `button`,
                      className: `font-semibold underline underline-offset-4`,
                      onClick: () => controllerRef.current?.retry?.(),
                      children: `Retry`,
                    })
                  : null,
              ],
            })
          : null,
        (0, w.jsxs)(`div`, {
          className: `vortx-map-frame mt-4${drawer.state !== `idle` ? ` vortx-map-frame--open` : ``}`,
          children: [
            (0, w.jsx)(`div`, {
              ref: containerRef,
              className: `vortx-map-canvas`,
              role: `application`,
              "aria-label": `Interactive Vortx globe. Drag to spin, click a cluster to zoom in, or click a pin to open its signal drawer.`,
            }),
            loading
              ? (0, w.jsx)(`div`, {
                  className: `vortx-map-loading`,
                  role: `status`,
                  "aria-live": `polite`,
                  children: `Loading visible signals…`,
                })
              : null,
            !loading && !hasError && Number(status.count) === 0
              ? (0, w.jsx)(`div`, {
                  className: `vortx-map-empty`,
                  children: (0, w.jsxs)(`div`, {
                    className: `vortx-map-empty__panel`,
                    children: [
                      (0, w.jsx)(`strong`, { children: `No resolved signals here` }),
                      (0, w.jsx)(`p`, {
                        children: crossOnly
                          ? `No overlapping trade and layoff pins here. Turn off that filter or spin to another region.`
                          : searchQuery
                            ? `Nothing in this view matches your search. Try a broader city, state, or ticker term.`
                            : filterTypes.length < mapFilterOptions.length
                              ? `Your filters may be hiding signals. Widen signal types or spin toward the U.S. and Europe.`
                              : `Spin the globe toward the U.S. or Europe, or zoom in. Pins appear only where filing addresses resolve.`,
                      }),
                    ],
                  }),
                })
              : null,
            globeHintOpen && !selectedId
              ? (0, w.jsxs)(`div`, {
                  className: `vortx-map-hint`,
                  children: [
                    (0, w.jsxs)(`p`, {
                      className: `vortx-map-hint__copy`,
                      children: [
                        (0, w.jsx)(`strong`, { children: `Drag to spin` }),
                        ` the globe. `,
                        (0, w.jsx)(`strong`, { children: `Click a cluster` }),
                        ` to zoom in, or `,
                        (0, w.jsx)(`strong`, { children: `click a pin` }),
                        ` to inspect the filing.`,
                      ],
                    }),
                    (0, w.jsx)(`button`, {
                      type: `button`,
                      className: `vortx-map-hint__dismiss`,
                      onClick: dismissGlobeHint,
                      children: `Got it`,
                    }),
                  ],
                })
              : null,
            (0, w.jsx)(mapSignalDrawer, {
              drawer,
              signal,
              access: drawerAccess,
              starred: drawerStarred,
              flash: signal?.watchEntityId === watchFlashId,
              onToggleWatch,
              onClose: () => setSelectedId(``),
              onOpenPricing: () => {
                setSelectedId(``);
                onOpenPricing?.();
              },
              onCopy: () => void copySignalLink(),
              actionStatus,
            }),
          ],
        }),
        status.state === `tile_error` && status.fallbackFeatures?.length
          ? (0, w.jsxs)(`section`, {
              className: `vortx-map-fallback mt-4`,
              role: `region`,
              "aria-label": `Visible signals list fallback`,
              children: [
                (0, w.jsx)(`h3`, {
                  className: `text-lg font-bold`,
                  children: `Visible signals`,
                }),
                (0, w.jsx)(`p`, {
                  className: `mt-1 text-sm text-muted`,
                  children: `The basemap could not load. This list contains only the current bounded viewport response.`,
                }),
                (0, w.jsx)(`ul`, {
                  className: `mt-3`,
                  children: status.fallbackFeatures.map((feature) =>
                    (0, w.jsx)(
                      `li`,
                      {
                        children: (0, w.jsx)(`button`, {
                          type: `button`,
                          onClick: () => setSelectedId(feature.properties?.id || feature.id),
                          children: mapFallbackSignalLabel(feature),
                        }),
                      },
                      feature.properties?.id || feature.id,
                    ),
                  ),
                }),
              ],
            })
          : null,
        (0, w.jsxs)(`div`, {
          className: `vortx-map-page__status mt-3 flex flex-wrap justify-between gap-2 text-xs leading-5`,
          children: [
            (0, w.jsx)(`p`, {
              children: `WARN uses the filed facility location. SEC trade pins use issuer business or mailing addresses. House PTR index rows without a ticker or issuer location stay off the map.`,
            }),
            status.bounds
              ? (0, w.jsxs)(`p`, {
                  className: `data-font`,
                  children: [`Viewport query: `, status.bounds],
                })
              : null,
          ],
        }),
      ],
    }),
  });
}
function openMapView(setView, signalId, setFocus) {
  if (typeof setFocus === `function`) setFocus(signalId ? String(signalId) : ``);
  if (typeof window !== `undefined`) {
    let n = new URL(window.location.href);
    if (signalId) n.searchParams.set(`signal`, String(signalId));
    else n.searchParams.delete(`signal`);
    window.history.replaceState(null, ``, `${n.pathname}${n.search}${n.hash}`);
  }
  setView(`map`);
}
function he() {
  let [e, t] = (0, l.useState)(() => {
      if (typeof window > `u`) return `overview`;
      let path = String(window.location.pathname || `/`).replace(/\/+$/, ``) || `/`;
      if (path === `/scan`) return `scan`;
      if (path === `/pricing`) return `pricing`;
      if (path === `/legal`) return `legal`;
      if (path === `/congress-trades` || path === `/insider-trades` || path === `/fund-holdings`)
        return `browse`;
      let view = new URLSearchParams(window.location.search).get(`view`);
      if (!view) {
        try {
          view = sessionStorage.getItem(`vortx_auth_return_view`);
        } catch {}
      }
      if (view === `heatmap`) return `overview`;
      if (isBrowseStream(view)) return `browse`;
      return view && R.has(view) ? view : `overview`;
    }),
    [browseType, setBrowseType] = (0, l.useState)(() => browseTypeFromLocation()),
    [tapeQuery, setTapeQuery] = (0, l.useState)(() => readTapeQueryFromLocation()),
    [mapFocusId, setMapFocusId] = (0, l.useState)(() => {
      if (typeof window > `u`) return ``;
      return new URLSearchParams(window.location.search).get(`signal`) || ``;
    }),
    [mapFocusTick, setMapFocusTick] = (0, l.useState)(0),
    [scanWatchlistIds, setScanWatchlistIds] = (0, l.useState)(() => {
      if (typeof window > `u`) return [];
      let e = new URLSearchParams(window.location.search).get(`watchlist`);
      if (e) {
        let t = e.split(`,`).map((e) => e.trim()).filter(Boolean);
        saveScanWatchlistIds(t);
        return t;
      }
      return readScanWatchlistIds();
    }),
    [n, r] = (0, l.useState)(!1),
    [i, a] = (0, l.useState)(null),
    [o, s] = (0, l.useState)(``),
    [u, d] = (0, l.useState)(null),
    [h, _] = (0, l.useState)(!1),
    [previewRefresh, setPreviewRefresh] = (0, l.useState)(0),
    [starIds, setStarIds] = (0, l.useState)(() =>
      typeof window > `u` ? [] : readLocalDeskStars(u?.user_id),
    ),
    [watchFlashId, setWatchFlashId] = (0, l.useState)(``),
    [watchRefreshKey, setWatchRefreshKey] = (0, l.useState)(0),
    feedScope = o ? `authed` : `public`,
    v = c({
      queryKey: [`friction-feed`, feedScope, u?.subscription_status || `none`, u?.plan || ``, readBonusPreviewIds().join(`,`), previewRefresh],
      queryFn: async () => {
        let data = await f(o || void 0);
        writeCachedFrictionFeed(feedScope, data);
        return data;
      },
      placeholderData: readCachedFrictionFeed(feedScope),
      staleTime: 6e4,
    }),
    y = c({ queryKey: [`source-transparency`], queryFn: p }),
    b = c({ queryKey: [`entitlements`], queryFn: m }),
    E = c({ queryKey: [`public-stats`], queryFn: ps }),
    x = v.data?.entities ?? [],
    S = v.data?.events ?? [],
    feedAccess = v.data?.access ?? null,
    C = y.data?.sources ?? [],
    T = b.data?.entitlements ?? [],
    Mk = (0, l.useMemo)(
      () =>
        alignMarketingFeaturedWithFeed(
          E.data?.marketing || feedMarketingFallback(E.data, x, S),
          x,
          S,
        ),
      [E.data, x, S],
    );
  (0, l.useEffect)(() => {
    setStarIds(readLocalDeskStars(u?.user_id || `anon`));
  }, [u?.user_id]);
  async function toggleGlobalWatch(entityId) {
    let id = String(entityId || ``).trim();
    if (!id) return;
    let userKey = u?.user_id || `anon`;
    let wasStarred = starIds.includes(id);
    if (!o) {
      let next = wasStarred ? starIds.filter((row) => row !== id) : [...new Set([...starIds, id])];
      setStarIds(next);
      writeLocalDeskStars(userKey, next);
      if (!wasStarred && next.includes(id)) {
        trackMarketingStepOnce(`first_watch`, `first_watch`, `local`);
        setWatchFlashId(id);
        setTimeout(() => setWatchFlashId(``), 1600);
      }
      setWatchRefreshKey((n) => n + 1);
      return;
    }
    try {
      let res = await fetch(`/api/customer/watchlist-star`, {
        method: `POST`,
        headers: {
          authorization: `Bearer ${o}`,
          'content-type': `application/json`,
        },
        body: JSON.stringify({ entity_id: id }),
      });
      let payload = await res.json().catch(() => ({}));
      if (!res.ok) throw Error(payload.message || payload.error || `Watch failed.`);
      let next = Array.isArray(payload.member_entity_ids)
        ? payload.member_entity_ids.map((row) => String(row || ``).trim()).filter(Boolean)
        : payload.starred
          ? [...new Set([...starIds, id])]
          : starIds.filter((row) => row !== id);
      setStarIds(next);
      writeLocalDeskStars(userKey, next);
      if (next.includes(id)) {
        if (!wasStarred) trackMarketingStepOnce(`first_watch`, `first_watch`, `api`);
        setWatchFlashId(id);
        setTimeout(() => setWatchFlashId(``), 1600);
      }
      setWatchRefreshKey((n) => n + 1);
    } catch {
      let next = starIds.includes(id)
        ? starIds.filter((row) => row !== id)
        : [...starIds, id];
      setStarIds(next);
      writeLocalDeskStars(userKey, next);
      if (next.includes(id)) {
        if (!wasStarred) trackMarketingStepOnce(`first_watch`, `first_watch`, `local_fallback`);
        setWatchFlashId(id);
        setTimeout(() => setWatchFlashId(``), 1600);
      }
      setWatchRefreshKey((n) => n + 1);
    }
  }
  function requestPreviewUnlock(entityId) {
    let entity = (v.data?.entities ?? []).find((row) => row.id === entityId);
    if (entity?.preview_unlocked) return;
    if (readBonusPreviewIds().length >= FREE_PREVIEW_BONUS_MAX) {
      t(`pricing`);
      return;
    }
    saveBonusPreviewId(entityId);
    setPreviewRefresh((tick) => tick + 1);
  }
  (0, l.useEffect)(() => {
    if (e === `customer` && u?.user_id) {
      trackMarketingStepOnce(`desk_return`, `desk_return`, u?.plan || `desk`);
    }
  }, [e, u?.user_id]);
  return (
    (0, l.useEffect)(() => {
      let e = (e) => {
        (e.metaKey || e.ctrlKey) &&
          e.key.toLowerCase() === `k` &&
          (e.preventDefault(), r(!0));
      };
      return (
        window.addEventListener(`keydown`, e),
        () => window.removeEventListener(`keydown`, e)
      );
    }, []),
    (0, l.useEffect)(() => {
      if (isBrowseStream(e)) {
        setBrowseType(e);
        t(`browse`);
      }
    }, [e]),
    (0, l.useEffect)(() => {
      let n = new URL(window.location.href);
      if (
        n.pathname === `/congress-trades` ||
        n.pathname === `/insider-trades` ||
        n.pathname === `/fund-holdings`
      ) {
        n.pathname = `/`;
      }
      let resetToolPath = () => {
        if (
          n.pathname === `/scan` ||
          n.pathname === `/contractor-check` ||
          n.pathname === `/job-safety-score` ||
          n.pathname === `/layoff-search` ||
          n.pathname === `/legal`
        ) {
          n.pathname = `/`;
        }
      };
      if (e === `overview`) {
        n.searchParams.delete(`view`);
        n.searchParams.delete(`type`);
        n.searchParams.delete(`signal`);
        resetToolPath();
      } else if (e === `scan`) {
        n.pathname = `/scan`;
        n.searchParams.delete(`view`);
        n.searchParams.delete(`type`);
        n.searchParams.delete(`signal`);
      } else if (e === `legal`) {
        n.pathname = `/legal`;
        n.searchParams.delete(`view`);
        n.searchParams.delete(`type`);
        n.searchParams.delete(`signal`);
      } else if (e === `browse`) {
        resetToolPath();
        n.searchParams.set(`view`, `browse`);
        n.searchParams.set(`type`, parseBrowseType(browseType));
        n.searchParams.delete(`signal`);
        if (tapeQuery) n.searchParams.set(`q`, tapeQuery);
        else n.searchParams.delete(`q`);
      } else {
        resetToolPath();
        n.searchParams.set(`view`, e);
        n.searchParams.delete(`type`);
        if (e !== `map`) n.searchParams.delete(`signal`);
      }
      window.history.replaceState(
        null,
        ``,
        `${n.pathname}${n.search}${n.hash}`,
      );
    }, [e, browseType, tapeQuery]),
    (0, l.useEffect)(() => {
      e === `pricing` && trackMarketingStep(`pricing_view`);
    }, [e]),
    (0, l.useEffect)(() => {
      let e,
        t = !1;
      return (
        D(
          async () => {
            let { supabase: e } = await import(`./supabase-D4HD8mHW.js`);
            return { supabase: e };
          },
          __vite__mapDeps([0, 1]),
        ).then(({ supabase: n }) => {
          if (t || !n) return;
          let r = n
            .channel(`vortx-live-feed`)
            .on(`broadcast`, { event: `legal_friction_event` }, () => {
              (v.refetch(), y.refetch());
            })
            .on(
              `postgres_changes`,
              { event: `INSERT`, schema: `public`, table: `legal_events` },
              () => {
                v.refetch();
              },
            )
            .subscribe();
          e = () => {
            n.removeChannel(r);
          };
        }),
        () => {
          ((t = !0), e?.());
        }
      );
    }, [v, y]),
    (0, l.useEffect)(() => {
      let e = !0,
        t;
      return (
        D(
          async () => {
            let { supabase: e } = await import(`./supabase-D4HD8mHW.js`);
            return { supabase: e };
          },
          __vite__mapDeps([0, 1]),
        ).then(async ({ supabase: n }) => {
          if (!e || !n) return;
          try {
            let pending = sessionStorage.getItem(`vortx_pending_session`);
            if (pending) {
              sessionStorage.removeItem(`vortx_pending_session`);
              let parsed = JSON.parse(pending);
              if (parsed?.access_token) {
                await n.auth.setSession({
                  access_token: parsed.access_token,
                  refresh_token: parsed.refresh_token || ``,
                });
              }
            }
          } catch {}
          try {
            let authUrl = new URL(window.location.href);
            if (authUrl.searchParams.get(`auth`) === `handoff`) {
              let handoffRes = await fetch(`/api/auth/consume-handoff`, {
                method: `POST`,
                credentials: `include`,
              });
              let handoffBody = await handoffRes.json().catch(() => ({}));
              if (handoffRes.ok && handoffBody.ok && handoffBody.access_token) {
                await n.auth.setSession({
                  access_token: handoffBody.access_token,
                  refresh_token: handoffBody.refresh_token || ``,
                });
              }
              authUrl.searchParams.delete(`auth`);
            }
            let authCode = authUrl.searchParams.get(`code`);
            if (authCode) {
              let { error: codeErr } = await n.auth.exchangeCodeForSession(authCode);
              if (!codeErr) {
                authUrl.searchParams.delete(`code`);
                window.history.replaceState(
                  null,
                  ``,
                  `${authUrl.pathname}${authUrl.searchParams.toString() ? `?${authUrl.searchParams.toString()}` : ``}${authUrl.hash}`,
                );
              }
            }
          } catch {}
          let { data: r } = await n.auth.getSession(),
            i = r.session?.access_token || ``;
          if (i) {
            s(i);
            let profileResult = await g(i).catch(() => null);
            profileResult && d(profileResult.profile);
            try {
              let synced = await syncAnonStarsToAccount(i, profileResult?.profile?.user_id);
              if (synced?.length) setStarIds(synced);
            } catch {}
            let returnView = sessionStorage.getItem(`vortx_auth_return_view`);
            let currentUrl = new URL(window.location.href);
            if (returnView && R.has(returnView)) {
              sessionStorage.removeItem(`vortx_auth_return_view`);
              t(returnView);
            } else if (currentUrl.searchParams.get(`view`) === `customer`) {
              t(`customer`);
            }
            let urlAfterSignup = new URL(window.location.href);
            if (urlAfterSignup.searchParams.has(`signup`)) {
              trackMarketingStepOnce(`signup_complete`, `signup_complete`, `auth`);
              urlAfterSignup.searchParams.delete(`signup`);
              urlAfterSignup.searchParams.delete(`auth`);
              window.history.replaceState(
                null,
                ``,
                `${urlAfterSignup.pathname}${urlAfterSignup.searchParams.toString() ? `?${urlAfterSignup.searchParams.toString()}` : ``}${urlAfterSignup.hash}`,
              );
            }
          } else {
            try {
              let authError = sessionStorage.getItem(`vortx_auth_error`);
              if (authError) {
                sessionStorage.removeItem(`vortx_auth_error`);
                let returnView = sessionStorage.getItem(`vortx_auth_return_view`) || `customer`;
                sessionStorage.removeItem(`vortx_auth_return_view`);
                if (R.has(returnView)) t(returnView);
              }
            } catch {}
          }
          let { data: a } = n.auth.onAuthStateChange((evt, session) => {
            let n = session?.access_token || ``;
            if ((s(n), !n)) {
              d(null);
              return;
            }
            g(n)
              .then(async (e) => {
                d(e.profile);
                if (evt === `SIGNED_IN` || evt === `INITIAL_SESSION`) {
                  try {
                    let synced = await syncAnonStarsToAccount(n, e?.profile?.user_id);
                    if (synced?.length) setStarIds(synced);
                  } catch {}
                }
              })
              .catch(() => d(null));
          });
          t = () => a.subscription.unsubscribe();
        }),
        () => {
          ((e = !1), t?.());
        }
      );
    }, []),
    (0, w.jsxs)(`main`, {
      className: `vortx-app-shell vortx-app-shell--with-cases-rail min-h-svh bg-surface text-ink${
        e === `map` ? ` vortx-app-shell--map` : ``
      }`,
      children: [
        e === `map` || e === `legal` ? null : (0, w.jsx)(greekLetterField, {}),
        (0, w.jsx)(casesStickyRail, {
          hidden: e === `admin` || e === `customer` || e === `pricing` || e === `map` || e === `legal`,
          onOpenCases: () => t(`cases`),
        }),
        (0, w.jsx)(pe, { open: h, onClose: () => _(!1) }),
        (0, w.jsx)(X, {
          open: n,
          onClose: () => r(!1),
          events: S,
          feedAccess: feedAccess,
          onSelect: (hit) => {
            r(!1);
            if (!hit) return;
            let q = sanitizeTapeQuery(hit.query);
            setTapeQuery(q);
            if (hit.stream) setBrowseType(parseBrowseType(hit.stream));
            t(`browse`);
          },
        }),
        (0, w.jsx)(`header`, {
          className: `vortx-site-header sticky top-0 z-20 border-b border-white/10 px-6`,
          children: (0, w.jsxs)(`div`, {
            className: `vortx-site-header__inner mx-auto flex max-w-6xl items-center gap-3`,
            children: [
              (0, w.jsx)(`button`, {
                type: `button`,
                onClick: () => t(`overview`),
                className: `vortx-site-header__mark`,
                children: `Vortx`,
              }),
              (0, w.jsx)(`nav`, {
                className: `vortx-site-header__nav`,
                "aria-label": `Primary`,
                children: k
                  .filter((n) => n.id !== `pricing` && n.id !== `customer`)
                  .map((n) =>
                    n.href
                      ? (0, w.jsx)(
                          `a`,
                          {
                            href: n.href,
                            className: n.chip
                              ? `vortx-nav-chip`
                              : `vortx-site-header__link`,
                            children: n.label,
                          },
                          n.id,
                        )
                      : (0, w.jsx)(
                          `button`,
                          {
                            type: `button`,
                            onClick: () => {
                              if (n.id === `map`) {
                                setMapFocusTick((x) => x + 1);
                                openMapView(t, ``, setMapFocusId);
                                return;
                              }
                              t(n.id);
                            },
                            className: `vortx-site-header__link${e === n.id || (n.id === `browse` && isBrowseStream(e)) ? ` is-active` : ``}`,
                            children: n.label,
                          },
                          n.id,
                        ),
                  ),
              }),
              (0, w.jsxs)(`div`, {
                className: `vortx-site-header__actions`,
                children: [
                  (0, w.jsxs)(`button`, {
                    type: `button`,
                    onClick: () => r(!0),
                    className: `vortx-site-header__searchfield`,
                    "aria-label": `Search a ticker or company`,
                    children: [
                      (0, w.jsx)(`span`, {
                        className: `vortx-site-header__searchfield-placeholder`,
                        children: `Search NVDA`,
                      }),
                      (0, w.jsx)(`kbd`, {
                        className: `vortx-site-header__kbd`,
                        children: `⌘K`,
                      }),
                    ],
                  }),
                  u
                    ? (0, w.jsxs)(`span`, {
                        className: `vortx-site-header__plan data-font`,
                        children: [
                          feedAccess?.subscriber
                            ? feedAccess.tier_label || u.plan
                            : u.subscription_status === `active` || u.subscription_status === `trialing`
                              ? u.plan
                              : `preview`,
                        ],
                      })
                    : null,
                  (0, w.jsx)(`button`, {
                    type: `button`,
                    onClick: () => t(`customer`),
                    className: `vortx-site-header__text`,
                    children: u ? `My Desk` : `Login`,
                  }),
                  u
                    ? (0, w.jsxs)(`span`, {
                        className: `contents`,
                        children: [
                          (0, w.jsx)(`button`, {
                            type: `button`,
                            onClick: () => {
                              if (!window.vortxPasskeys) {
                                alert(`Passkeys are not available.`);
                                return;
                              }
                              window.vortxPasskeys
                                .register()
                                .then((res) => {
                                  if (res?.recovery_codes) window.vortxPasskeys.showRecoveryCodes(res.recovery_codes);
                                })
                                .catch((err) =>
                                  alert(err instanceof Error ? err.message : `Could not add a passkey.`),
                                );
                            },
                            className: `vortx-site-header__text`,
                            children: `Add passkey`,
                          }),
                          (0, w.jsx)(`button`, {
                        type: `button`,
                        onClick: () => {
                          D(
                            async () => {
                              let { supabase: e } = await import(`./supabase-D4HD8mHW.js`);
                              return { supabase: e };
                            },
                            __vite__mapDeps([0, 1]),
                          )
                            .then(({ supabase: e }) => e?.auth.signOut())
                            .finally(() => {
                              (s(``), d(null), t(`overview`));
                            });
                        },
                        className: `vortx-site-header__text`,
                        children: `Sign out`,
                      }),
                        ],
                      })
                    : (0, w.jsx)(`button`, {
                        type: `button`,
                        onClick: () => t(`pricing`),
                        className: `vortx-site-header__cta`,
                        children: `Start trial`,
                      }),
                  u && !feedAccess?.subscriber
                    ? (0, w.jsx)(`button`, {
                        type: `button`,
                        onClick: () => t(`pricing`),
                        className: `vortx-site-header__cta`,
                        children: `Start trial`,
                      })
                    : null,
                ],
              }),
            ],
          }),
        }),
        (0, w.jsxs)(`div`, {
          className: `vortx-app-main`,
          children: [
        v.isLoading &&
        !v.data &&
        e !== `map` &&
        e !== `overview` &&
        e !== `browse` &&
        !isBrowseStream(e)
          ? (0, w.jsx)(`div`, {
              className: `mx-auto max-w-6xl px-6 pt-4`,
              "aria-live": `polite`,
              children: (0, w.jsx)(tapeSkeleton, { rows: 8 }),
            })
          : null,
        v.isError && e !== `map`
          ? (0, w.jsxs)(`div`, {
              className: `mx-auto max-w-6xl px-6 pt-6`,
              role: `alert`,
              children: [
                (0, w.jsxs)(`div`, {
                  className: `rounded-2xl border border-rose-300/30 bg-rose-950/20 p-5`,
                  children: [
                    (0, w.jsx)(`p`, {
                      className: `text-sm font-medium text-rose-100`,
                      children: `Trading feed could not load.`,
                    }),
                    (0, w.jsx)(`p`, {
                      className: `mt-1 text-sm text-rose-100/80`,
                      children:
                        v.error instanceof Error
                          ? v.error.message
                          : `Check your connection and try again.`,
                    }),
                    (0, w.jsx)(`button`, {
                      type: `button`,
                      onClick: () => v.refetch(),
                      className: `mt-3 rounded-xl border border-rose-200/40 px-4 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-900/40`,
                      children: `Retry feed`,
                    }),
                  ],
                }),
              ],
            })
          : null,
        e === `overview`
          ? (0, w.jsxs)(`div`, {
              className: `vortx-overview-shell`,
              children: [
                (0, w.jsx)(oe, {
                  events: S,
                  entities: x,
                  onOpenPricing: () => t(`pricing`),
                  onOpenLegal: () => t(`legal`),
                  onOpenCommand: () => r(!0),
                  onOpenMap: (signalId) => {
                    setMapFocusTick((x) => x + 1);
                    openMapView(t, signalId, setMapFocusId);
                  },
                  authToken: o,
                  starIds,
                  watchFlashId,
                  onToggleWatch: toggleGlobalWatch,
                  watchRefreshKey,
                  feedLoading: (v.isLoading || v.isFetching) && !S.length && !v.isError,
                  stats: {
                    filings: E.data?.records_surfaced ?? S.length,
                    entities: E.data?.companies_tracked ?? x.length,
                    sources: C.length,
                  },
                }),
              ],
            })
          : null,
        e === `map`
          ? (0, w.jsx)(geographicSignalMapView, {
              authToken: o,
              profile: u,
              feedAccess,
              starIds,
              watchFlashId,
              onToggleWatch: toggleGlobalWatch,
              onOpenPricing: () => t(`pricing`),
              focusSignal: mapFocusId,
              focusTick: mapFocusTick,
            })
          : null,
        e === `browse` || e === `congress` || e === `insider` || e === `thirteenf`
          ? (0, w.jsx)(tradingStreamView, {
              stream: e === `browse` ? browseType : e,
              events: S,
              onOpenPricing: () => t(`pricing`),
              onOpenOverview: () => t(`overview`),
              onOpenStream: (id) => {
                setBrowseType(parseBrowseType(id));
                t(`browse`);
              },
              showTypeToggle: !0,
              feedPrivileged: Boolean(feedAccess?.subscriber || u?.role === `admin`),
              authToken: o,
              starIds,
              watchFlashId,
              onToggleWatch: toggleGlobalWatch,
              watchRefreshKey,
              feedLoading: (v.isLoading || v.isFetching) && !S.length && !v.isError,
              forcedQuery: tapeQuery,
              onQueryChange: setTapeQuery,
            })
          : null,
        e === `cases`
          ? (0, w.jsx)(casesPublicView, {
              onOpenAdmin: t,
              isAdmin: u?.role === `admin`,
            })
          : null,
        e === `scan` ? (0, w.jsx)(blindSpotScanWizard, {}) : null,
        e === `sources` ? (0, w.jsx)(Q, { sources: C, marketing: Mk }) : null,
        e === `pricing`
          ? (0, w.jsx)(de, {
              plans: T,
              onRequestAccess: () => _(!0),
              teamsLine: E.data?.teams_line,
              companiesTracked: E.data?.companies_tracked ?? x.length,
              recordsSurfaced: E.data?.records_surfaced ?? S.length,
              subscriberCount: E.data?.subscriber_count,
              scanEntityIds: scanWatchlistIds,
              authEmail: u?.email || null,
              authToken: o || null,
              marketing: Mk,
            })
          : null,
        e === `customer`
          ? (0, w.jsx)(le, {
              token: o,
              profile: u,
              previewEvents: S,
              onSession: (e, t) => {
                (s(e), d(t));
              },
            })
          : null,
        e === `admin`
          ? (0, w.jsx)(ue, {
              token: o,
              onSession: (e, t) => {
                (s(e), d(t));
              },
            })
          : null,
        e === `legal` ? (0, w.jsx)(fe, {}) : null,
          ],
        }),
        (0, w.jsx)(me, {
          onOpenPricing: () => t(`pricing`),
          onOpenCustomer: () => t(`customer`),
          onRequestAccess: () => _(!0),
        }),
      ],
    })
  );
}
var ge = new s({ defaultOptions: { queries: { staleTime: 3e4, retry: 1 } } });
(0, u.createRoot)(document.getElementById(`root`)).render(
  (0, w.jsx)(l.StrictMode, {
    children: (0, w.jsx)(o, { client: ge, children: (0, w.jsx)(he, {}) }),
  }),
);
