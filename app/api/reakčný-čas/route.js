import { supabase } from '@/lib/supabase-server'
import { cache as dataCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'

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
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === '1'

    if (force) {
      const { revalidateTag } = await import('next/cache')
      revalidateTag('reakčný-čas')
    }

    const result = await getCachedReakcny()
    return Response.json(result, { headers: { 'X-Cache': force ? 'REVALIDATED' : 'HIT' } })
  } catch {
    return Response.json({ error: 'Interná chyba' }, { status: 500 })
  }
}
