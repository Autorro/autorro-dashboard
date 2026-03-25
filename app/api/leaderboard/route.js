import { cache as dataCache } from '@/lib/cache'

export const revalidate = 300

const NON_BROKERS = new Set([
  'development', 'api admin', 'asistent', 'kacena', 'digitaldreamers',
  'tomas martis', 'miroslav hrehor', 'peter hudec', 'jaroslav kovac',
  'ing. matej kostal', 'david viliam szilárdy', 'tomas',
])

function normName(s) {
  return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

async function fetchProviziaFieldKey(apiToken) {
  try {
    const res  = await fetch(
      `https://api.pipedrive.com/v1/dealFields?api_token=${apiToken}&limit=500`,
      { cache: 'no-store' }
    )
    const json = await res.json()
    const fields = json.data || []
    const norm = s => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
    const find = pred => fields.find(f => pred(norm(f.name)))
    return (
      find(n => n.includes('vyska') && n.includes('provizi'))?.key ||
      find(n => n.includes('uver')  && n.includes('provizi'))?.key ||
      fields.find(f => norm(f.name).includes('provizi') && f.field_type === 'double')?.key ||
      null
    )
  } catch {
    return null
  }
}

async function fetchAllActiveUsers(apiToken) {
  const res  = await fetch(
    `https://api.pipedrive.com/v1/users?api_token=${apiToken}`,
    { cache: 'no-store' }
  )
  const json = await res.json()
  return (json.data || []).filter(u =>
    u.active_flag && !NON_BROKERS.has(normName(u.name))
  )
}

async function fetchUserWonDeals(apiToken, userId) {
  const res = await fetch(
    `https://api.pipedrive.com/v1/deals/collection?api_token=${apiToken}&status=won&user_id=${userId}&limit=500`,
    { cache: 'no-store' }
  )
  const json = await res.json()
  return json.data || []
}

async function fetchLeaderboardData() {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN
  const [proviziaKey, users] = await Promise.all([
    fetchProviziaFieldKey(apiToken),
    fetchAllActiveUsers(apiToken),
  ])

  const BATCH = 10
  const allDeals = []
  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH)
    const results = await Promise.allSettled(
      batch.map(u => fetchUserWonDeals(apiToken, u.id).then(deals =>
        deals.map(d => ({ ...d, _ownerName: u.name }))
      ))
    )
    for (const r of results) {
      if (r.status === 'fulfilled') allDeals.push(...r.value)
    }
  }

  return allDeals.map(d => ({
    id:           d.id,
    title:        d.title || '',
    owner:        d._ownerName,
    wonTime:      d.won_time || d.close_time || null,
    cenaVozidla:  Number(d.value) || 0,
    currency:     d.currency || 'EUR',
    proviziaUver: proviziaKey && d[proviziaKey] ? Number(d[proviziaKey]) : 0,
  }))
}

const getCachedLeaderboard = dataCache(fetchLeaderboardData, 'leaderboard', 300)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === '1'

    if (force) {
      const { revalidateTag } = await import('next/cache')
      revalidateTag('leaderboard')
    }

    const data = await getCachedLeaderboard()
    return Response.json(data, {
      headers: { 'X-Cache': force ? 'REVALIDATED' : 'HIT', 'X-Fetched-At': new Date().toISOString() },
    })
  } catch (err) {
    return Response.json({ error: 'Interná chyba', detail: err?.message }, { status: 500 })
  }
}
