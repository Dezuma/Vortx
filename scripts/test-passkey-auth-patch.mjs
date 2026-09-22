#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const reference = path.join(root, 'frontend', '.prod-reference.js')
assert.ok(fs.existsSync(reference), 'missing frontend/.prod-reference.js')

const tmp = path.join(os.tmpdir(), `vortx-passkey-patch-${process.pid}.js`)
fs.copyFileSync(reference, tmp)

const first = spawnSync(process.execPath, ['scripts/patch-passkey-auth.mjs', tmp], {
  cwd: root,
  encoding: 'utf8',
})
assert.equal(first.status, 0, first.stderr || first.stdout)
const patched = fs.readFileSync(tmp, 'utf8')
assert.match(patched, /async function passkeyLogin/)
assert.match(patched, /Sign in with a passkey/)
assert.match(patched, /Add passkey/)
assert.match(patched, /Recovery code/)

const second = spawnSync(process.execPath, ['scripts/patch-passkey-auth.mjs', tmp], {
  cwd: root,
  encoding: 'utf8',
})
assert.equal(second.status, 0, second.stderr || second.stdout)
assert.equal(fs.readFileSync(tmp, 'utf8'), patched)
fs.unlinkSync(tmp)
console.log('ok  passkey auth patch is idempotent and inserts login modes')
