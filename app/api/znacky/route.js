const CACHE_TTL = 10 * 60 * 1000; // 10 minút
let cache = { data: null, timestamp: 0 };

/* ── Normalizácia značiek ── */
const BRAND_ALIASES = {
  "VW":             "VOLKSWAGEN",
  "MB":             "MERCEDES-BENZ",
  "MERCEDES":       "MERCEDES-BENZ",
  "MERCEDESBENZ":   "MERCEDES-BENZ",
  "SKODA":          "ŠKODA",
  "ALFA":           "ALFA ROMEO",
  "LAND":           "LAND ROVER",     // LAND ROVER
  "RANGE":          "LAND ROVER",     // RANGE ROVER
};

// Dvojslovné značky (musíme skontrolovať prvé 2 slová)
const TWO_WORD_BRANDS = new Set([
  "ALFA ROMEO", "LAND ROVER", "ASTON MARTIN", "ROLLS ROYCE", "ROLLS-ROYCE"
]);

const KNOWN_BRANDS = new Set([
  "ŠKODA","VOLKSWAGEN","BMW","AUDI","MERCEDES-BENZ","FORD","OPEL","TOYOTA",
  "HYUNDAI","KIA","SEAT","PEUGEOT","RENAULT","CITROËN","CITROEN","FIAT","HONDA",
  "MAZDA","MITSUBISHI","NISSAN","SUZUKI","DACIA","VOLVO","JAGUAR","PORSCHE",
  "LEXUS","INFINITI","FERRARI","LAMBORGHINI","MASERATI","BENTLEY","JEEP",
  "DODGE","CHEVROLET","TESLA","MINI","SMART","CUPRA","SUBARU","ALFA ROMEO",
  "LAND ROVER","ASTON MARTIN","GENESIS","SKODIA","RIVIAN","LYNK","BYD",
  "MG","ISUZU","RAM","LINCOLN","CADILLAC","CHRYSLER","BUICK","GMC","HUMMER",
  "LANCIA","SAAB","SSANGYONG","MAHINDRA","TATA","GREAT WALL","HAVAL","BAIC",
]);

function extractBrand(title) {
  if (!title) return "Iné";
  const t = title.trim().toUpperCase();
  const words = t.split(/[\s\-_/]+/).filter(Boolean);
  if (!words.length) return "Iné";

  // Skús dvojslovnú značku
  if (words.length >= 2) {
    const two = words[0] + " " + words[1];
    if (TWO_WORD_BRANDS.has(two)) return two;
    const twoAlias = BRAND_ALIASES[words[0]];
    if (twoAlias && TWO_WORD_BRANDS.has(twoAlias)) return twoAlias;
  }

  // Jednoslovná
  const first = words[0].replace(/[^A-ZŠŽČÁÉÍÓÚÝÄÖÜŘĽĹŇ]/g,"");
  const alias = BRAND_ALIASES[first];
  if (alias) return alias;
  if (KNOWN_BRANDS.has(first)) return first;

  // Ak nie je v zozname, vráť prvé slovo (nová/neznáma značka)
  return first || "Iné";
}

async function fetchAllDeals() {
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
        status:  d.status,          // open | won | lost
        owner:   d.owner_id?.name || "",
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

  const deals = await fetchAllDeals();

  // Agregácia podľa značky
  const byBrand = {};
  for (const d of deals) {
    const brand = extractBrand(d.title);
    if (!byBrand[brand]) byBrand[brand] = { brand, open:0, won:0, lost:0, deals:[] };
    byBrand[brand][d.status]++;
    byBrand[brand].deals.push(d);
  }

  const result = Object.values(byBrand)
    .map(b => ({
      brand:    b.brand,
      open:     b.open,
      won:      b.won,
      lost:     b.lost,
      total:    b.open + b.won + b.lost,
      winRate:  b.won + b.lost > 0 ? Math.round(b.won / (b.won + b.lost) * 100) : null,
    }))
    .sort((a, z) => z.total - a.total);

  cache = { data: result, timestamp: now };
  return Response.json(result, {
    headers: { "X-Cache": "MISS", "X-Fetched-At": new Date().toISOString() }
  });
}
