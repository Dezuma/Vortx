/**
 * Shared marketing copy for the insider/congressional trading transparency pivot.
 * Production SPA (.prod-reference.js) and React mirrors should stay aligned with these strings.
 */

export const PRODUCT_POSITIONING = {
  eyebrow: 'Public tape. Already filed.',
  headline: 'See Congress and insider stock trades',
  stageSub:
    'This is the list of trades Congress, insiders, and funds already reported. Type a ticker. Green is a buy. Red is a sell. Click Their trades to open one person. Research only, not a buy or sell call.',
  subcopy:
    'The free list is the same public homework. Vortx names the person and emails you when they file again, so the next move does not slip by.',
  pulseEyebrow: 'Live feed',
  pulseTitle: "Today's trades",
  pulseSocialProof: 'Start with ticker, side, and date. That is free.',
  pulseHint: 'Names and the next-trade email show after you subscribe.',
}

/** First-touch share card: iMessage, Slack, browser tab. Must answer "what is this?" */
export const SHARE_COPY = {
  title: 'Vortx | See Congress and insider stock trades',
  description:
    'Congress, insiders, and funds already file these trades. Vortx is that public tape in one list. Type a ticker, read buy or sell, open Their trades. Research only.',
  imageAlt: 'Vortx: see Congress and insider stock trades from public filings',
}

export const PRIMARY_NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'congress', label: 'Congress Trades' },
  { id: 'insider', label: 'Insider Trades' },
  { id: 'thirteenf', label: '13F Tracker' },
  { id: 'layoff-search', label: 'Layoff Search', href: '/layoff-search' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'customer', label: 'Login' },
]

export const OVERVIEW_MODULES = [
  { id: 'sources', label: 'Data Sources' },
  { id: 'cases', label: 'Case files', href: '/cases' },
  { id: 'scan', label: 'Scan My Companies' },
]

export const HERO_COPY = {
  eyebrow: PRODUCT_POSITIONING.eyebrow,
  headline: PRODUCT_POSITIONING.headline,
  stageSub: PRODUCT_POSITIONING.stageSub,
  subcopy: PRODUCT_POSITIONING.subcopy,
  pulseEyebrow: PRODUCT_POSITIONING.pulseEyebrow,
  pulseTitle: PRODUCT_POSITIONING.pulseTitle,
  pulseSocialProof: PRODUCT_POSITIONING.pulseSocialProof,
  pulseHint: PRODUCT_POSITIONING.pulseHint,
}

export const PRICING_COPY = {
  eyebrow: "Don't miss the next filing",
  headline: 'See the names. Get the next one in your inbox.',
  subcopy:
    'Ticker, buy or sell, and company stay free. That is the same public homework the big desks already read. Vortx names the lawmaker or insider and emails you when they file again, cleaner and faster than digging through government sites.',
  levelTitle: 'Same public homework',
  levelCopy:
    'They already filed. You get the same record on one screen, not buried in a government database.',
  timingTitle: 'Timing is the product',
  timingCopy:
    'A filing has a clock. Pay monthly so the name and the email are there when the next one posts, not after you hear about it.',
  reassure: 'Try Vortx free for 7 days, then $150/month. Cancel anytime.',
  aup: 'I understand this is public-record research only, not investment, trading, or legal advice.',
  planEyebrow: 'What you get',
  planSub:
    'Vortx plans: the $150/month plan (Nebula) shows the person who filed, a link to the original document, watchlists, and email alerts. Scout ($20) and Sentinel ($50) keep a few names open on the public tape. Full names on every row start at $150/month. 7-day trial, card required.',
  freeNote: 'Ticker, buy/sell, and company stay free. Pay only if you want the names and alerts.',
  investorToggle: 'Need this as a data feed for a team?',
  investorSubcopy:
    'Team plans add downloadable spreadsheets, links to the original filings, and more watchlist slots.',
  b2cLabel: 'For traders & researchers',
  b2bLabel: 'For funds, fintech & data teams',
  layoffNote: 'Need a one-off WARN check? Layoff Search is $5 per search - not bundled into subscriptions.',
}

export const DISCLAIMER_ONE_LINER =
  'Vortx shows public or licensed filings (Form 4, STOCK Act, 13F, WARN, court, and related administrative records). Research only. Not trading, financial, investment, tax, legal, credit, employment, or housing advice. Not a consumer report.'

export const API_RESEARCH_DISCLAIMER =
  'Records are public or administrative filings, not judgments. Not a consumer report. Do not use for credit, employment, insurance, or housing eligibility. Vortx does not provide legal, financial, credit, trading, or investment advice. See /legal.'

export const FCRA_PRODUCT_BANNER =
  'Research only. Vortx is not a consumer reporting agency and this is not a consumer report. Do not use it to hire, fire, rent, lend, insure, or make any other FCRA eligibility decision.'

export const LEGAL_PAGE = {
  kicker: 'Legal notice',
  title: 'Vortx Data LLC public-records notice',
  updated: 'September 10, 2026',
  contact: 'contact@vortxmkt.com',
  lead: DISCLAIMER_ONE_LINER,
  closer:
    'By using vortxmkt.com or any Vortx product, you agree to this notice. If you do not agree, do not use the site. Paid plans may add a subscriber agreement; if those conflict, the subscriber agreement controls for paid features. This page is not a substitute for advice from your own counsel. Print or save this page. Questions: contact@vortxmkt.com.',
}

export function legalSectionId(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export const LEGAL_SECTIONS = [
  {
    title: 'Data origin and source of truth',
    copy: 'Vortx Data LLC aggregates public or licensed records, including SEC EDGAR Form 4 and 13F filings, House and Senate STOCK Act disclosures, state WARN / layoff notices, and court or lien metadata where ingested. We do not create those filings. The issuing agency or court file is the source of truth. Always open the original record before you act. Parsed fields, titles, maps, and summaries can be incomplete, delayed, or wrong.',
  },
  {
    title: 'Not advice of any kind',
    copy: 'Vortx is a research index, not an adviser. We do not provide trading, financial, investment, tax, legal, HR, housing, tenant, contractor-licensing, or medical advice. Presence or absence of a filing is not a buy, sell, hold, hire, fire, rent, lend, or contract signal. Decisions you make are yours alone.',
  },
  {
    title: 'Not a consumer report (FCRA)',
    copy: 'Vortx is not a consumer reporting agency and does not furnish consumer reports under the Fair Credit Reporting Act. Do not use Vortx data, scores, scans, Contractor Check, Landlord Check, Job Safety Score, Layoff Search, watchlists, or case files to make eligibility decisions about credit, insurance, employment, housing, or another FCRA-covered purpose. Using Vortx for an FCRA-covered purpose is a material breach of this notice. If you need a legally permitted background or credit check, use a qualified CRA and follow FCRA procedures.',
  },
  {
    title: 'Not a broker, RIA, or credit agency',
    copy: 'Vortx Data LLC is not a broker-dealer, investment adviser, municipal advisor, bank, law firm, or credit bureau. Nothing on the site is an offer, solicitation, or recommendation of any security. 13F rows are delayed holdings reports, not live trades. STOCK Act amounts are often ranges. Form 4 amount fields may be shares, units, or dollars as filed.',
  },
  {
    title: 'No guilt, liability, or predicted outcome',
    copy: 'A Form 4, STOCK Act disclosure, 13F, WARN notice, lien, bankruptcy docket, or other record is an administrative or public filing, not a verdict. It does not mean a person or company committed wrongdoing, will fail, will lay people off, or that a price will move. Do not treat proximity on the map, timing between filings, or a case narrative as proof of coordination, insider knowledge, or causation.',
  },
  {
    title: 'Accuracy, matching, and delays',
    copy: 'Government feeds lag, omit amendments, and disagree with each other. Entity resolution, ticker mapping, geocoding, OCR, and XML parsing can attach the wrong issuer, address, person, or amount. Coverage is not nationwide for every record type. Silence in Vortx is not proof that no filing exists. Refresh, source links, and timestamps can fail. Use at your own risk, as-is, without warranty of merchantability, fitness, or non-infringement to the fullest extent permitted by law.',
  },
  {
    title: 'Maps, cases, and generated copy',
    copy: 'Map pins are geocoded from addresses on filings, usually an issuer, facility, or counsel address, not proof someone stood there. Case files and some summaries may be drafted with automated assistance and always require human review before you rely on them. They are not official government publications and not a complete legal file.',
  },
  {
    title: 'Activity counts and marketing',
    copy: 'Watcher counts, ranking boards, and similar activity metrics may mix real watchlist members with modeled heat so empty boards do not read as zero. They are not audited unique-user counts. Quotes and testimonials are individual opinions, not typical results, and not a representation of past or future trading performance.',
  },
  {
    title: 'Acceptable use',
    copy: 'Vortx data is licensed for informational and research purposes only. You may not use it to manipulate securities prices, coordinate trading, evade securities, privacy, or consumer-protection law, scrape or bulk-copy the service beyond your plan, share logins, bypass rate limits or paywalls, train models on Vortx outputs without a written license, or republish Vortx pages as if they were the original government record. You may not use Vortx as a tenant screen, employment screen, credit decision, insurance underwriting file, or other eligibility tool. Redistributing outputs as verified fact, investment advice, or a finding of liability is prohibited.',
  },
  {
    title: 'Accounts, watchlists, and privacy',
    copy: 'Watchlists, scans, and exports are for your internal review unless your plan says otherwise. We collect account, payment (via Stripe), usage, and support data needed to run the service. Do not upload data you are not allowed to share. We may retain logs for security, billing, and abuse prevention. See also product-specific notices on Scan, Contractor Check, Landlord Check, Job Safety Score, and Layoff Search.',
  },
  {
    title: 'Limitation of liability',
    copy: 'To the fullest extent permitted by law, Vortx Data LLC and its officers, contractors, and suppliers are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, trading losses, missed filings, or business interruption, even if advised of the possibility. Our total liability for a claim relating to the service is limited to the fees you paid to Vortx Data LLC for the product at issue in the three months before the claim, and that amount is your sole and exclusive monetary remedy. Except where prohibited, you must bring any claim within one year after it arises. Some jurisdictions do not allow certain limits; in those places our liability is limited to the maximum permitted.',
  },
  {
    title: 'No government affiliation',
    copy: 'Vortx Data LLC is a private company. We are not the SEC, Congress, a court, a state labor agency, or any other government body, and those bodies do not endorse this site. Form names, agency names, and similar labels identify public records. A Vortx page is not an official filing, docket, or government publication. Always open the original record.',
  },
  {
    title: 'Indemnification',
    copy: 'You will defend, indemnify, and hold harmless Vortx Data LLC and its officers, contractors, and suppliers from claims, damages, losses, and reasonable legal fees arising from your use of the service, your outputs, your content, your violation of this notice or law, or any use of Vortx data as a consumer report or for an FCRA-covered eligibility decision. We may assume exclusive defense of a claim at your expense.',
  },
  {
    title: 'Availability, security, and accounts',
    copy: 'The service may be delayed, incomplete, rate-limited, or offline. We do not promise uptime, completeness, or that a filing will appear before you need it. You are responsible for account credentials and for activity under your login. We may suspend or terminate access for abuse, nonpayment, security risk, or legal risk. Force majeure and third-party outages (including government feeds, Cloudflare, Stripe, and Supabase) can interrupt the product without liability.',
  },
  {
    title: 'Privacy, processors, and children',
    copy: 'We process account identifiers, watchlists, search queries, payment metadata via Stripe, and technical logs such as IP address, user-agent, and timestamps. Infrastructure may include Cloudflare, Supabase, and Stripe. We do not sell personal information for money. We may retain logs for security, billing, and abuse prevention. Email contact@vortxmkt.com to request access, correction, or deletion of account data we control; we may keep records required for billing, tax, security, or law. The service is not directed to children under 16. Do not use it if you are under 18.',
  },
  {
    title: 'Changes, contact, and law',
    copy: 'We may update this notice; the date above is the current version. Continued use after a change is acceptance of the update. Electronic notice on this page is sufficient. Contact Vortx Data LLC at contact@vortxmkt.com. This notice is governed by the laws of the United States and the state of Vortx Data LLC\'s principal place of business, without regard to conflict-of-law rules, except where a subscriber agreement specifies otherwise. If a court finds a term unenforceable, the rest remains in effect. No third-party beneficiaries are created except as needed to enforce indemnification and liability limits.',
  },
]

export const AUDIENCE_SEGMENTS = [
  {
    title: 'Retail traders',
    relief: 'See the disclosure before the thread.',
    copy: 'Form 4, STOCK Act, and 13F filings surface dated activity while it is still on the public record.',
    reach: 'X · Reddit · StockTwits',
  },
  {
    title: 'Quantitative researchers',
    relief: 'Cleaned filing fields, not PDF archaeology.',
    copy: 'API and export tiers deliver parsed filer, ticker, date, and amount fields for research pipelines.',
    reach: 'Notebooks · backtests · screens',
  },
  {
    title: 'Financial media',
    relief: 'Source-linked filings for the story.',
    copy: 'Open the disclosure URL, quote the filing date, and keep the disclaimer intact.',
    reach: 'News desks · newsletters',
  },
  {
    title: 'Politically engaged investors',
    relief: 'Congressional trades, same-day public record.',
    copy: 'STOCK Act disclosures are indexed beside insider and institutional flows - research only, not advice.',
    reach: 'Civic · policy · markets',
  },
]
