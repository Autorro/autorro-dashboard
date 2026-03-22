import { supabase } from '@/lib/supabase'
import { createCache } from '@/lib/pipedrive'

const CACHE_TTL = 5 * 60 * 1000
const cache     = createCache(CACHE_TTL)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === '1'

    const cached = cache.get(force)
    if (cached !== null) {
      return Response.json(cached, { headers: { 'X-Cache': 'HIT' } })
    }

    const { data, error } = await supabase
      .from('stage_changes')
      .select('deal_id, deal_title, owner_name, owner_id, from_stage, to_stage, changed_at')
      .order('changed_at', { ascending: false })

    if (error) {
      console.error('[reakčný-čas] Supabase error:', error.code)
      return Response.json({ error: 'Interná chyba databázy' }, { status: 500 })
    }

    const result = data || []
    cache.set(result)
    return Response.json(result, { headers: { 'X-Cache': 'MISS' } })
  } catch {
    return Response.json({ error: 'Interná chyba' }, { status: 500 })
  }
}
