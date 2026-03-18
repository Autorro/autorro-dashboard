import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    
    const action = body.meta?.action
    const current = body.data
    const previous = body.previous
    
    // Zachytíme len zmeny stage
    if (action !== 'change') return Response.json({ ok: true })
    if (!previous?.stage_id) return Response.json({ ok: true })
    if (current?.stage_id === previous?.stage_id) return Response.json({ ok: true })
    
    console.log('Stage change detected:', previous.stage_id, '->', current.stage_id)
    
    const { error } = await supabase.from('stage_changes').insert({
      deal_id: current.id,
      deal_title: current.title,
      owner_name: current.owner_id?.toString(),
      owner_id: current.owner_id,
      from_stage: previous.stage_id,
      to_stage: current.stage_id,
      changed_at: body.meta?.timestamp || new Date().toISOString()
    })
    
    if (error) console.log('Supabase error:', error.message)
    else console.log('Saved stage change!')
    
    return Response.json({ ok: true })
  } catch (err) {
    console.log('Error:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}