import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookieStorage } from './crossDomainStorage'

// Shared SSO naprieč *.autorro.sk — session v cookie s domain=.autorro.sk cez
// custom storage adapter, aby ju čítali všetky subdomény (hub, checklist,
// support, dashboard). Rovnaký `storageKey` a adapter ako v ostatných appkách.

const isBrowser = typeof window !== 'undefined'

/**
 * Browser-side Supabase klient. Session sa ukladá do cookie `autorro-auth`
 * (prípadne chunked `.0 .1 .2`) s domain=.autorro.sk — zdieľaná naprieč
 * subdoménami Autorro ekosystému.
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'autorro-auth',
        ...(isBrowser && { storage: cookieStorage }),
      },
    }
  )
}
