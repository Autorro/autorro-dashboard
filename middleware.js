import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Stránky dostupné bez prihlásenia. Login / forgot / reset sú ponechané pre
// prípad priameho navigovania — stránky samé redirectujú na hub login (SSO).
const PUBLIC_PAGES = ['/login', '/forgot-password', '/reset-password', '/auth/callback']

// API routes s vlastným auth mechanizmom (webhook secret, CRON_SECRET)
const SKIP_API_AUTH = ['/api/webhook', '/api/snapshot', '/api/cron']

// Hub login URL — centrálne prihlásenie pre celý Autorro ekosystém.
const HUB_LOGIN_URL = 'https://app.autorro.sk/login'

const COOKIE_KEY = 'autorro-auth'

/**
 * Zlož session JSON zo zdieľanej cookie (single alebo chunked .0 .1 …).
 * Identická logika ako v lib/crossDomainStorage.js a lib/auth-server.js.
 */
function readSessionCookie(request) {
  const single = request.cookies.get(COOKIE_KEY)?.value
  if (single) return single

  const all = request.cookies.getAll()
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

function getAccessToken(request) {
  const raw = readSessionCookie(request)
  if (!raw) return null
  try {
    const session = JSON.parse(raw)
    return session?.access_token || session?.currentSession?.access_token || null
  } catch {
    return null
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Verejné stránky
  if (PUBLIC_PAGES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    return NextResponse.next()
  }

  // API routes s vlastným auth
  if (SKIP_API_AUTH.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Overenie session cez shared cookie
  const token = getAccessToken(request)
  let user = null
  if (token) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { data } = await supabase.auth.getUser(token)
    user = data?.user || null
  }

  if (!user) {
    // API routes → 401 JSON
    if (pathname.startsWith('/api/')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Stránky → redirect na centrálny hub login s návratovou URL
    const returnUrl = `${request.nextUrl.origin}${pathname}${request.nextUrl.search}`
    const loginUrl = new URL(HUB_LOGIN_URL)
    loginUrl.searchParams.set('next', returnUrl)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Všetko okrem Next.js internals a statických súborov
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
