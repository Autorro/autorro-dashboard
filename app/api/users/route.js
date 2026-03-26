import { createClient } from '@supabase/supabase-js'
import { getServerUser, isAdminUser } from '@/lib/auth-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://autorro-dashboard.vercel.app'

async function requireAdmin() {
  const user = await getServerUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  if (!isAdminUser(user)) return { error: 'Forbidden – admin only', status: 403 }
  return { user }
}

// GET /api/users — zoznam všetkých používateľov
export async function GET() {
  const check = await requireAdmin()
  if (check.error) return Response.json({ error: check.error }, { status: check.status })

  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) return Response.json({ error: 'Nepodarilo sa načítať používateľov' }, { status: 500 })

  const users = (data.users || []).map(u => ({
    id:             u.id,
    email:          u.email,
    full_name:      u.user_metadata?.full_name || '',
    pipedrive_name: u.user_metadata?.pipedrive_name || '',
    confirmed:      !!u.email_confirmed_at,
    last_sign_in:   u.last_sign_in_at || null,
    created_at:     u.created_at,
  }))

  return Response.json({ users })
}

// POST /api/users — vytvorí účet a odošle pozvánku
export async function POST(request) {
  const check = await requireAdmin()
  if (check.error) return Response.json({ error: check.error }, { status: check.status })

  const body       = await request.json()
  const email      = (body?.email      || '').trim().toLowerCase()
  const full_name  = (body?.full_name  || '').trim()
  const pipedrive_name = (body?.pipedrive_name || full_name).trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Neplatný email' }, { status: 400 })
  }

  // Vytvor používateľa + odošli pozvánkový email s odkazom na nastavenie hesla
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${APP_URL}/auth/callback?next=/reset-password`,
    data: {
      full_name,
      pipedrive_name,
    },
  })

  if (error) {
    // Ak user už existuje, len znova odošli pozvánku
    if (error.message?.includes('already been registered')) {
      return Response.json({ error: 'Používateľ s týmto emailom už existuje' }, { status: 409 })
    }
    return Response.json({ error: error.message || 'Pozvánku sa nepodarilo odoslať' }, { status: 400 })
  }

  return Response.json({ user: { id: data.user.id, email, full_name } })
}

// PATCH /api/users — znova odošle pozvánku (pre nepotvrdených)
export async function PATCH(request) {
  const check = await requireAdmin()
  if (check.error) return Response.json({ error: check.error }, { status: check.status })

  const body  = await request.json()
  const email = (body?.email || '').trim().toLowerCase()

  if (!email) return Response.json({ error: 'Chýba email' }, { status: 400 })

  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${APP_URL}/auth/callback?next=/reset-password`,
  })

  if (error) return Response.json({ error: 'Nepodarilo sa znova odoslať pozvánku' }, { status: 400 })
  return Response.json({ ok: true })
}

// DELETE /api/users?id=UUID — vymaže používateľa
export async function DELETE(request) {
  const check = await requireAdmin()
  if (check.error) return Response.json({ error: check.error }, { status: check.status })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!id || !UUID_RE.test(id)) {
    return Response.json({ error: 'Neplatné ID' }, { status: 400 })
  }
  if (check.user?.id === id) {
    return Response.json({ error: 'Nemôžeš vymazať sám seba' }, { status: 400 })
  }

  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) return Response.json({ error: 'Nepodarilo sa vymazať používateľa' }, { status: 400 })
  return Response.json({ ok: true })
}
