/**
 * Minimal XLSX reader for California EDD WARN weekly reports.
 * Parses only sharedStrings + one worksheet sheet XML (no external deps).
 */

function readU16(view, offset) {
  return view.getUint16(offset, true)
}

function readU32(view, offset) {
  return view.getUint32(offset, true)
}

/** Async inflate for Cloudflare Workers DecompressionStream. */
export async function inflateDeflateRaw(input) {
  const stream = new Blob([input]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const out = await new Response(stream).arrayBuffer()
  return new Uint8Array(out)
}

export async function unzipEntriesAsync(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const entries = []
  let offset = 0
  while (offset + 30 <= bytes.length) {
    const sig = readU32(view, offset)
    if (sig !== 0x04034b50) break
    const compMethod = readU16(view, offset + 8)
    const compSize = readU32(view, offset + 18)
    const nameLen = readU16(view, offset + 26)
    const extraLen = readU16(view, offset + 28)
    const nameStart = offset + 30
    const name = new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLen))
    const dataStart = nameStart + nameLen + extraLen
    const raw = bytes.subarray(dataStart, dataStart + compSize)
    let data = raw
    if (compMethod === 8) {
      data = await inflateDeflateRaw(raw)
    }
    entries.push({ name, data })
    offset = dataStart + compSize
  }
  return entries
}

function colLettersToIndex(col) {
  let index = 0
  for (const ch of col) {
    index = index * 26 + (ch.charCodeAt(0) - 64)
  }
  return index - 1
}

function cellRefToCoords(ref) {
  const match = String(ref || '').match(/^([A-Z]+)(\d+)$/)
  if (!match) return { col: 0, row: 0 }
  return { col: colLettersToIndex(match[1]), row: Number(match[2]) - 1 }
}

function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function parseSharedStrings(xmlText) {
  const strings = []
  const items = xmlText.match(/<(?:\w+:)?si[\s>][\s\S]*?<\/(?:\w+:)?si>/g) || []
  for (const item of items) {
    const parts = [...item.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((match) =>
      decodeXmlEntities(match[1]),
    )
    strings.push(parts.join(''))
  }
  return strings
}

function parseSheetRows(xmlText, sharedStrings) {
  const rows = []
  const rowNodes = xmlText.match(/<(?:\w+:)?row[\s>][\s\S]*?<\/(?:\w+:)?row>/g) || []
  for (const rowNode of rowNodes) {
    const values = []
    const cells = rowNode.match(/<(?:\w+:)?c[\s>][\s\S]*?<\/(?:\w+:)?c>/g) || []
    for (const cell of cells) {
      const refMatch = cell.match(/\br="([A-Z]+\d+)"/)
      const { col } = cellRefToCoords(refMatch?.[1] || '')
      const typeMatch = cell.match(/\bt="([^"]+)"/)
      const valueMatch = cell.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)
      let value = decodeXmlEntities(valueMatch?.[1] || '')
      if (typeMatch?.[1] === 's') {
        value = sharedStrings[Number(value)] || ''
      }
      values[col] = String(value || '').trim()
    }
    rows.push(values)
  }
  return rows
}

function findDetailedSheetPath(entries) {
  const byName = Object.fromEntries(entries.map((entry) => [entry.name, entry.data]))
  const workbookXml = new TextDecoder().decode(byName['xl/workbook.xml'] || new Uint8Array())
  const relsXml = new TextDecoder().decode(byName['xl/_rels/workbook.xml.rels'] || new Uint8Array())
  const relMap = {}
  for (const rel of relsXml.match(/<Relationship[\s\S]*?\/>/g) || []) {
    const id = rel.match(/\bId="([^"]+)"/)?.[1]
    const target = rel.match(/\bTarget="([^"]+)"/)?.[1]
    if (id && target) relMap[id] = target
  }
  for (const sheet of workbookXml.match(/<(?:\w+:)?sheet[\s\S]*?\/>/g) || []) {
    const title = sheet.match(/\bname="([^"]+)"/)?.[1] || ''
    if (!/detailed warn report/i.test(title)) continue
    const rid = sheet.match(/r:id="([^"]+)"/)?.[1]
    const target = relMap[rid || ''] || ''
    return target.startsWith('/') ? target.slice(1) : `xl/${target}`
  }
  return 'xl/worksheets/sheet3.xml'
}

/** Convert Excel serial date (1900 system) to YYYY-MM-DD. */
export function excelSerialToIsoDate(serial) {
  const n = Number(serial)
  if (!Number.isFinite(n) || n <= 0) return null
  const epoch = Date.UTC(1899, 11, 30)
  const ms = epoch + n * 86_400_000
  return new Date(ms).toISOString().slice(0, 10)
}

function normalizeHeader(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function headerIndex(headers, candidates) {
  for (const candidate of candidates) {
    const idx = headers.findIndex((header) => normalizeHeader(header) === normalizeHeader(candidate))
    if (idx >= 0) return idx
  }
  for (let i = 0; i < headers.length; i += 1) {
    const header = normalizeHeader(headers[i])
    if (candidates.some((candidate) => header.includes(normalizeHeader(candidate)))) return i
  }
  return -1
}

function parseSlashDate(value) {
  const text = String(value || '').trim()
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!match) return null
  const [, month, day, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/**
 * Parse California EDD WARN XLSX bytes into normalized row objects.
 * @param {ArrayBuffer|Uint8Array} buffer
 */
export async function parseCaliforniaWarnXlsx(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const entries = await unzipEntriesAsync(bytes)
  const byName = Object.fromEntries(entries.map((entry) => [entry.name, entry.data]))
  const sharedText = new TextDecoder().decode(byName['xl/sharedStrings.xml'] || new Uint8Array())
  const sharedStrings = parseSharedStrings(sharedText)
  const sheetPath = findDetailedSheetPath(entries)
  const sheetText = new TextDecoder().decode(byName[sheetPath] || new Uint8Array())
  const rows = parseSheetRows(sheetText, sharedStrings)
  if (!rows.length) return []

  let headerRowIndex = rows.findIndex((row) =>
    row.some((cell) => /county\/parish/i.test(cell)) && row.some((cell) => /company/i.test(cell)),
  )
  if (headerRowIndex < 0) headerRowIndex = 1
  const headers = rows[headerRowIndex] || []
  const countyIdx = headerIndex(headers, ['County/Parish', 'County'])
  const noticeIdx = headerIndex(headers, ['Notice Date', 'Notice\nDate'])
  const processedIdx = headerIndex(headers, ['Processed Date', 'Processed\nDate'])
  const effectiveIdx = headerIndex(headers, ['Effective Date', 'Effective \nDate'])
  const companyIdx = headerIndex(headers, ['Company'])
  const typeIdx = headerIndex(headers, ['Layoff/Closure', 'Layoff/\nClosure'])
  const workersIdx = headerIndex(headers, ['No. Of Employees', 'No. Of\nEmployees'])
  const addressIdx = headerIndex(headers, ['Address'])
  const industryIdx = headerIndex(headers, ['Related Industry'])

  const out = []
  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i]
    const company = row[companyIdx] || ''
    if (!company || /^county\/parish/i.test(company)) continue
    const county = row[countyIdx] || ''
    const noticeDate = excelSerialToIsoDate(row[noticeIdx]) || parseSlashDate(row[noticeIdx])
    const effectiveDate = excelSerialToIsoDate(row[effectiveIdx]) || parseSlashDate(row[effectiveIdx])
    const workersRaw = row[workersIdx] || ''
    const layoffType = [row[typeIdx], row[industryIdx]].filter(Boolean).join(' / ')
    out.push({
      county,
      notice_date: noticeDate,
      processed_date: excelSerialToIsoDate(row[processedIdx]) || parseSlashDate(row[processedIdx]),
      effective_date: effectiveDate,
      company,
      layoff_type: layoffType || null,
      workers: workersRaw,
      address: row[addressIdx] || null,
      industry: row[industryIdx] || null,
    })
  }
  return out
}
