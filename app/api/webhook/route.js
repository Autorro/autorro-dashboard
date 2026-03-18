import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PIPEDRIVE_TOKEN = process.env.PIPEDRIVE_API_TOKEN

async function getOwnerName(userId) {
  try {
    const r = await fetch("https://api.pipedrive.com/v1/users/" + userId + "?api_token=" + PIPEDRIVE_TOKEN)
    const d = await r.json()
    return d.data?.name || userId.toString()
  } catch {
    return userId.toString()
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const action = body.meta?.action
    const current = body.data
    const previous = body.previous

    if (action !== 'change') return Response.json({ ok: true })
    if (!previous?.stage_id) return Response.json({ ok: true })
    if (current?.stage_id === previous?.stage_id) return Response.json({ ok: true })

    const ownerName = await getOwnerName(current.owner_id)

    const { error } = await supabase.from('stage_changes').insert({
      deal_id: current.id,
      deal_title: current.title,
      owner_name: ownerName,
      owner_id: current.owner_id,
      from_stage: previous.stage_id,
      to_stage: current.stage_id,
      changed_at: body.meta?.timestamp || new Date().toISOString()
    })

    if (error) console.log('Supabase error:', error.message)
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}