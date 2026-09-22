type EnvSeverity = 'ok' | 'warn' | 'error'

export type EnvDiagnostic = {
  key: string
  severity: EnvSeverity
  message: string
}

function value(name: string): string {
  return String(import.meta.env[name] ?? '').trim()
}

function isLikelyUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || (import.meta.env.DEV && url.protocol === 'http:')
  } catch {
    return false
  }
}

export const publicEnv = {
  supabaseUrl: value('VITE_SUPABASE_URL'),
  supabasePublishableKey: value('VITE_SUPABASE_PUBLISHABLE_KEY') || value('VITE_SUPABASE_ANON_KEY'),
  publicSiteUrl: value('PUBLIC_SITE_URL') || 'https://vortxmkt.com',
}

export function getEnvDiagnostics(): EnvDiagnostic[] {
  const diagnostics: EnvDiagnostic[] = []

  if (!publicEnv.supabaseUrl) {
    diagnostics.push({
      key: 'VITE_SUPABASE_URL',
      severity: 'error',
      message: 'Missing Supabase URL. Browser-side Supabase features will run in disabled mode.',
    })
  } else if (!isLikelyUrl(publicEnv.supabaseUrl)) {
    diagnostics.push({
      key: 'VITE_SUPABASE_URL',
      severity: 'error',
      message: 'Supabase URL must be a valid https URL (http allowed only in local dev).',
    })
  }

  if (!publicEnv.supabasePublishableKey) {
    diagnostics.push({
      key: 'VITE_SUPABASE_PUBLISHABLE_KEY',
      severity: 'error',
      message: 'Missing browser-safe Supabase publishable key.',
    })
  }

  if (!publicEnv.publicSiteUrl) {
    diagnostics.push({
      key: 'PUBLIC_SITE_URL',
      severity: 'warn',
      message: 'Missing public site URL; generated URLs fall back to https://vortxmkt.com.',
    })
  } else if (!isLikelyUrl(publicEnv.publicSiteUrl)) {
    diagnostics.push({
      key: 'PUBLIC_SITE_URL',
      severity: 'warn',
      message: 'Public site URL should be a valid https URL.',
    })
  }

  return diagnostics
}

export const envDiagnostics = getEnvDiagnostics()
export const hasEnvErrors = envDiagnostics.some((item) => item.severity === 'error')
