/**
 * Minimal ZIP reader for Cloudflare Workers / Node (store + deflate).
 * Used for House Clerk FD index ZIPs.
 */

function readU16(view, offset) {
  return view.getUint16(offset, true)
}

function readU32(view, offset) {
  return view.getUint32(offset, true)
}

async function inflateRaw(bytes) {
  // Prefer Web DecompressionStream (Cloudflare Workers + modern Node). No node:zlib.
  if (typeof DecompressionStream !== 'function') {
    throw new Error('deflate_unsupported: DecompressionStream unavailable')
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/**
 * @param {ArrayBuffer|Uint8Array} input
 * @returns {Promise<Map<string, Uint8Array>>}
 */
export async function unzipToMap(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const out = new Map()
  let offset = 0
  while (offset + 30 < bytes.length) {
    const sig = readU32(view, offset)
    if (sig !== 0x04034b50) break
    const method = readU16(view, offset + 8)
    const compSize = readU32(view, offset + 18)
    const nameLen = readU16(view, offset + 26)
    const extraLen = readU16(view, offset + 28)
    const nameStart = offset + 30
    const name = new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLen))
    const dataStart = nameStart + nameLen + extraLen
    const compressed = bytes.subarray(dataStart, dataStart + compSize)
    let raw
    if (method === 0) raw = compressed
    else if (method === 8) raw = await inflateRaw(compressed)
    else throw new Error(`unsupported_zip_method_${method}`)
    out.set(name, raw)
    offset = dataStart + compSize
  }
  return out
}

export function decodeZipText(bytes, encoding = 'utf-8') {
  return new TextDecoder(encoding).decode(bytes)
}
