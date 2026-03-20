const CACHE_TTL = 10 * 60 * 1000;
let cache = { data: null, timestamp: 0 };

const ZNACKA_KEY = "c5d33ca43498a4e3e0e90dc8e1cfa3944107290d";

/* ── Zoznam všetkých známych značiek (normalizované bez diakritiky, lowercase) ── */
const KNOWN_BRANDS = [
  "abarth","acura","alfa romeo","alpina","aston martin","audi","austin","avia",
  "bentley","bmw","bugatti","buick","cadillac","chevrolet","chrysler","citroen",
  "cupra","dacia","daewoo","daf","daihatsu","dodge","ds","ferrari","fiat","fisker",
  "ford","gmc","honda","hummer","hyundai","infiniti","isuzu","iveco","jaguar",
  "jeep","kia","lada","lamborghini","lancia","land rover","lexus","lincoln",
  "lotus","mahindra","man","maserati","mazda","mclaren","mercedes","mg","mini",
  "mitsubishi","nissan","opel","peugeot","pontiac","porsche","renault","rolls royce",
  "rolls-royce","rover","saab","seat","skoda","skóda","smart","ssangyong","subaru",
  "suzuki","tatra","tesla","toyota","trabant","volkswagen","volvo","volga",
];

/* Normalizuj text — odstráň diakritiku, lowercase */
function norm(s) {
  return (s || "")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().trim();
}

/* Pokús sa rozpoznať značku z názvu dealu */
function brandFromTitle(title) {
  const t = norm(title);
  // Najprv dvojslovné (dlhšie zhody majú prednosť)
  for (const b of KNOWN_BRANDS) {
    if (b.includes(" ") && t.startsWith(b)) return b;
  }
  // Potom jednoslovné — kontrolujeme len začiatok titulu
  const firstWord = t.split(/\s+/)[0];
  for (const b of KNOWN_BRANDS) {
    if (!b.includes(" ") && norm(b) === firstWord) return b;
  }
  return null;
}

/* ── Stiahni ID→label mapu z Pipedrive a automaticky oprav premenované možnosti ── */
async function fetchZnackaMap(token, rawDeals) {
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

  /*
   * Auto-korekcia: pre každý enum ID spočítame aké značky sa objavujú
   * v názvoch dealov, ktoré majú toto ID. Ak väčšina (≥60%) titulkov
   * ukazuje inú značku ako je v Pipedrive — použijeme titulkovú značku.
   * Tým opravíme všetky premenované enum možnosti naraz.
   */
  const idTitles = {};
  for (const d of rawDeals) {
    const raw = String(d[ZNACKA_KEY] || "");
    if (!raw) continue;
    if (!idTitles[raw]) idTitles[raw] = [];
    idTitles[raw].push(d.title || "");
  }

  for (const [id, titles] of Object.entries(idTitles)) {
    if (titles.length < 3) continue; // príliš málo dát na rozhodnutie

    // Spočítaj detekované značky z titulkov
    const counts = {};
    for (const t of titles) {
      const b = brandFromTitle(t);
      if (b) counts[b] = (counts[b] || 0) + 1;
    }
    if (!Object.keys(counts).length) continue;

    const [topBrand, topCount] = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0];

    const confidence = topCount / titles.length;
    if (confidence < 0.6) continue; // nie je to jasné

    const currentLabel = norm(map[id] || "");
    const detectedLabel = norm(topBrand);

    // Ak sa Pipedrive label líši od toho čo vidíme v titulkoch — oprav
    if (currentLabel !== detectedLabel) {
      // Kapitaliz prvé písmeno každého slova
      map[id] = topBrand
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
        // Špeciálne prípady
        .replace(/Ssangyong/, "SsangYong")
        .replace(/Bmw/, "BMW")
        .replace(/Mg/, "MG")
        .replace(/Ds/, "DS");
    }
  }

  return map;
}

function getZnacka(deal, znackaMap) {
  const raw = deal[ZNACKA_KEY];
  if (!raw) return "Neurčená";
  return znackaMap[String(raw)] || "Neurčená";
}

async function fetchRawDeals(token) {
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
      all.push(...(json.data || []));
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

  const token    = process.env.PIPEDRIVE_API_TOKEN;
  const rawDeals = await fetchRawDeals(token);

  // Mapa s auto-korekciou premenovaných možností
  const znackaMap = await fetchZnackaMap(token, rawDeals);

  // Mapuj surové dealy na výsledok
  const mapped = rawDeals.map(d => ({
    status: d.status,
    znacka: getZnacka(d, znackaMap),
  }));

  const byBrand = {};
  for (const d of mapped) {
    const z = d.znacka;
    if (!byBrand[z]) byBrand[z] = { brand: z, open: 0, won: 0, lost: 0 };
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
