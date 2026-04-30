/** yes_price is 0–1; returns cents string like "62¢" */
export function formatYesCents(yes: number | null | undefined): string {
  if (yes == null || Number.isNaN(yes)) return '—'
  const cents = Math.round(Number(yes) * 100)
  return `${cents}¢`
}

export function formatNoFromYes(yes: number | null | undefined): string {
  if (yes == null || Number.isNaN(yes)) return '—'
  const no = Math.round((1 - Number(yes)) * 100)
  return `${no}¢`
}
