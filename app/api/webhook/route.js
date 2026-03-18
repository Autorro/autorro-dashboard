import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    console.log('WEBHOOK BODY:', JSON.stringify(body))
    
    const { event, data } = body
    
    if (!event || !event.includes('deal')) {
      return Response.json({ ok: true, skipped: 'not a deal event' })
    }
    
    const current = data?.current
    const previous = data?.previous
    
    console.log('CURRENT STAGE:', current?.stage_id)
    console.log('PREVIOUS STAGE:', previous?.stage_id)
    
    if (!previous || current?.stage_id === previous?.stage_id) {
      return Response.json({ ok: true, skipped: 'no stage change' })
    }
    
    const { error } = await supabase.from('stage_changes').insert({
      deal_id: current.id,
      deal_title: current.title,
      owner_name: current.owner_name,
      owner_id: current.user_id,
      from_stage: previous.stage_id,
      to_stage: current.stage_id,
      changed_at: new Date().toISOString()
    })
    
    if (error) console.log('SUPABASE ERROR:', error)
    
    return Response.json({ ok: true })
  } catch (err) {
    console.log('ERROR:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}