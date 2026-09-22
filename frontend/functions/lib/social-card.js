import { SHARE_COPY } from './product-positioning.js'

/** Cache-busted Open Graph card. iMessage and Slack pin the URL, so bump this when the PNG changes. */
export const SOCIAL_CARD_VERSION = '17'

export function socialCardUrl(site = 'https://vortxmkt.com') {
  return `${String(site || 'https://vortxmkt.com').replace(/\/$/, '')}/social-card.png?v=${SOCIAL_CARD_VERSION}`
}

/**
 * Shared OG/Twitter image tags for SSR pages.
 * @param {string} [site]
 */
export function socialImageMetaTags(site = 'https://vortxmkt.com') {
  const image = socialCardUrl(site)
  return `<meta property="og:site_name" content="Vortx" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:alt" content="${SHARE_COPY.imageAlt}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${image}" />`
}
