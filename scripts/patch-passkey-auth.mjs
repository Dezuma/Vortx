#!/usr/bin/env node
/**
 * Patch the locked production login panel with first-class passkey + recovery modes.
 * The Vite src tree is not the live customer UI; this is the deploy path that ships.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const bundlePath = process.argv[2]
if (!bundlePath) {
  console.error('Usage: node scripts/patch-passkey-auth.mjs <path-to-index-*.js>')
  process.exit(1)
}

const file = path.resolve(bundlePath)
let source = fs.readFileSync(file, 'utf8')

function alreadyPatched(marker) {
  return source.includes(marker)
}

function replaceOnce(from, to, label, marker = to) {
  if (alreadyPatched(marker)) {
    console.log(`already patched: ${label}`)
    return true
  }
  if (!source.includes(from)) {
    console.error(`passkey auth anchor missing: ${label}`)
    return false
  }
  source = source.replace(from, to)
  return true
}

const stateFrom = '[np, setNp] = (0, l.useState)(``),\n    [mode, setMode] = (0, l.useState)(`password`),'
const stateTo =
  '[np, setNp] = (0, l.useState)(``),\n    [rc, setRc] = (0, l.useState)(``),\n    [mode, setMode] = (0, l.useState)(`password`),'

const handlersFrom = '  let oauthBtn = (e, t) =>'
const handlersTo = `  async function passkeyLogin() {
    (d(\`\`), setInfo(\`\`), p(!0));
    try {
      if (!window.vortxPasskeys) throw Error(\`Passkeys are not available.\`);
      let e = a.trim().toLowerCase();
      let t = await window.vortxPasskeys.signIn(e);
      if (!t?.access_token) throw Error(\`No access token returned.\`);
      let r = await sb();
      await persist(r, t.access_token, t.refresh_token || \`\`);
      n(t.access_token, (await g(t.access_token)).profile);
    } catch (e) {
      d(e instanceof Error ? e.message : \`Passkey sign-in failed.\`);
    } finally {
      p(!1);
    }
  }
  async function consumeCode() {
    (d(\`\`), setInfo(\`\`), p(!0));
    try {
      if (!window.vortxPasskeys) throw Error(\`Recovery is not available.\`);
      let e = a.trim().toLowerCase();
      let t = await window.vortxPasskeys.consumeRecovery(e, rc);
      if (!t?.access_token) throw Error(\`No access token returned.\`);
      let r = await sb();
      await persist(r, t.access_token, t.refresh_token || \`\`);
      n(t.access_token, (await g(t.access_token)).profile);
    } catch (e) {
      d(e instanceof Error ? e.message : \`Recovery failed.\`);
    } finally {
      p(!1);
    }
  }
  let oauthBtn = (e, t) =>`

const modeFrom =
  'children: `Forgot password`,\n                    }),\n                  ],\n                }),'
const modeTo =
  'children: `Forgot password`,\n                    }),\n                    (0, w.jsx)(`button`, {\n                      type: `button`,\n                      onClick: () => (setMode(`passkey`), d(``)),\n                      className: `rounded-lg px-3 py-1.5 ${mode === `passkey` ? `border border-white/15 bg-white/10 text-ink` : `text-muted hover:text-ink`}`,\n                      children: `Passkey`,\n                    }),\n                    (0, w.jsx)(`button`, {\n                      type: `button`,\n                      onClick: () => (setMode(`code`), d(``)),\n                      className: `rounded-lg px-3 py-1.5 ${mode === `code` ? `border border-white/15 bg-white/10 text-ink` : `text-muted hover:text-ink`}`,\n                      children: `Recovery code`,\n                    }),\n                  ],\n                }),'

const dispatchFrom =
  'mode === `password` ? m() : mode === `magic` ? magic() : recover()'
const dispatchTo =
  'mode === `password` ? m() : mode === `magic` ? magic() : mode === `passkey` ? passkeyLogin() : mode === `code` ? consumeCode() : recover()'

const passwordFieldFrom = `                    mode === \`password\`
                      ? (0, w.jsx)(\`input\`, {
                          className: \`input w-full\`,
                          value: s,
                          onChange: (e) => c(e.target.value),
                          type: \`password\`,
                          autoComplete: \`current-password\`,
                          placeholder: \`Password\`,
                          onKeyDown: (e) => {
                            e.key === \`Enter\` && m();
                          },
                        })
                      : null,`
const passwordFieldTo = `                    mode === \`password\`
                      ? (0, w.jsx)(\`input\`, {
                          className: \`input w-full\`,
                          value: s,
                          onChange: (e) => c(e.target.value),
                          type: \`password\`,
                          autoComplete: \`current-password\`,
                          placeholder: \`Password\`,
                          onKeyDown: (e) => {
                            e.key === \`Enter\` && m();
                          },
                        })
                      : mode === \`code\`
                        ? (0, w.jsx)(\`input\`, {
                            className: \`input w-full\`,
                            value: rc,
                            onChange: (e) => setRc(e.target.value),
                            type: \`text\`,
                            autoComplete: \`one-time-code\`,
                            placeholder: \`Recovery code\`,
                            onKeyDown: (e) => {
                              e.key === \`Enter\` && consumeCode();
                            },
                          })
                        : null,`

const submitFrom = `                      children: f
                        ? \`Working...\`
                        : mode === \`password\`
                          ? \`Sign in\`
                          : mode === \`magic\`
                            ? \`Email me a sign-in link\`
                            : \`Send reset link\`,`
const submitTo = `                      children: f
                        ? \`Working...\`
                        : mode === \`password\`
                          ? \`Sign in\`
                          : mode === \`magic\`
                            ? \`Email me a sign-in link\`
                            : mode === \`passkey\`
                              ? \`Sign in with a passkey\`
                              : mode === \`code\`
                                ? \`Use recovery code\`
                                : \`Send reset link\`,`

const signOutFrom = `                  u
                    ? (0, w.jsx)(\`button\`, {
                        type: \`button\`,
                        onClick: () => {
                          D(`
const signOutTo = `                  u
                    ? (0, w.jsxs)(\`span\`, {
                        className: \`contents\`,
                        children: [
                          (0, w.jsx)(\`button\`, {
                            type: \`button\`,
                            onClick: () => {
                              if (!window.vortxPasskeys) {
                                alert(\`Passkeys are not available.\`);
                                return;
                              }
                              window.vortxPasskeys
                                .register()
                                .then((res) => {
                                  if (res?.recovery_codes) window.vortxPasskeys.showRecoveryCodes(res.recovery_codes);
                                })
                                .catch((err) =>
                                  alert(err instanceof Error ? err.message : \`Could not add a passkey.\`),
                                );
                            },
                            className: \`vortx-site-header__text\`,
                            children: \`Add passkey\`,
                          }),
                          (0, w.jsx)(\`button\`, {
                        type: \`button\`,
                        onClick: () => {
                          D(`

const signOutCloseFrom = `                        children: \`Sign out\`,
                      })
                    : (0, w.jsx)(\`button\`, {`
const signOutCloseTo = `                        children: \`Sign out\`,
                      }),
                        ],
                      })
                    : (0, w.jsx)(\`button\`, {`

const ok = [
  replaceOnce(stateFrom, stateTo, 'recovery-code state', '[rc, setRc] = (0, l.useState)'),
  replaceOnce(handlersFrom, handlersTo, 'passkey handlers', 'async function passkeyLogin()'),
  replaceOnce(modeFrom, modeTo, 'login mode tabs', 'setMode(`passkey`)'),
  replaceOnce(passwordFieldFrom, passwordFieldTo, 'recovery code field', 'placeholder: `Recovery code`'),
  replaceOnce(submitFrom, submitTo, 'submit labels', 'Sign in with a passkey'),
  replaceOnce(signOutFrom, signOutTo, 'add-passkey open', 'Add passkey'),
  replaceOnce(
    signOutCloseFrom,
    signOutCloseTo,
    'add-passkey close',
    'children: `Sign out`,\n                      }),\n                        ],\n                      })',
  ),
].every(Boolean)

if (source.includes(dispatchFrom)) {
  source = source.replaceAll(dispatchFrom, dispatchTo)
} else if (!source.includes(dispatchTo)) {
  console.error('passkey auth anchor missing: mode dispatch')
  process.exit(1)
}

if (!ok) process.exit(1)

fs.writeFileSync(file, source)
const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
if (syntax.status !== 0) {
  console.error(syntax.stderr || syntax.stdout)
  process.exit(1)
}
console.log(`patched passkey auth ${file}`)
