import { supabase }                    from '@/lib/supabase'
import { fetchAllPages }               from '@/lib/pipedrive'
import { INZEROVANE_STAGES, EXCLUDE, CENA_KEY } from '@/lib/constants'

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.warn('[snapshot] CRON_SECRET nie je nastavený!')
    return false
  }
  const authHeader = request.headers.get('authorization') || ''
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const apiToken = process.env.PIPEDRIVE_API_TOKEN
    const base     = `https://api.pipedrive.com/v1/deals?api_token=${apiToken}&limit=100&status=open&fields=id,owner_id,owner_name,${CENA_KEY}`

    const results = await Promise.all(
      INZEROVANE_STAGES.map(stageId => fetchAllPages(`${base}&stage_id=${stageId}`))
    )
    const all = results.flat()

    const brokers = {}
    all.forEach(deal => {
      const name = deal.owner_name || String(deal.owner_id)
      if (!name || EXCLUDE.includes(name)) return
      if (!brokers[name]) brokers[name] = { total: 0, ok: 0 }
      brokers[name].total++
      if (deal[CENA_KEY] == 100) brokers[name].ok++
    })

    const today = new Date().toISOString().split('T')[0]
    const rows  = Object.entries(brokers).map(([owner_name, s]) => ({
      snapshot_date: today,
      owner_name,
      total:         s.total,
      cena_ok:       s.ok,
      health_pct:    s.total > 0 ? Math.round((s.ok / s.total) * 10000) / 100 : 0,
    }))

    const { error } = await supabase
      .from('health_snapshots')
      .upsert(rows, { onConflict: 'snapshot_date,owner_name' })

    if (error) {
      console.error('[snapshot] Supabase upsert error:', error.code)
      return Response.json({ error: 'Interná chyba databázy' }, { status: 500 })
    }

    return Response.json({ ok: true, date: today, brokers: rows.length })
  } catch {
    return Response.json({ error: 'Interná chyba' }, { status: 500 })
  }
}
