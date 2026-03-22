export async function GET(request) {
  try {
    const apiToken = process.env.PIPEDRIVE_API_TOKEN
    const { searchParams } = new URL(request.url)

    // Sanitize: povolíme iba nezáporné celé čísla – zabraňuje URL parameter injection
    const startRaw = searchParams.get('start') || '0'
    const start    = /^\d+$/.test(startRaw) ? parseInt(startRaw, 10) : 0

    const response = await fetch(
      `https://api.pipedrive.com/v1/deals?api_token=${apiToken}&limit=100&start=${start}&status=open`,
      { cache: 'no-store' }
    )
    const data = await response.json()
    return Response.json(data)
  } catch {
    return Response.json({ error: 'Interná chyba' }, { status: 500 })
  }
}
