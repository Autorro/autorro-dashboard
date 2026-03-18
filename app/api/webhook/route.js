import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    
    // Pipedrive posiela event pri zmene dealu
    const { event, data } = body
    
    // Zachytíme len zmeny stage
    if (event !== 'updated.deal') return Response.json({ ok: true })
    
    const current = data.current
    const previous = data.previous
    
    // Ak sa stage nezmenilo, ignorujeme
    if (!previous || current.stage_id === previous.stage_id) {
      return Response.json({ ok: true })
    }
    
    // Uložíme zmenu do Supabase
    await supabase.from('stage_changes').insert({
      deal_id: current.id,
      deal_title: current.title,
      owner_name: current.owner_name,
      owner_id: current.user_id,
      from_stage: previous.stage_id,
      to_stage: current.stage_id,
      changed_at: new Date().toISOString()
    })
    
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}