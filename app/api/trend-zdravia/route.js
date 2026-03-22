import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/trend-zdravia?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Vráti všetky snapshotové záznamy zdravia z tabuľky health_snapshots
 * pre dané časové obdobie.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to') || new Date().toISOString().split('T')[0]

  if (!from) {
    return Response.json({ error: 'Chýba parameter from' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('health_snapshots')
    .select('snapshot_date, owner_name, total, cena_ok, health_pct')
    .gte('snapshot_date', from)
    .lte('snapshot_date', to)
    .order('snapshot_date', { ascending: true })

  if (error) {
    console.error('[trend-zdravia] Supabase error:', error.code)
    return Response.json({ error: 'Database error' }, { status: 500 })
  }

  return Response.json({ snapshots: data || [], from, to })
}
