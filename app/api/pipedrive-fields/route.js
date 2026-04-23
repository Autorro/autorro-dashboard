import { getServerUser } from '@/lib/auth-server'

export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const apiToken = process.env.PIPEDRIVE_API_TOKEN
    const response = await fetch(
      `https://api.pipedrive.com/v1/dealFields?api_token=${apiToken}`,
      { cache: 'no-store' }
    )
    const data = await response.json()
    return Response.json(data)
  } catch {
    return Response.json({ error: 'Interná chyba' }, { status: 500 })
  }
}
