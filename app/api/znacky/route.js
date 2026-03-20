const CACHE_TTL = 10 * 60 * 1000;
let cache = { data: null, timestamp: 0 };

const ZNACKA_KEY = "c5d33ca43498a4e3e0e90dc8e1cfa3944107290d";

/* ── Stiahni aktuálnu ID→label mapu priamo z Pipedrive ── */
async function fetchZnackaMap(token) {
  const res  = await fetch(
    `https://api.pipedrive.com/v1/dealFields?api_token=${token}&limit=500`,
    { cache: "no-store" }
  );
  const json = await res.json();
  const field = (json.data || []).find(f => f.key === ZNACKA_KEY);
  const map = {};
  for (const opt of (field?.options || [])) {
    map[String(opt.id)] = opt.label;
  }
  return map;
}

function getZnacka(deal, znackaMap) {
  const raw = deal[ZNACKA_KEY];
  if (!raw) return "Neurčená";
  return znackaMap[String(raw)] || String(raw);
}

async function fetchAllDeals(znackaMap) {
  const token = process.env.PIPEDRIVE_API_TOKEN;
  const statuses = ["open", "won", "lost"];
  const all = [];

  for (const status of statuses) {
    let start = 0;
    while (true) {
      const res  = await fetch(
        `https://api.pipedrive.com/v1/deals?api_token=${token}&status=${status}&limit=500&start=${start}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      const rows = (json.data || []).map(d => ({
        id:      d.id,
        title:   d.title || "",
        status:  d.status,
        owner:   d.owner_id?.name || "",
        znacka:  getZnacka(d, znackaMap),
        addTime: d.add_time || null,
        wonTime: d.won_time || null,
      }));
      all.push(...rows);
      if (!json.additional_data?.pagination?.more_items_in_collection) break;
      start = json.additional_data.pagination.next_start;
    }
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

  const token     = process.env.PIPEDRIVE_API_TOKEN;
  const znackaMap = await fetchZnackaMap(token);
  const deals     = await fetchAllDeals(znackaMap);

  const byBrand = {};
  for (const d of deals) {
    const z = d.znacka;
    if (!byBrand[z]) byBrand[z] = { brand:z, open:0, won:0, lost:0 };
    byBrand[z][d.status]++;
  }

  const result = Object.values(byBrand)
    .map(b => ({
      brand:   b.brand,
      open:    b.open,
      won:     b.won,
      lost:    b.lost,
      total:   b.open + b.won + b.lost,
      winRate: b.won + b.lost > 0 ? Math.round(b.won / (b.won + b.lost) * 100) : null,
    }))
    .sort((a, z) => z.total - a.total);

  cache = { data: result, timestamp: now };
  return Response.json(result, {
    headers: { "X-Cache": "MISS", "X-Fetched-At": new Date().toISOString() }
  });
}
