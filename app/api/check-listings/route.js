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
export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Vercel: max 30s pre hobby

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
    const { urls } = await request.json()
    if (!Array.isArray(urls) || urls.length === 0) return Response.json({})

    const limited = urls.slice(0, 60)
    const results = await Promise.allSettled(limited.map(checkUrl))

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
