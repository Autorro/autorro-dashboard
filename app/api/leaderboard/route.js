const CACHE_TTL = 5 * 60 * 1000; // 5 minút

let cache = { data: null, timestamp: 0 };

async function fetchWonDeals() {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN;
  let all   = [];
  let start = 0;

  while (true) {
    const res  = await fetch(
      `https://api.pipedrive.com/v1/deals?api_token=${apiToken}&status=won&limit=500&start=${start}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    const rows = json.data || [];
    all = all.concat(rows);
    const more = json.additional_data?.pagination?.more_items_in_collection;
    if (!more) break;
    start = json.additional_data.pagination.next_start;
  }
  return all;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";
  const now   = Date.now();

  if (!force && cache.data && now - cache.timestamp < CACHE_TTL) {
    return Response.json(cache.data, {
      headers: { "X-Cache": "HIT", "X-Cache-Age": String(Math.round((now - cache.timestamp) / 1000)) }
    });
  }

  const deals  = await fetchWonDeals();

  const mapped = deals.map(d => ({
    id:          d.id,
    title:       d.title || "",
    owner:       d.owner_id?.name || d.owner_name || "",
    wonTime:     d.won_time || d.close_time || null,
    cenaVozidla: Number(d.value) || 0,
    currency:    d.currency || "EUR",
  }));

  cache = { data: mapped, timestamp: now };
  return Response.json(mapped, {
    headers: { "X-Cache": "MISS", "X-Fetched-At": new Date().toISOString() }
  });
}
