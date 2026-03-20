const INZEROVANE_STAGES = [13, 31, 34, 22];
const CACHE_TTL = 10 * 60 * 1000;

let cache = { data: null, timestamp: 0 };

const BASE_FIELDS = [
  "id", "title", "owner_id", "owner_name", "stage_id", "value", "currency",
  "status", "add_time",
  "880011fdbacbc3eee50103ec49001ac8abd56ae1", // Cena je OK
  "b4d54b0e06789b713abe1062178c19490259e00a", // Odporúčaná cena - AUTORRO
  "7bc01b48cc10642c58f19ce14bb33fe8abb7bb97", // Cena vozidla
];

function normLabel(s) {
  return (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/* Dynamicky nájdi kľúče pre km / rok / palivo */
async function fetchFieldMeta(apiToken) {
  const res  = await fetch(
    `https://api.pipedrive.com/v1/dealFields?api_token=${apiToken}&limit=500`,
    { cache: "no-store" }
  );
  const json = await res.json();
  const fields = json.data || [];

  const meta = { kmKey: null, rokKey: null, palivoKey: null, palivoOptions: {} };
  for (const f of fields) {
    const label = normLabel(f.name || "");
    if (["kilometre", "km", "najazdene km"].includes(label))            meta.kmKey     = f.key;
    else if (["1. evidencia", "1 evidencia", "rok vyroby"].includes(label)) meta.rokKey = f.key;
    else if (["palivo", "typ paliva"].includes(label)) {
      meta.palivoKey = f.key;
      for (const opt of (f.options || [])) meta.palivoOptions[String(opt.id)] = opt.label;
    }
  }
  return meta;
}

async function fetchAllDeals(apiToken, meta) {
  const extraKeys = [meta.kmKey, meta.rokKey, meta.palivoKey].filter(Boolean);
  const fields    = [...BASE_FIELDS, ...extraKeys].join(",");
  let all = [];

  for (const stageId of INZEROVANE_STAGES) {
    let start = 0;
    while (true) {
      const response = await fetch(
        `https://api.pipedrive.com/v1/deals?api_token=${apiToken}&limit=100&start=${start}&status=open&stage_id=${stageId}&fields=${fields}`,
        { cache: "no-store" }
      );
      const data = await response.json();
      // Remap dynamic fields to stable names
      for (const d of (data.data || [])) {
        d._km          = meta.kmKey     ? d[meta.kmKey]     : null;
        d._rok         = meta.rokKey    ? d[meta.rokKey]    : null;
        const pId      = meta.palivoKey ? String(d[meta.palivoKey] || "") : "";
        d._palivo      = pId ? (meta.palivoOptions[pId] || null) : null;
      }
      all = all.concat(data.data || []);
      const more = data.additional_data?.pagination?.more_items_in_collection;
      if (!more) break;
      start = data.additional_data.pagination.next_start;
    }
  }
  return all;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";
  const now = Date.now();

  if (!force && cache.data && now - cache.timestamp < CACHE_TTL) {
    return Response.json(cache.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "public, max-age=600" },
    });
  }

  const apiToken = process.env.PIPEDRIVE_API_TOKEN;
  const meta = await fetchFieldMeta(apiToken);
  const data = await fetchAllDeals(apiToken, meta);
  cache = { data, timestamp: now };

  return Response.json(data, {
    headers: { "X-Cache": "MISS", "Cache-Control": "no-store" },
  });
}
