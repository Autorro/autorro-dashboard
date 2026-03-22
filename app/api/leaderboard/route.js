import { fetchAllPages, createCache } from '@/lib/pipedrive'

const CACHE_TTL = 5 * 60 * 1000
const cache     = createCache(CACHE_TTL)

/** Normalizácia labelu – stripping diakritiky */
function normLabel(s) {
  return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

/**
 * Dynamicky nájde key Pipedrive fieldu "výška provízie" (provízia z financovania).
 * Hľadá podľa kombinácie slov v labeli, prioritne najkonkrétnejší match.
 */
async function fetchProviziaFieldKey(apiToken) {
  try {
    const res  = await fetch(
      `https://api.pipedrive.com/v1/dealFields?api_token=${apiToken}&limit=500`,
      { cache: 'no-store' }
    )
    const json = await res.json()
    const fields = json.data || []

    // Priorita: "výška" + "provízi*" → "úver" + "provízi*" → iba "provízi*"
    const find = pred => fields.find(f => pred(normLabel(f.name)))
    return (
      find(n => n.includes('vyska') && n.includes('provizi'))?.key ||
      find(n => n.includes('uver')  && n.includes('provizi'))?.key ||
      fields.find(f => normLabel(f.name).includes('provizi') && f.field_type === 'double')?.key ||
      null
    )
  } catch {
    return null
  }
}

async function fetchWonDeals(apiToken, proviziaKey) {
  const fields = ['id', 'title', 'owner_id', 'owner_name', 'won_time', 'close_time', 'value', 'currency']
  if (proviziaKey) fields.push(proviziaKey)

  return fetchAllPages(
    `https://api.pipedrive.com/v1/deals?api_token=${apiToken}&status=won&limit=500&fields=${fields.join(',')}`
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

    const apiToken    = process.env.PIPEDRIVE_API_TOKEN
    const proviziaKey = await fetchProviziaFieldKey(apiToken)
    const deals       = await fetchWonDeals(apiToken, proviziaKey)

    const mapped = deals.map(d => ({
      id:           d.id,
      title:        d.title || '',
      owner:        d.owner_id?.name || d.owner_name || '',
      wonTime:      d.won_time || d.close_time || null,
      cenaVozidla:  Number(d.value) || 0,
      currency:     d.currency || 'EUR',
      proviziaUver: proviziaKey && d[proviziaKey] ? Number(d[proviziaKey]) : 0,
    }))

    cache.set(mapped)
    return Response.json(mapped, {
      headers: { 'X-Cache': 'MISS', 'X-Fetched-At': new Date().toISOString() },
    })
  } catch {
    return Response.json({ error: 'Interná chyba' }, { status: 500 })
  }
}
