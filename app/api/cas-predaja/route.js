import { supabase } from '@/lib/supabase-server'
import { cache as dataCache } from '@/lib/cache'
import { INZEROVANE_STAGES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

async function fetchDealDetails(dealIds, apiToken) {
  const details = {}
  const BATCH = 10
  for (let i = 0; i < dealIds.length; i += BATCH) {
    const batch = dealIds.slice(i, i + BATCH)
    await Promise.all(batch.map(async (id) => {
      try {
        const res  = await fetch(
          `https://api.pipedrive.com/v1/deals/${id}?api_token=${apiToken}&fields=id,title,add_time,close_time,won_time,lost_time,status,value,currency`,
          { cache: 'no-store' }
        )
        const json = await res.json()
        if (json.data) details[id] = json.data
      } catch (e) { console.warn('[cas-predaja] Detail dealu', id, 'zlyhalo:', e.message) }
    }))
  }
  return details
}

async function fetchCasPredajaData() {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN

  const { data, error } = await supabase
    .from('stage_changes')
    .select('deal_id, deal_title, owner_name, from_stage, to_stage, changed_at')
    .or(`to_stage.in.(${INZEROVANE_STAGES.join(',')}),from_stage.in.(${INZEROVANE_STAGES.join(',')})`)
    .order('changed_at', { ascending: true })

  if (error) throw new Error(error.message)

  const dealMap = {}
  for (const row of data) {
    if (!dealMap[row.deal_id]) {
      dealMap[row.deal_id] = { deal_id: row.deal_id, owner_name: row.owner_name, deal_title: row.deal_title, entries: [], exits: [] }
    }
    if (INZEROVANE_STAGES.includes(row.to_stage))   dealMap[row.deal_id].entries.push(new Date(row.changed_at))
    if (INZEROVANE_STAGES.includes(row.from_stage)) dealMap[row.deal_id].exits.push(new Date(row.changed_at))
  }

  const now = new Date()
  const dealDurations = []
  for (const [dealId, deal] of Object.entries(dealMap)) {
    if (deal.entries.length === 0) continue
    const entry = deal.entries[0]
    const exit  = deal.exits.find(e => e > entry) || null
    const end   = exit || now
    const days  = Math.round(((end - entry) / (1000 * 60 * 60 * 24)) * 10) / 10
    dealDurations.push({ deal_id: Number(dealId), owner_name: deal.owner_name, deal_title: deal.deal_title, days, completed: !!exit, entry_date: entry.toISOString(), exit_date: exit ? exit.toISOString() : null })
  }

  const uniqueIds = [...new Set(dealDurations.map(d => d.deal_id))]
  const pdDetails = await fetchDealDetails(uniqueIds, apiToken)

  const enriched = dealDurations.map(d => {
    const pd = pdDetails[d.deal_id] || {}
    return { ...d, pd_id: pd.id || d.deal_id, add_time: pd.add_time || null, close_time: pd.close_time || pd.won_time || pd.lost_time || null, value: pd.value || null, currency: pd.currency || 'EUR', status: pd.status || null }
  })

  const ownerMap = {}
  for (const d of enriched) {
    const name = d.owner_name || 'Neznámy'
    if (!ownerMap[name]) ownerMap[name] = []
    ownerMap[name].push(d)
  }

  return Object.entries(ownerMap).map(([owner_name, deals]) => {
    const days = deals.map(d => d.days)
    return { owner_name, count: days.length, avg: Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10, min: Math.round(Math.min(...days) * 10) / 10, max: Math.round(Math.max(...days) * 10) / 10, deals: deals.sort((a, b) => b.days - a.days) }
  })
}

const getCachedCasPredaja = dataCache(fetchCasPredajaData, 'cas-predaja', 600)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === '1'

    if (force) {
      const { revalidateTag } = await import('next/cache')
      revalidateTag('cas-predaja')
    }

    const data = await getCachedCasPredaja()
    return Response.json(data, { headers: { 'X-Cache': force ? 'REVALIDATED' : 'HIT' } })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
