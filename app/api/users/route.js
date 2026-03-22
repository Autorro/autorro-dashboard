import { createClient } from '@supabase/supabase-js'
import { getServerUser, isAdminUser } from '@/lib/auth-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://autorro-dashboard.vercel.app'

/**
 * Všetky operácie s používateľmi vyžadujú admin rolu.
 * Nastav ADMIN_EMAILS v env (čiarkami oddelené emaily).
 */
async function requireAdmin() {
  const user = await getServerUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  if (!isAdminUser(user)) return { error: 'Forbidden – admin only', status: 403 }
  return { user }
}

export async function GET() {
  const check = await requireAdmin()
  if (check.error) return Response.json({ error: check.error }, { status: check.status })

  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) return Response.json({ error: 'Failed to list users' }, { status: 500 })
  return Response.json({ users: data.users })
}

export async function POST(request) {
  const check = await requireAdmin()
  if (check.error) return Response.json({ error: check.error }, { status: check.status })

  const body = await request.json()
  const email = (body?.email || '').trim().toLowerCase()

  // Základná email validácia
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Neplatný email' }, { status: 400 })
  }

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${APP_URL}/reset-password`,
  })
  if (error) return Response.json({ error: 'Pozvánku sa nepodarilo odoslať' }, { status: 400 })
  return Response.json({ user: data.user })
}

export async function DELETE(request) {
  const check = await requireAdmin()
  if (check.error) return Response.json({ error: check.error }, { status: check.status })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!id || !UUID_RE.test(id)) {
    return Response.json({ error: 'Neplatné ID' }, { status: 400 })
  }

  // Zabraň vymazaniu samého seba
  if (check.user?.id === id) {
    return Response.json({ error: 'Nemôžeš vymazať sám seba' }, { status: 400 })
  }

  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) return Response.json({ error: 'Nepodarilo sa vymazať používateľa' }, { status: 400 })
  return Response.json({ success: true })
}
