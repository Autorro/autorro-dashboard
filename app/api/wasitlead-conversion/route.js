import { fetchAllPages } from '@/lib/pipedrive'
import { cache as dataCache } from '@/lib/cache'
import { WASITLEAD_KEY, WASITLEAD_YES } from '@/lib/constants'
import { getServerUser } from '@/lib/auth-server'

export const revalidate = 600

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

async function fetchWasitleadData() {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN
  const [openDeals, wonDeals, lostDeals] = await Promise.all([
    fetchByStatus(apiToken, 'open'),
    fetchByStatus(apiToken, 'won'),
    fetchByStatus(apiToken, 'lost'),
  ])
  return { deals: [...openDeals, ...wonDeals, ...lostDeals] }
}

const getCachedWasitlead = dataCache(fetchWasitleadData, 'wasitlead-conversion', 600)

export async function GET(request) {
  try {
    const user = await getServerUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === '1'

    if (force) {
      const { revalidateTag } = await import('next/cache')
      revalidateTag('wasitlead-conversion')
    }

    const data = await getCachedWasitlead()
    return Response.json(data, { headers: { 'X-Cache': force ? 'REVALIDATED' : 'HIT' } })
  } catch {
    return Response.json({ error: 'Interná chyba' }, { status: 500 })
  }
}
