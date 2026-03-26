/**
 * POST /api/check-listings
 * Overí či sú inzeráty aktívne — server-side fetch (obíde CORS).
 * Body: { urls: string[] }
 * Response: { [url]: { active: boolean, status?: number, finalUrl?: string, error?: string } }
 *
 * Logika detekcie "zmazaný":
 *  - HTTP status 4xx/5xx → neaktívny
 *  - Presmerovaný na inú doménu → neaktívny
 *  - Originálny path mal 2+ segmenty, finálny 0–1 (homepage) → neaktívny
 *  - Inak → aktívny
 */
export const dynamic = 'force-dynamic'

function isActive(originalUrl, finalUrl, status) {
  if (!status || status >= 400) return false
  try {
    const orig  = new URL(originalUrl)
    const final = new URL(finalUrl)
    // Iná doména = presmerovanie preč
    if (orig.hostname !== final.hostname) return false
    const origSegs  = orig.pathname.split('/').filter(Boolean).length
    const finalSegs = final.pathname.split('/').filter(Boolean).length
    // Bolo presmerované na homepage (krátka cesta)
    if (origSegs >= 2 && finalSegs <= 1) return false
    return true
  } catch {
    return false
  }
}

async function checkUrl(url) {
  try {
    const res = await fetch(url, {
      signal:   AbortSignal.timeout(8000),
      redirect: 'follow',
      headers:  {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     'text/html,application/xhtml+xml,*/*;q=0.8',
      },
    })
    return {
      active:   isActive(url, res.url, res.status),
      status:   res.status,
      finalUrl: res.url,
    }
  } catch (e) {
    return { active: false, error: e.message }
  }
}

export async function POST(request) {
  try {
    const { urls } = await request.json()
    if (!Array.isArray(urls) || urls.length === 0) {
      return Response.json({})
    }

    // Kontroluj max 50 URL naraz (ochrana)
    const limited = urls.slice(0, 50)

    const results = await Promise.allSettled(limited.map(checkUrl))

    const out = {}
    limited.forEach((url, i) => {
      const r = results[i]
      out[url] = r.status === 'fulfilled' ? r.value : { active: false, error: r.reason?.message }
    })

    return Response.json(out)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
