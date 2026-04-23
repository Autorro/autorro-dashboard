import { supabase } from '@/lib/supabase-server'
import { cache as dataCache } from '@/lib/cache'
import { getServerUser } from '@/lib/auth-server'

export const revalidate = 300

async function fetchReakcnyData() {
  const { data, error } = await supabase
    .from('stage_changes')
    .select('deal_id, deal_title, owner_name, owner_id, from_stage, to_stage, changed_at')
    .order('changed_at', { ascending: false })

  if (error) {
    console.error('[reakčný-čas] Supabase error:', error.code)
    throw new Error('Interná chyba databázy')
  }
  return data || []
}

const getCachedReakcny = dataCache(fetchReakcnyData, 'reakčný-čas', 300)

export async function GET(request) {
  try {
    const user = await getServerUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === '1'

    if (force) {
      // Priame volanie DB bez cache, potom invalidujeme pre ďalšie requesty
      const { revalidateTag } = await import('next/cache')
      revalidateTag('reakčný-čas')
      const fresh = await fetchReakcnyData()
      return Response.json(fresh, { headers: { 'X-Cache': 'BYPASSED' } })
    }

    const result = await getCachedReakcny()
    return Response.json(result, { headers: { 'X-Cache': 'HIT' } })
  } catch (err) {
    console.error('[reakčný-čas] GET error:', err?.message)
    return Response.json({ error: 'Interná chyba' }, { status: 500 })
  }
}
