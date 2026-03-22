import { fetchAllPages, createCache } from '@/lib/pipedrive'

const CACHE_TTL = 5 * 60 * 1000
const cache     = createCache(CACHE_TTL)

async function fetchWonDeals(apiToken) {
  return fetchAllPages(
    `https://api.pipedrive.com/v1/deals?api_token=${apiToken}&status=won&limit=500`
  )
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === '1'

    const cached = cache.get(force)
    if (cached !== null) {
      return Response.json(cached, {
        headers: { 'X-Cache': 'HIT', 'X-Cache-Age': String(cache.age()) },
      })
    }

    const apiToken = process.env.PIPEDRIVE_API_TOKEN
    const deals    = await fetchWonDeals(apiToken)

    const mapped = deals.map(d => ({
      id:          d.id,
      title:       d.title || '',
      owner:       d.owner_id?.name || d.owner_name || '',
      wonTime:     d.won_time || d.close_time || null,
      cenaVozidla: Number(d.value) || 0,
      currency:    d.currency || 'EUR',
    }))

    cache.set(mapped)
    return Response.json(mapped, {
      headers: { 'X-Cache': 'MISS', 'X-Fetched-At': new Date().toISOString() },
    })
  } catch {
    return Response.json({ error: 'Interná chyba' }, { status: 500 })
  }
}
