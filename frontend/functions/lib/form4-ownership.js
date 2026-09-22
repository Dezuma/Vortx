/**
 * Fetch + parse SEC Form 4 ownershipDocument XML for transaction legs.
 * Atom titles alone cannot supply code / shares / issuer / trade date.
 */

function clean(value) {
  return String(value ?? '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tag(xml, name) {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i')
  const m = String(xml || '').match(re)
  return m ? m[1] : ''
}

function tagValue(xml, name) {
  const block = tag(xml, name)
  if (!block) return ''
  const nested = block.match(/<value[^>]*>([\s\S]*?)<\/value>/i)
  return clean(nested?.[1] || block)
}

function dateOnly(value) {
  const raw = clean(value)
  const m = raw.match(/(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

export function accessionFromAtomId(id) {
  const m = String(id || '').match(/accession-number=([0-9-]+)/i)
  return m ? m[1] : ''
}

export function indexJsonUrlFromAtomLink(link) {
  const href = String(link || '').trim()
  if (!/Archives\/edgar\//i.test(href)) return ''
  return href
    .replace(/-index\.html?(?:#.*)?$/i, '-index.json')
    .replace(/-index\.htm(?:#.*)?$/i, '-index.json')
}

export function pickOwnershipXmlName(items = []) {
  const names = (items || [])
    .map((item) => (typeof item === 'string' ? item : item?.name || ''))
    .map((name) => clean(name))
    .filter(Boolean)
  const preferred = names.find(
    (name) =>
      /\.xml$/i.test(name) &&
      !/xsl/i.test(name) &&
      (/form4/i.test(name) || /ownership/i.test(name) || /^wk-form4/i.test(name.split('/').pop() || '')),
  )
  if (preferred) return preferred
  return (
    names.find((name) => /\.xml$/i.test(name) && !/xsl/i.test(name) && !/ex-/i.test(name)) || ''
  )
}

/**
 * Parse ownershipDocument XML into structured Form 4 fields.
 */
export function parseOwnershipDocument(xmlText) {
  const xml = String(xmlText || '')
  if (!/ownershipDocument/i.test(xml)) return null

  const issuerBlock = tag(xml, 'issuer')
  const ownerBlock = tag(xml, 'reportingOwner') || tag(xml, 'reportingOwnerId')
  const issuerName = tagValue(issuerBlock, 'issuerName') || clean(tag(issuerBlock, 'issuerName'))
  const issuerCik = tagValue(issuerBlock, 'issuerCik') || clean(tag(issuerBlock, 'issuerCik'))
  const ticker =
    tagValue(issuerBlock, 'issuerTradingSymbol') || clean(tag(issuerBlock, 'issuerTradingSymbol'))
  const ownerName =
    tagValue(ownerBlock, 'rptOwnerName') ||
    clean(tag(ownerBlock, 'rptOwnerName')) ||
    tagValue(xml, 'rptOwnerName')
  const ownerCik =
    tagValue(ownerBlock, 'rptOwnerCik') ||
    clean(tag(ownerBlock, 'rptOwnerCik')) ||
    tagValue(xml, 'rptOwnerCik')

  const txBlocks = [
    ...String(xml).matchAll(/<nonDerivativeTransaction[\s\S]*?<\/nonDerivativeTransaction>/gi),
  ].map((m) => m[0])

  const transactions = txBlocks
    .map((block) => {
      const code =
        tagValue(block, 'transactionCode') ||
        clean(tag(tag(block, 'transactionCoding'), 'transactionCode'))
      const sharesRaw =
        tagValue(block, 'transactionShares') ||
        tagValue(tag(block, 'transactionAmounts'), 'transactionShares')
      const priceRaw =
        tagValue(block, 'transactionPricePerShare') ||
        tagValue(tag(block, 'transactionAmounts'), 'transactionPricePerShare')
      const tradeDate =
        dateOnly(tagValue(block, 'transactionDate')) ||
        dateOnly(tag(block, 'transactionDate'))
      const shares = Number(String(sharesRaw).replace(/,/g, ''))
      const price = Number(String(priceRaw).replace(/,/g, ''))
      const amount =
        Number.isFinite(shares) && Number.isFinite(price) && shares > 0 && price >= 0
          ? shares * price
          : Number.isFinite(shares)
            ? shares
            : null
      return {
        code: clean(code).toUpperCase(),
        shares: Number.isFinite(shares) ? shares : null,
        price: Number.isFinite(price) ? price : null,
        amount,
        tradeDate,
      }
    })
    .filter((tx) => tx.code || tx.tradeDate || tx.shares != null)

  // Prefer first open-market P/S leg; else first leg.
  const preferred =
    transactions.find((tx) => tx.code === 'P' || tx.code === 'S') || transactions[0] || null

  return {
    issuerName: issuerName || null,
    issuerCik: issuerCik || null,
    ticker: ticker && ticker !== 'NONE' ? ticker.toUpperCase() : null,
    ownerName: ownerName || null,
    ownerCik: ownerCik || null,
    tradeDate: preferred?.tradeDate || null,
    transactionCode: preferred?.code || null,
    shares: preferred?.shares ?? null,
    amount: preferred?.amount ?? null,
    transactionCount: transactions.length,
    transactions,
  }
}

export function ownershipXmlUrlFromIndexHtml(html, pageUrl = '') {
  const hrefs = [...String(html || '').matchAll(/href=["']([^"']+\.xml)["']/gi)].map((m) => m[1])
  const preferred =
    hrefs.find((h) => /ownership\.xml$/i.test(h) && !/\/xsl/i.test(h)) ||
    hrefs.find((h) => /\.xml$/i.test(h) && !/\/xsl/i.test(h) && /form4|ownership|primary/i.test(h)) ||
    hrefs.find((h) => /\.xml$/i.test(h) && !/\/xsl/i.test(h))
  if (!preferred) return ''
  if (/^https?:\/\//i.test(preferred)) return preferred
  if (preferred.startsWith('/')) return `https://www.sec.gov${preferred}`
  try {
    return new URL(preferred, pageUrl || 'https://www.sec.gov/').toString()
  } catch {
    return ''
  }
}

async function resolveOwnershipXmlUrl(entry, deps, headers) {
  const requestText = deps.requestText
  const requestJson = deps.requestJson
  const indexUrl = indexJsonUrlFromAtomLink(entry.link)
  if (indexUrl) {
    try {
      const index = await requestJson(indexUrl, { headers })
      const items = index?.directory?.item || []
      const xmlName = pickOwnershipXmlName(items)
      if (xmlName) {
        const base = indexUrl.replace(/[^/]+$/, '')
        return `${base}${xmlName.replace(/^\//, '')}`
      }
    } catch {
      // Many fresh Form 4s have HTML indexes only; fall through.
    }
  }

  const htmlUrl = String(entry.link || '').trim()
  if (!htmlUrl) return ''
  try {
    const html = await requestText(htmlUrl, {
      headers: { ...headers, accept: 'text/html,application/xhtml+xml,*/*' },
    })
    return ownershipXmlUrlFromIndexHtml(html, htmlUrl)
  } catch {
    return ''
  }
}

/**
 * Enrich an Atom Form 4 entry by fetching ownership XML.
 * @param {object} entry atom entry
 * @param {{ requestText: Function, requestJson: Function, userAgent?: string }} deps
 */
export async function enrichForm4EntryFromOwnership(entry, deps) {
  const requestText = deps?.requestText
  const requestJson = deps?.requestJson
  if (typeof requestText !== 'function' || typeof requestJson !== 'function') return entry

  const headers = {
    accept: 'application/json,application/xml,text/xml,*/*',
    'user-agent': deps.userAgent || 'VortxResearchBot/1.0 (https://vortxmkt.com)',
  }

  const xmlUrl = await resolveOwnershipXmlUrl(entry, deps, headers)
  if (!xmlUrl) return entry

  let xml
  try {
    xml = await requestText(xmlUrl, { headers })
  } catch {
    return entry
  }
  const parsed = parseOwnershipDocument(xml)
  if (!parsed) return entry

  return {
    ...entry,
    companyName: parsed.ownerName || entry.companyName,
    filer: parsed.ownerName || entry.filer || entry.companyName,
    issuer: parsed.issuerName || entry.issuer || '',
    ticker: parsed.ticker || entry.ticker || '',
    transactionCode: parsed.transactionCode || entry.transactionCode || '',
    amount: parsed.amount ?? entry.amount ?? null,
    shares: parsed.shares ?? entry.shares ?? null,
    trade_date: parsed.tradeDate || entry.trade_date || null,
    filing_date: entry.filing_date || parsed.tradeDate || null,
    issuerCik: parsed.issuerCik,
    ownerCik: parsed.ownerCik,
    ownership_enriched: true,
    ownership_tx_count: parsed.transactionCount,
    ownership_xml_url: xmlUrl,
  }
}
