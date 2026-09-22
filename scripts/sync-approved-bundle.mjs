#!/usr/bin/env node
/**
 * Copy the readable approved bundle into dist before ensure-patched-dist / deploy.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'frontend', '.prod-reference.js')
const distIndex = path.join(root, 'frontend', 'dist', 'index.html')
let target = path.join(root, 'frontend', 'dist', 'assets', 'index-C-ubd9Cu.js')
if (fs.existsSync(distIndex)) {
  const html = fs.readFileSync(distIndex, 'utf8')
  const match = html.match(/\/assets\/(index-[^"'`\s]+\.js)/)
  if (match) {
    target = path.join(root, 'frontend', 'dist', 'assets', match[1])
  }
}

if (!fs.existsSync(source)) {
  console.error('Missing frontend/.prod-reference.js')
  process.exit(1)
}

fs.mkdirSync(path.dirname(target), { recursive: true })
fs.copyFileSync(source, target)
console.log('Synced .prod-reference.js → dist/assets/index-C-ubd9Cu.js')
