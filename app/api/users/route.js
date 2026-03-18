import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ users: data.users })
}

export async function POST(request) {
  const { email, password } = await request.json()
  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true
  })
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ user: data.user })
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ success: true })
}