#!/usr/bin/env node
/**
 * Patch approved production bundle: admin user upgrades + email/lead tracking UI.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const argBundle = process.argv[2]
const bundlePath = argBundle
  ? path.resolve(argBundle)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend/dist/assets/index-C-ubd9Cu.js')

let source = fs.readFileSync(bundlePath, 'utf8')

const apiHelper =
  'function x(e,t){return h(`/api/admin/service-requests`,e,{method:`PATCH`,body:JSON.stringify(t)})}'
const apiHelperWithUsers =
  'function x(e,t){return h(`/api/admin/service-requests`,e,{method:`PATCH`,body:JSON.stringify(t)})}function pu(e,t){return h(`/api/admin/users`,e,{method:`PATCH`,body:JSON.stringify(t)})}'

if (!source.includes(apiHelper)) {
  console.error('admin API helper anchor not found')
  process.exit(1)
}
if (!source.includes('function pu(e,t){return h(`/api/admin/users`')) {
  if (source.includes('function U(e,t){return h(`/api/admin/users`')) {
    source = source.replace(
      'function U(e,t){return h(`/api/admin/users`,e,{method:`PATCH`,body:JSON.stringify(t)})}',
      'function pu(e,t){return h(`/api/admin/users`,e,{method:`PATCH`,body:JSON.stringify(t)})}',
    )
    source = source.replaceAll('await U(e,{user_id:', 'await pu(e,{user_id:')
  } else if (source.includes('function A(e,t){return h(`/api/admin/users`')) {
    source = source.replace(
      'function A(e,t){return h(`/api/admin/users`,e,{method:`PATCH`,body:JSON.stringify(t)})}',
      'function pu(e,t){return h(`/api/admin/users`,e,{method:`PATCH`,body:JSON.stringify(t)})}',
    )
    source = source.replaceAll('await A(e,{user_id:', 'await pu(e,{user_id:')
  } else {
    source = source.replace(apiHelper, apiHelperWithUsers)
  }
}

const serviceHandler = 'async function i(t,r){await x(e,{id:t,status:r}),await n.refetch()}'
const serviceHandlerWithUser =
  'async function i(t,r){await x(e,{id:t,status:r}),await n.refetch()}async function au(p,l,s){if(!confirm(`Update ${p.email} to plan ${l} (${s})?`))return;try{await pu(e,{user_id:p.user_id,email:p.email,plan:l,subscription_status:s}),await n.refetch()}catch(err){alert(err instanceof Error?err.message:`Update failed`)}}'

if (!source.includes(serviceHandler)) {
  console.error('admin service handler anchor not found')
  process.exit(1)
}
if (!source.includes('async function au(p,l,s)')) {
  if (source.includes('async function a(p,l,s)')) {
    source = source.replace(serviceHandlerWithUser, serviceHandler)
  } else {
    source = source.replace(serviceHandler, serviceHandlerWithUser)
  }
}

const adminClose =
  '},e.id))})]})]})}function de({plans:e,onRequestAccess:t})'
const adminPanels = `},e.id))})]})]}),(0,w.jsxs)(\`div\`,{className:\`mt-6 glass-panel rounded-3xl p-5\`,children:[(0,w.jsx)(\`p\`,{className:\`eyebrow\`,children:\`Customer accounts\`}),(0,w.jsx)(\`p\`,{className:\`mt-2 text-sm text-muted\`,children:\`Upgrade plan or subscription status. Changes apply immediately for entitlements.\`}),(0,w.jsx)(\`div\`,{className:\`mt-4 space-y-3\`,children:(n.data?.profiles||[]).map(p=>(0,w.jsx)(\`div\`,{className:\`rounded-2xl border border-metallic bg-black/40 p-4\`,children:(0,w.jsxs)(\`div\`,{className:\`flex flex-wrap items-center justify-between gap-3\`,children:[(0,w.jsxs)(\`div\`,{children:[(0,w.jsx)(\`p\`,{className:\`text-sm text-ink\`,children:p.email}),(0,w.jsxs)(\`p\`,{className:\`data-font mt-1 text-xs text-soft\`,children:[p.user_id||\`no-id\`,\` / \`,p.role,\` / updated \`,p.updated_at||\`;\`]}),p.stripe_customer_id?(0,w.jsxs)(\`p\`,{className:\`data-font mt-1 text-xs text-soft\`,children:[\`stripe \`,p.stripe_customer_id]}):null]}),(0,w.jsxs)(\`div\`,{className:\`flex flex-wrap gap-2\`,children:[(0,w.jsxs)(\`select\`,{className:\`input text-xs\`,value:p.plan,onChange:e=>void au(p,e.target.value,p.subscription_status),children:I.map(pl=>(0,w.jsx)(\`option\`,{value:pl,children:pl},pl))}),(0,w.jsxs)(\`select\`,{className:\`input text-xs\`,value:p.subscription_status,onChange:e=>void au(p,p.plan,e.target.value),children:[\`none\`,\`trialing\`,\`active\`,\`past_due\`,\`canceled\`].map(st=>(0,w.jsx)(\`option\`,{value:st,children:st},st))})]})]})},p.user_id||p.email))})]}),(0,w.jsxs)(\`div\`,{className:\`mt-6 glass-panel rounded-3xl p-5\`,children:[(0,w.jsx)(\`p\`,{className:\`eyebrow\`,children:\`Emails & leads\`}),(0,w.jsx)(\`div\`,{className:\`mt-4 space-y-3 max-h-96 overflow-y-auto\`,children:(n.data?.sales_leads||[]).map(ld=>(0,w.jsx)(\`div\`,{className:\`rounded-2xl border border-metallic bg-black/40 p-4\`,children:(0,w.jsxs)(\`div\`,{children:[(0,w.jsx)(\`p\`,{className:\`text-sm text-ink\`,children:ld.email}),(0,w.jsxs)(\`p\`,{className:\`data-font mt-1 text-xs text-soft\`,children:[ld.name,\` / \`,ld.company,\` / \`,ld.use_case,\` / \`,ld.status||\`new\`]}),(0,w.jsx)(\`p\`,{className:\`mt-2 text-xs text-muted\`,children:ld.message}),(0,w.jsxs)(\`p\`,{className:\`data-font mt-1 text-xs text-soft\`,children:[\`created \`,ld.created_at||\`;\`]})]})},ld.id||ld.email))})]}),(0,w.jsxs)(\`div\`,{className:\`mt-6 glass-panel rounded-3xl p-5\`,children:[(0,w.jsx)(\`p\`,{className:\`eyebrow\`,children:\`Checkout sessions\`}),(0,w.jsx)(\`div\`,{className:\`mt-4 space-y-3 max-h-72 overflow-y-auto\`,children:(n.data?.checkouts||[]).map(co=>(0,w.jsx)(\`div\`,{className:\`rounded-2xl border border-metallic bg-black/40 p-4\`,children:(0,w.jsxs)(\`div\`,{children:[(0,w.jsxs)(\`p\`,{className:\`text-sm text-ink\`,children:[co.email||\`no email\`,\` · \`,co.plan||\`plan?\`]}),(0,w.jsxs)(\`p\`,{className:\`data-font mt-1 text-xs text-soft\`,children:[co.status||co.payment_status||\`status?\`,\` / \`,co.stripe_session_id||\`;\`]}),(0,w.jsxs)(\`p\`,{className:\`data-font mt-1 text-xs text-soft\`,children:[\`created \`,co.created_at||\`;\`]})]})},co.stripe_session_id||co.id))})]}),(0,w.jsxs)(\`div\`,{className:\`mt-6 glass-panel rounded-3xl p-5\`,children:[(0,w.jsx)(\`p\`,{className:\`eyebrow\`,children:\`Query audits\`}),(0,w.jsx)(\`div\`,{className:\`mt-4 space-y-2 max-h-64 overflow-y-auto\`,children:(n.data?.audits||[]).slice(0,25).map(qa=>(0,w.jsx)(\`div\`,{className:\`rounded-xl border border-metallic bg-black/40 px-3 py-2\`,children:(0,w.jsxs)(\`p\`,{className:\`data-font text-xs text-soft\`,children:[qa.email||\`anon\`,\` · \`,qa.route,\` · \`,qa.created_at||\`;\`]})},qa.id||qa.created_at))})]})]})}function de({plans:e,onRequestAccess:t})`

if (source.includes('Customer accounts')) {
  console.log('admin console already patched')
} else if (!source.includes(adminClose)) {
  console.error('admin panel close anchor not found')
  process.exit(1)
} else {
  source = source.replace(adminClose, adminPanels)
}

fs.writeFileSync(bundlePath, source)

const syntax = spawnSync(process.execPath, ['--check', bundlePath], { encoding: 'utf8' })
if (syntax.status !== 0) {
  console.error(syntax.stderr || syntax.stdout)
  process.exit(1)
}

console.log('patched admin console in production bundle')
