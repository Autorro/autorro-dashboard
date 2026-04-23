import { supabase } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth-server'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * GET /api/trend-zdravia?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function GET(request) {
  try {
    const user = await getServerUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to   = searchParams.get('to') || new Date().toISOString().split('T')[0]

    if (!from || !DATE_RE.test(from)) {
      return Response.json({ error: 'Neplatný alebo chýbajúci parameter from (očakávaný formát YYYY-MM-DD)' }, { status: 400 })
    }
    if (!DATE_RE.test(to)) {
      return Response.json({ error: 'Neplatný parameter to (očakávaný formát YYYY-MM-DD)' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('health_snapshots')
      .select('snapshot_date, owner_name, total, cena_ok, health_pct')
      .gte('snapshot_date', from)
      .lte('snapshot_date', to)
      .order('snapshot_date', { ascending: true })

    if (error) {
      console.error('[trend-zdravia] Supabase error:', error.code)
      return Response.json({ error: 'Interná chyba databázy' }, { status: 500 })
    }

    return Response.json({ snapshots: data || [], from, to })
  } catch {
    return Response.json({ error: 'Interná chyba' }, { status: 500 })
  }
}
