import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Stránky dostupné bez prihlásenia
// zmena-hesla je chránená stránka — vyžaduje prihlásenie
const PUBLIC_PAGES = ['/login', '/forgot-password', '/reset-password', '/auth/callback']

// API routes s vlastným auth mechanizmom (nechaj ich prejsť)
const SKIP_API_AUTH = ['/api/webhook', '/api/snapshot']

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

  // Vytvor Supabase server klienta — musí sa robiť takto aby sa refreshli cookies
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() overí JWT s Supabase serverom — nezávisí len na cookie
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // API routes → 401 JSON
    if (pathname.startsWith('/api/')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Stránky → redirect na login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Všetko okrem Next.js internals a statických súborov
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
