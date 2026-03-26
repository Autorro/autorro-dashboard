import { fetchAllPages } from '@/lib/pipedrive'
import { cache as dataCache } from '@/lib/cache'
import { INZEROVANE_STAGES } from '@/lib/constants'

export const revalidate = 600

const BASE_FIELDS = [
  'id', 'title', 'owner_id', 'owner_name', 'stage_id', 'value', 'currency',
  'status', 'add_time',
  '880011fdbacbc3eee50103ec49001ac8abd56ae1', // Cena je OK
  'b4d54b0e06789b713abe1062178c19490259e00a', // Odporúčaná cena – AUTORRO
  '7bc01b48cc10642c58f19ce14bb33fe8abb7bb97', // Cena vozidla
  '8ad28e02d445f11af2064ed71aab1aa1906db534', // Autobazar.eu/Sauto.sk (new)
  '65230483051b78019de87ebe7ca1b8380b3e85b2', // Autorro.sk/cz (new)
  '3f9740a67e24bf1c3f3e65360abc0673bb07a4a8', // Inzerované od (date)
  // BAZOS_URL_KEY = null (pre budúcnosť, zatiaľ nemáme pole)
]

function norm(s) {
  return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

async function fetchFieldMeta(apiToken) {
  const res    = await fetch(
    `https://api.pipedrive.com/v1/dealFields?api_token=${apiToken}&limit=500`,
    { cache: 'no-store' }
  )
  const json   = await res.json()
  const fields = json.data || []
  const meta   = { kmKey: null, rokKey: null, palivoKey: null, palivoOptions: {} }
  for (const f of fields) {
    const label = norm(f.name || '')
    if (['kilometre', 'km', 'najazdene km'].includes(label))                 meta.kmKey     = f.key
    else if (['1. evidencia', '1 evidencia', 'rok vyroby'].includes(label))  meta.rokKey    = f.key
    else if (['palivo', 'typ paliva'].includes(label)) {
      meta.palivoKey = f.key
      for (const opt of (f.options || [])) meta.palivoOptions[String(opt.id)] = opt.label
    }
  }
  return meta
}

async function fetchZdravieData() {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN
  const meta     = await fetchFieldMeta(apiToken)

  const extraKeys = [meta.kmKey, meta.rokKey, meta.palivoKey].filter(Boolean)
  const fields    = [...BASE_FIELDS, ...extraKeys].join(',')
  const base      = `https://api.pipedrive.com/v1/deals?api_token=${apiToken}&limit=100&status=open&fields=${fields}`

  const results = await Promise.all(
    INZEROVANE_STAGES.map(stageId => fetchAllPages(`${base}&stage_id=${stageId}`))
  )
  const all = results.flat()

  for (const d of all) {
    d._km     = meta.kmKey     ? d[meta.kmKey]     : null
    d._rok    = meta.rokKey    ? d[meta.rokKey]    : null
    const pId = meta.palivoKey ? String(d[meta.palivoKey] || '') : ''
    d._palivo = pId ? (meta.palivoOptions[pId] || null) : null
  }

  return all
}

const getCachedZdravie = dataCache(fetchZdravieData, 'zdravie-ponuky', 600)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === '1'

    if (force) {
      const { revalidateTag } = await import('next/cache')
      revalidateTag('zdravie-ponuky')
    }

    const data = await getCachedZdravie()
    return Response.json(data, { headers: { 'X-Cache': force ? 'REVALIDATED' : 'HIT' } })
  } catch {
    return Response.json({ error: 'Interná chyba' }, { status: 500 })
  }
}
