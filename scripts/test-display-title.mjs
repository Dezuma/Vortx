#!/usr/bin/env node
import {
  buildShortTitle,
  partyFromCaption,
  truncateAtWordBoundary,
} from '../frontend/functions/lib/display-title.js'

let failed = 0
function check(label, fn) {
  try {
    fn()
    console.log(`ok ${label}`)
  } catch (error) {
    failed += 1
    console.error(`fail ${label}:`, error instanceof Error ? error.message : error)
  }
}

check('extracts business party from legal caption', () => {
  const party = partyFromCaption(
    'Peter J. Mastan, Chapter 7 Trustee v. Auto West, Inc. d/b/a Land Rover Woodland Hills',
  )
  if (!party.includes('Auto West')) throw new Error(`unexpected party: ${party}`)
})

check('builds short title for bankruptcy caption', () => {
  const title = buildShortTitle({
    entityName: 'Peter J. Mastan, Chapter 7 Trustee v. Auto West, Inc. d/b/a Land Rover Woodland Hills',
    eventType: 'bankruptcy_docket',
    rawCaption:
      'Peter J. Mastan, Chapter 7 Trustee v. Auto West, Inc. d/b/a Land Rover Woodland Hills',
  })
  if (!title.includes('Auto West')) throw new Error(title)
  if (title.endsWith(' f')) throw new Error(`mid-word cutoff: ${title}`)
})

check('truncates at word boundary with ellipsis', () => {
  const out = truncateAtWordBoundary('Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota', 20)
  if (!out.endsWith('…')) throw new Error(out)
  if (out.includes('Eta')) throw new Error(`cut mid-phrase: ${out}`)
})

if (failed) process.exit(1)
console.log('\ndisplay-title tests passed.')
