import { supabase } from '@/lib/supabase-server'

const PIPEDRIVE_TOKEN = process.env.PIPEDRIVE_API_TOKEN

/**
 * Overí, že webhook pochádza z Pipedrive.
 * Pipedrive posiela secret ako query parameter alebo HTTP Basic Auth.
 * Nastav WEBHOOK_SECRET v Pipedrive webhook URL: ?secret=<tvoj_secret>
 */
function isAuthorized(request) {
  const webhookSecret = process.env.WEBHOOK_SECRET
  // Ak secret nie je nakonfigurovaný, logy upozornenie ale prepusť (backward compat)
  if (!webhookSecret) {
    console.warn('[webhook] WEBHOOK_SECRET nie je nastavený – webhook nie je chránený!')
    return true
  }

  // 1. Query parameter: ?secret=XXX
  const url = new URL(request.url)
  const querySecret = url.searchParams.get('secret')
  if (querySecret && querySecret === webhookSecret) return true

  // 2. HTTP Basic Auth (Pipedrive to podporuje pri nastavení webhookov)
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8')
    // formát: username:password — porovnaj password so secretom
    const [, password] = decoded.split(':')
    if (password === webhookSecret) return true
  }

  return false
}

async function getOwnerName(userId) {
  try {
    const r = await fetch(`https://api.pipedrive.com/v1/users/${userId}?api_token=${PIPEDRIVE_TOKEN}`)
    const d = await r.json()
    return d.data?.name || String(userId)
  } catch {
    return String(userId)
  }
}

export async function POST(request) {
  // ── Autorizácia ──────────────────────────────────────────────────────
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const action   = body.meta?.action
    const current  = body.data
    const previous = body.previous

    if (action !== 'change')                              return Response.json({ ok: true })
    if (!previous?.stage_id)                              return Response.json({ ok: true })
    if (current?.stage_id === previous?.stage_id)         return Response.json({ ok: true })

    const ownerName = await getOwnerName(current.owner_id)

    const { error } = await supabase.from('stage_changes').insert({
      deal_id:    current.id,
      deal_title: current.title,
      owner_name: ownerName,
      owner_id:   current.owner_id,
      from_stage: previous.stage_id,
      to_stage:   current.stage_id,
      changed_at: body.meta?.timestamp || new Date().toISOString(),
    })

    if (error) {
      console.error('[webhook] Supabase insert error:', error.code)
      return Response.json({ error: 'Database error' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
