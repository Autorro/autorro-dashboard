import { supabase } from '@/lib/supabase-server'

export async function GET() {
  const { data, error, count } = await supabase
    .from('stage_changes')
    .select('*', { count: 'exact' })
    .order('changed_at', { ascending: false })
    .limit(20)

  if (error) {
    return Response.json({ error: error.message, code: error.code }, { status: 500 })
  }

  const uniqueToStages   = [...new Set((data || []).map(r => r.to_stage))].sort((a,b) => a-b)
  const uniqueFromStages = [...new Set((data || []).map(r => r.from_stage))].sort((a,b) => a-b)

  return Response.json({
    total_records: count,
    unique_to_stages:   uniqueToStages,
    unique_from_stages: uniqueFromStages,
    last_20_records: data,
  })
}
