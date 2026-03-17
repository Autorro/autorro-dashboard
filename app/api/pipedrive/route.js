export async function GET() {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN;

  const response = await fetch(
    `https://api.pipedrive.com/v1/deals?api_token=${apiToken}`
  );

  if (!response.ok) {
    return Response.json(
      { error: 'Failed to fetch deals from Pipedrive' },
      { status: response.status }
    );
  }

  const data = await response.json();
  return Response.json(data);
}
