import { fetchAllPages, createCache } from '@/lib/pipedrive'

const WASITLEAD_KEY = '75d70860fca1d25d8ed8ac4c533979b62d93e1f6'
const WASITLEAD_YES = '805'
const INZEROVANE    = new Set([13, 31, 34, 22])
const CACHE_TTL     = 10 * 60 * 1000
const cache         = createCache(CACHE_TTL)

async function fetchByStatus(apiToken, status) {
  const all = await fetchAllPages(
    `https://api.pipedrive.com/v1/deals?api_token=${apiToken}&limit=500&status=${status}&fields=id,title,stage_id,status,owner_id,add_time,${WASITLEAD_KEY}`
  )
  return all
    .filter(d => String(d[WASITLEAD_KEY]) === WASITLEAD_YES)
    .map(d => ({
      id:         d.id,
      owner_name: d.owner_id?.name || d.owner_name || 'Neznámy',
      status:     d.status,
      stage_id:   d.stage_id,
      add_time:   d.add_time,
    }))
}

async function fetchData(apiToken) {
  const [openDeals, wonDeals, lostDeals] = await Promise.all([
    fetchByStatus(apiToken, 'open'),
    fetchByStatus(apiToken, 'won'),
    fetchByStatus(apiToken, 'lost'),
  ])
  return { deals: [...openDeals, ...wonDeals, ...lostDeals] }
}

export async function GET() {
  try {
    const cached = cache.get()
    if (cached !== null) {
      return Response.json(cached, { headers: { 'X-Cache': 'HIT' } })
    }

    const apiToken = process.env.PIPEDRIVE_API_TOKEN
    const data     = await fetchData(apiToken)
    cache.set(data)
    return Response.json(data, { headers: { 'X-Cache': 'MISS' } })
  } catch {
    return Response.json({ error: 'Interná chyba' }, { status: 500 })
  }
}
