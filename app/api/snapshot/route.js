import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CENA_KEY = "880011fdbacbc3eee50103ec49001ac8abd56ae1"
const INZEROVANE_STAGES = [13, 31, 34, 22]
const EXCLUDE = ["Development", "Tomáš Martiš", "Miroslav Hrehor", "Peter Hudec", "Jaroslav Kováč"]

export async function GET(request) {
  // Bezpecnostny token
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (token !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Stiahni vsetky inzerovane dealy
    const apiToken = process.env.PIPEDRIVE_API_TOKEN
    let all = []
    for (const stageId of INZEROVANE_STAGES) {
      let start = 0
      while (true) {
        const r = await fetch(
          "https://api.pipedrive.com/v1/deals?api_token=" + apiToken + 
          "&limit=100&start=" + start + "&status=open&stage_id=" + stageId +
          "&fields=id,owner_id,880011fdbacbc3eee50103ec49001ac8abd56ae1"
        )
        const data = await r.json()
        all = all.concat(data.data || [])
        if (!data.additional_data?.pagination?.more_items_in_collection) break
        start = data.additional_data.pagination.next_start
      }
    }

    // Grupuj podla maklerov
    const brokers = {}
    all.forEach(deal => {
      const name = deal.owner_name || deal.owner_id?.toString()
      if (!name || EXCLUDE.includes(name)) return
      if (!brokers[name]) brokers[name] = { total: 0, ok: 0 }
      brokers[name].total++
      if (deal[CENA_KEY] == 100) brokers[name].ok++
    })

    // Uloz snapshot
    const today = new Date().toISOString().split('T')[0]
    const rows = Object.entries(brokers).map(([owner_name, s]) => ({
      snapshot_date: today,
      owner_name,
      total: s.total,
      cena_ok: s.ok,
      health_pct: s.total > 0 ? Math.round((s.ok / s.total) * 10000) / 100 : 0
    }))

    const { error } = await supabase
      .from('health_snapshots')
      .upsert(rows, { onConflict: 'snapshot_date,owner_name' })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ok: true, date: today, brokers: rows.length })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}