/**
 * Score-led social card — locked spec (1200×675).
 * Values match vortx_hero_card_spec.pdf and scripts/hero-card/build_hero_card.py.
 */

export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 675

const MARGIN = 50
const SCORE_CY = 225
const CONTENT_MAX_W = 1100

const COLORS = {
  bgTop: [8, 9, 11],
  headline: [240, 242, 244],
  logo: [235, 238, 240],
  muted: [150, 158, 164],
  meta: [140, 150, 156],
  divider: [50, 56, 62],
  footer: [110, 118, 124],
  reliefNote: [84, 214, 150],
}

const FONT_PX = {
  logo: 24,
  kicker: 20,
  label: 22,
  score: 190,
  denom: 28,
  headline: 34,
  meta: 18,
  note: 20,
  cta: 25,
  footer: 15,
}

/** Bitmap glyph is 7px tall at scale 1 — map spec px to draw scale. */
export function fontScale(px) {
  return Math.max(2, px / 7)
}

export function severityPalette(score) {
  if (score >= 80) return { scoreColor: [255, 61, 61], label: 'HIGH FRICTION' }
  if (score >= 50) return { scoreColor: [255, 159, 28], label: 'MODERATE FRICTION' }
  return { scoreColor: [84, 214, 150], label: 'LOW FRICTION' }
}

export function heroScoreLabel(score, panelSub = '') {
  if (panelSub === 'WORKFORCE ALERT') return 'WORKFORCE ALERT'
  if (panelSub === 'RECORDS SURFACED') return 'RECORDS SURFACED'
  return severityPalette(score).label
}

export function formatCardCta(value) {
  return String(value || 'See the full filing')
    .replace(/→/g, '->')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

export function reliefNoteLine() {
  return 'Subscribers had this filing, the source, and the timeline the day it was recorded.'
}

export function urgencyNoteLine() {
  return 'Filed today. The longer this sits unread, the less time you have to react.'
}

export function exposureWindowNoteLine() {
  return 'Your exposure window just opened.'
}

export function teaserLockedMetaLine() {
  return 'Source document: LOCKED · Entity timeline: LOCKED'
}

function paletteScoreFromPanel(panel, lead) {
  const display = String(panel.main || '')
  const numeric = Number(lead?.score ?? lead?.severity ?? 0)
  if (/^\d+$/.test(display) && Number(display) <= 100) return Number(display)
  // Worker-count panels: color from friction score, never from the headcount.
  if (numeric > 0) return Math.min(100, Math.round(numeric))
  return 50
}

function wrapLinesLimited(draw, text, maxWidth, scale, maxLines) {
  const lines = draw.wrapLines(text, maxWidth, scale)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last.length > 8 && draw.textWidth(`${last}…`, scale) > maxWidth) {
    last = last.slice(0, -1)
  }
  kept[maxLines - 1] = `${last.replace(/[.\s-]+$/, '')}…`
  return kept
}

export function renderHeroCard(canvas, draw, campaign, lead, panel) {
  const W = canvas.width
  const H = canvas.height
  const centerX = Math.floor(W / 2)
  const paletteScore = paletteScoreFromPanel(panel, lead)
  const palette = severityPalette(paletteScore)
  const scoreColor = Array.isArray(panel?.accent) ? panel.accent : palette.scoreColor
  const mode = campaign.cardFraming === 'urgency' ? 'urgency' : 'relief'
  const isTeaser = campaign.cardMode === 'teaser'
  const theme = String(campaign.cardTheme || 'default')

  draw.makeHeroBg(canvas, scoreColor)

  draw.text(canvas, 'VORTX', MARGIN, 34, fontScale(FONT_PX.logo), COLORS.logo)

  const kickerByTheme = {
    alpha: 'ALPHA FEED · PUBLIC RECORD',
    workforce: 'WARN NOTICE · MASS LAYOFFS',
    bankruptcy: 'BANKRUPTCY DOCKET · WATCH',
  }
  const kicker = isTeaser
    ? 'UNFILTERED SIGNAL TEASER'
    : kickerByTheme[theme] || 'PUBLIC RECORD ALERT'
  const kickerScale = fontScale(FONT_PX.kicker)
  const kickerW = draw.textWidth(kicker, kickerScale)
  draw.text(canvas, kicker, W - MARGIN - kickerW, 40, kickerScale, COLORS.muted)

  const scoreStr = String(panel.main || paletteScore)
  const scoreScale = fontScale(FONT_PX.score)
  const scoreW = draw.textWidth(scoreStr, scoreScale)
  const scoreH = 7 * scoreScale
  const sx = Math.floor(centerX - scoreW / 2)
  const sy = Math.floor(SCORE_CY - scoreH / 2)

  const label = String(panel?.sub || heroScoreLabel(paletteScore, panel.sub))
  const labelScale = fontScale(FONT_PX.label)
  const labelW = draw.textWidth(label, labelScale)
  draw.text(canvas, label, centerX - Math.floor(labelW / 2), sy - 50, labelScale, scoreColor)

  if (campaign.compactRender) {
    draw.text(canvas, scoreStr, sx, sy, scoreScale, scoreColor)
  } else {
    draw.textGlow(canvas, scoreStr, sx, sy, scoreScale, scoreColor, 20)
    draw.text(canvas, scoreStr, sx, sy, scoreScale, scoreColor)
  }

  const showDenom = panel?.denom !== false && /^\d+$/.test(scoreStr) && Number(scoreStr) <= 100
  if (showDenom) {
    const denScale = fontScale(FONT_PX.denom)
    draw.text(canvas, '/100', sx + scoreW + 12, sy + scoreH - 24, denScale, COLORS.muted)
  }

  let y = SCORE_CY + Math.floor(scoreH / 2) + 22
  draw.hLine(canvas, MARGIN, W - MARGIN, y, COLORS.divider)
  y += 28

  const headline = String(campaign.cardStakeLine || campaign.cardTitle || 'Public record alert')
  const headlineScale = fontScale(FONT_PX.headline)
  for (const line of wrapLinesLimited(draw, headline, CONTENT_MAX_W, headlineScale, 2)) {
    const lw = draw.textWidth(line, headlineScale)
    draw.text(canvas, line, centerX - Math.floor(lw / 2), y, headlineScale, COLORS.headline)
    y += 42
  }
  y += 8

  const meta = String(campaign.cardSupportLine || campaign.cardSubtitle || '')
  if (meta) {
    const metaScale = fontScale(FONT_PX.meta)
    for (const line of wrapLinesLimited(draw, meta, CONTENT_MAX_W, metaScale, 2)) {
      const metaW = draw.textWidth(line, metaScale)
      draw.text(canvas, line, centerX - Math.floor(metaW / 2), y, metaScale, COLORS.meta)
      y += 26
    }
    y += 6
  }

  const note = isTeaser
    ? exposureWindowNoteLine()
    : mode === 'urgency'
      ? urgencyNoteLine()
      : reliefNoteLine()
  const noteScale = fontScale(FONT_PX.note)
  const noteColor = mode === 'urgency' ? scoreColor : COLORS.reliefNote
  for (const line of draw.wrapLines(note, CONTENT_MAX_W, noteScale)) {
    const nw = draw.textWidth(line, noteScale)
    draw.text(canvas, line, centerX - Math.floor(nw / 2), y, noteScale, noteColor)
    y += 27
  }

  y += 18
  draw.hLine(canvas, MARGIN, W - MARGIN, y, COLORS.divider)
  y += 22

  const cta = formatCardCta(campaign.cardCta)
  const ctaScale = fontScale(FONT_PX.cta)
  const ctaW = draw.textWidth(cta, ctaScale)
  draw.text(canvas, cta, centerX - Math.floor(ctaW / 2), y, ctaScale, scoreColor)
  y += 46

  const footer = 'VORTXMKT.COM  ·  RESEARCH ONLY, NOT LEGAL ADVICE'
  const footerScale = fontScale(FONT_PX.footer)
  const footerW = draw.textWidth(footer, footerScale)
  draw.text(canvas, footer, centerX - Math.floor(footerW / 2), Math.max(y, H - 40), footerScale, COLORS.footer)
}
