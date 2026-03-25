/**
 * Pre-warm cron endpoint — spustí sa každých 5 minút (vercel.json).
 * Volá všetky pomalé API routes aby Vercel Data Cache bol vždy teplý.
 * Výsledok: každý používateľ dostane okamžitú odpoveď z cache.
 */

export const dynamic = 'force-dynamic'

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://autorro-dashboard.vercel.app'

const ROUTES = [
  '/api/leaderboard',
  '/api/zdravie-ponuky',
  '/api/znacky',
  '/api/cas-predaja',
  '/api/wasitlead-conversion',
  '/api/reakčný-čas',
]

export async function GET(request) {
  // Ochrana cron endpointu
  const auth = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  // Pre optimcall pridáme aj dnešný deň
  const allRoutes = [...ROUTES, `/api/optimcall?dateFrom=${today}&dateTo=${today}`]

  const results = await Promise.allSettled(
    allRoutes.map(route =>
      fetch(`${BASE}${route}`, { cache: 'no-store' })
        .then(r => ({ route, status: r.status, ok: r.ok }))
        .catch(e => ({ route, error: e.message }))
    )
  )

  const summary = results.map(r => r.status === 'fulfilled' ? r.value : r.reason)
  const allOk   = summary.every(s => s.ok)

  console.log('[cron/warm] Pre-warm dokončený:', summary)

  return Response.json({
    ok:       allOk,
    warmedAt: new Date().toISOString(),
    routes:   summary,
  })
}
