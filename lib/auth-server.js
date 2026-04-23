import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server-side auth helper. Číta zdieľanú cookie `autorro-auth` (rovnakú akú
// zapisuje hub / support / checklist / browser dashboard client), extrahuje
// z nej `access_token` a validuje ho voči Supabase. Vracia usera alebo null.

const COOKIE_KEY = 'autorro-auth'

/**
 * Zlož session JSON zo zdieľanej cookie. Skúša najprv single-cookie variant
 * (`autorro-auth`), potom chunked variant (`autorro-auth.0`, `.1`, …).
 * Vracia string alebo null.
 */
async function readSessionCookie() {
  const store = await cookies()

  const single = store.get(COOKIE_KEY)?.value
  if (single) return single

  // Chunked: pozbieraj .0 .1 .2 … pokým existujú
  const all = store.getAll()
  const prefix = COOKIE_KEY + '.'
  const chunks = all
    .filter(c => c.name.startsWith(prefix) && /^\d+$/.test(c.name.slice(prefix.length)))
    .sort((a, b) => {
      const ai = parseInt(a.name.slice(prefix.length), 10)
      const bi = parseInt(b.name.slice(prefix.length), 10)
      return ai - bi
    })
  if (chunks.length === 0) return null
  return chunks.map(c => c.value).join('')
}

/**
 * Vráti access_token zo session cookie alebo null.
 */
async function getAccessToken() {
  const raw = await readSessionCookie()
  if (!raw) return null
  try {
    const session = JSON.parse(raw)
    return session?.access_token || session?.currentSession?.access_token || null
  } catch {
    return null
  }
}

/**
 * Získa aktuálne prihláseného usera v API route / Server Component.
 * Validuje access_token voči Supabase. Vráti user objekt alebo null.
 */
export async function getServerUser() {
  const token = await getAccessToken()
  if (!token) return null

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

/**
 * Overí, či je user admin — buď má `app_metadata.role === 'admin'` (master
 * zdroj pravdy pre celý Autorro ekosystém), alebo je email v ADMIN_EMAILS
 * env var (fallback pre prechodné obdobie).
 */
export function isAdminUser(user) {
  if (!user?.email) return false
  if (user.app_metadata?.role === 'admin') return true
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return adminEmails.includes(user.email.toLowerCase())
}
