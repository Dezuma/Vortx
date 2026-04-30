export type Market = {
  id: string
  slug: string | null
  title: string
  description: string | null
  yes_price: number | null
  outcome: string | null
  updated_at?: string | null
}
