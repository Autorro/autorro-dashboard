import { getServerUser, isAdminUser } from '@/lib/auth-server'

export const revalidate = 3600 // cache 1 hour

export async function GET() {
  const user = await getServerUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const token = process.env.PIPEDRIVE_API_TOKEN
  const res = await fetch(
    `https://api.pipedrive.com/v1/users?api_token=${token}`,
    { next: { revalidate: 3600 } }
  )
  const data = await res.json()

  if (!data.success) return Response.json({ error: 'Pipedrive error' }, { status: 500 })

  const users = (data.data || [])
    .filter(u => u.active_flag)
    .map(u => ({ id: u.id, name: u.name, email: u.email }))
    .sort((a, b) => a.name.localeCompare(b.name, 'sk'))

  return Response.json({ users })
}
