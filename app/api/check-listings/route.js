/**
 * POST /api/check-listings
 * Overí či sú inzeráty aktívne — server-side fetch (obíde CORS).
 * Body: { urls: string[] }
 * Response: { [url]: { active: boolean, status?: number, error?: string } }
 *
 * Stratégia:
 *  1. HEAD request s 5s timeoutom (rýchle)
 *  2. Ak HEAD zlyhá / vráti 405 → GET request s rovnakým timeoutom
 *  3. Detekcia: presmerovaný na homepage = neaktívny, 4xx = neaktívny
 */
import { getServerUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Vercel: max 30s pre hobby

// ── SSRF protection ──────────────────────────────────────────────────────
// Bez whitelist-u môže útočník cez túto route volať hocijakú URL z Vercel
// serveru — vrátane interných IP (169.254.169.254 = AWS metadata endpoint,
// 10.x/172.16-31/192.168 = interné siete). Pridáme whitelist autobazárových
// domén a blokujeme súkromné / loopback adresy.
const ALLOWED_HOSTS = [
  'autobazar.eu', 'www.autobazar.eu',
  'autobazar.sk', 'www.autobazar.sk',
  'mobile.de', 'www.mobile.de', 'suchen.mobile.de',
  'autoscout24.sk', 'www.autoscout24.sk',
  'autoscout24.com', 'www.autoscout24.com',
  'autoscout24.de', 'www.autoscout24.de',
  'bazos.sk', 'auto.bazos.sk',
  'hyperauto.sk', 'www.hyperauto.sk',
  'autorro.sk', 'www.autorro.sk',
]

function isAllowedUrl(url) {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    const host = u.hostname.toLowerCase()
    // Private IPs / loopback (prvá línia obrany — DNS rebinding môže tento check obísť,
    // ale to už je mimo scope; kľúčové je mať whitelist hostnames).
    if (
      host === 'localhost' || host === '127.0.0.1' || host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host.startsWith('169.254.') ||
      host.endsWith('.internal') || host.endsWith('.local')
    ) return false
    return ALLOWED_HOSTS.includes(host)
  } catch {
    return false
  }
}

function isActive(originalUrl, finalUrl, status) {
  if (!status || status === 0) return false
  if (status >= 400) return false
  try {
    const orig  = new URL(originalUrl)
    const final = new URL(finalUrl)
    if (orig.hostname !== final.hostname) return false          // iná doména
    const origSegs  = orig.pathname.split('/').filter(Boolean).length
    const finalSegs = final.pathname.split('/').filter(Boolean).length
    if (origSegs >= 2 && finalSegs <= 1) return false           // homepage redirect
    return true
  } catch {
    return false
  }
}

function makeController(ms) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  return { signal: ctrl.signal, clear: () => clearTimeout(t) }
}

async function checkUrl(url) {
  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Accept':     'text/html,*/*;q=0.8',
  }

  // 1. Pokus cez HEAD
  try {
    const { signal, clear } = makeController(5000)
    const res = await fetch(url, { method: 'HEAD', signal, redirect: 'follow', headers: HEADERS })
    clear()
    if (res.status !== 405) {
      return { active: isActive(url, res.url, res.status), status: res.status }
    }
  } catch (_) { /* HEAD zlyhala alebo timeout → skúsime GET */ }

  // 2. Fallback: GET (niektoré servery nepodporujú HEAD)
  try {
    const { signal, clear } = makeController(5000)
    const res = await fetch(url, { method: 'GET', signal, redirect: 'follow', headers: HEADERS })
    clear()
    return { active: isActive(url, res.url, res.status), status: res.status }
  } catch (e) {
    return { active: false, error: e.name === 'AbortError' ? 'timeout' : e.message }
  }
}

export async function POST(request) {
  try {
    const user = await getServerUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { urls } = await request.json()
    if (!Array.isArray(urls) || urls.length === 0) return Response.json({})

    const limited = urls.slice(0, 60)
    // Rozdeľ: povolené spracujeme, zakázané okamžite označ ako blocked.
    const results = await Promise.allSettled(
      limited.map(url => isAllowedUrl(url)
        ? checkUrl(url)
        : Promise.resolve({ active: false, error: 'host_not_allowed' })
      )
    )

    const out = {}
    limited.forEach((url, i) => {
      const r = results[i]
      out[url] = r.status === 'fulfilled' ? r.value : { active: false, error: String(r.reason) }
    })

    return Response.json(out)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
