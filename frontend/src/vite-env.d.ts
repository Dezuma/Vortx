/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_STRIPE_NEBULA_PAYMENT_LINK_URL?: string
  readonly VITE_STRIPE_SUPERNOVA_PAYMENT_LINK_URL?: string
  readonly VITE_STRIPE_GALACTIC_PAYMENT_LINK_URL?: string
  readonly VITE_STRIPE_CUSTOM_PAYMENT_LINK_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
