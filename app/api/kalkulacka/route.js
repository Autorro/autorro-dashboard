import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

// ── Pipedrive field keys ────────────────────────────────────────
const F = {
  znacka:      'c5d33ca43498a4e3e0e90dc8e1cfa3944107290d',
  model:       '40ae61427f898087ee54a8ee06ce2b5311079a2b',
  km:          'b8fe1deaac2bd1dace60c545c248c6a2f98e3a52',
  vykon:       '2f9dfecf996dfe8534ea1bf7f66baa8168c4e408',
  palivo:      'b443ce5a8f885638f2f749d7be7c90e200bf8155',
  prevodovka:  '00fb549c6495b6edbd45fc300b2f1ceb10fe5261',
  predane_za:  'a259a3e33801fbbd38f47fec09eec01ab6680023',
  vykup_za:    '7f4a915f993bc7cfb5aaaf0804ec54f83be6ccc6',
  odp_autorro: 'b4d54b0e06789b713abe1062178c19490259e00a',
  odp_makler:  'be22b659e743dc6999971965c384c727f3b1f35b',
  provizka:    '3c229676e9af562e9df014540cc1617eccf9b0cb',
}

// ── Enumerácie ──────────────────────────────────────────────────
const ZNACKY = {
  120:'Abarth',121:'Acura',122:'Alfa Romeo',123:'Alpina',124:'Aro',125:'Aston Martin',
  126:'Audi',130:'BMW',129:'Bentley',131:'Bugatti',132:'Buick',133:'Cadillac',
  134:'Chevrolet',135:'Chrysler',136:'Citroën',137:'Cupra',138:'Daewoo',972:'Dacia',
  139:'Daf',140:'Daihatsu',141:'Dodge',142:'DS',143:'Ferrari',144:'Fiat',146:'Ford',
  149:'Honda',151:'Hyundai',152:'Infiniti',153:'Isuzu',154:'Iveco',155:'Jaguar',
  156:'Jeep',159:'Kia',160:'Lada',161:'Lamborghini',162:'Lancia',163:'Land Rover',
  164:'Lexus',165:'Lincoln',166:'Lotus',167:'Mahindra',168:'MAN',169:'Maserati',
  170:'Mazda',171:'McLaren',172:'Mercedes',173:'MG',174:'Mini',175:'Mitsubishi',
  176:'Nissan',177:'Opel',178:'Peugeot',180:'Porsche',181:'Renault',182:'Rolls-Royce',
  183:'Rover',184:'Saab',185:'Seat',186:'Škoda',187:'Smart',188:'SsangYong',
  189:'Subaru',190:'Suzuki',192:'Tesla',193:'Toyota',194:'Trabant',195:'Volga',
  196:'Volkswagen',197:'Volvo',995:'Polestar',
}
const ZNACKY_REV = Object.fromEntries(
  Object.entries(ZNACKY).map(([id, name]) => [name.toLowerCase().replace(/[^a-z0-9]/g,''), parseInt(id)])
)
const PALIVO = {
  233:'Benzín+CNG',234:'Diesel',235:'Benzín+LPG',236:'LPG',237:'CNG',
  238:'Hybrid',239:'Elektro',240:'Diesel+HEV',241:'Benzín+HEV',242:'Iné',244:'Benzín',
}
const PREVODOVKA = {
  223:'CVT',224:'AT/9',225:'AT/8',226:'AT/7',227:'AT/6',
  228:'Manuálna',229:'Automatická',230:'—',231:'MT/6',232:'MT/5',
}

// ── Parsovanie URL slugu ────────────────────────────────────────
function parseSlug(url) {
  try {
    const u    = new URL(url)
    const isAB = u.hostname.includes('autobazar')
    const isBZ = u.hostname.includes('bazos')
    const parts = u.pathname.split('/').filter(Boolean)

    let slug = ''
    if (isAB)      slug = parts[1] || parts[0] || ''
    else if (isBZ) slug = (parts[2] || '').replace('.php', '')
    else           slug = parts.join('-')

    const tokens = slug.toLowerCase()
    const tArr   = tokens.split(/[-_\s]+/).filter(t => t.length > 0)

    // Značka — skús 1-3 tokeny
    let znackaId = null, brandTokens = 0
    for (let n = 3; n >= 1; n--) {
      const cand = tArr.slice(0, n).join('').replace(/[^a-z0-9]/g,'')
      if (ZNACKY_REV[cand] !== undefined) { znackaId = ZNACKY_REV[cand]; brandTokens = n; break }
    }
    const brandName = znackaId ? ZNACKY[znackaId] : null
    const model     = tArr.slice(brandTokens, brandTokens + 2).join(' ')

    // Rok — 4-ciferne číslo 19xx alebo 20xx
    const rokMatch = tokens.match(/\b(19\d{2}|20[012]\d)\b/)
    const rok      = rokMatch ? parseInt(rokMatch[1]) : null

    // Výkon — číslo pred "kw" alebo "kw"
    const kWMatch = tokens.match(/\b(\d{2,3})\s*kw\b/)
    const vykon   = kWMatch ? parseInt(kWMatch[1]) : null

    // Palivo — z kódu motora
    let palivoId = null
    if      (/\b(tdi|tdci|crdi|cdi|cdti|tgi|dci)\b/.test(tokens)) palivoId = 234 // Diesel
    else if (/\b(tsi|tfsi|gdi|t-gdi|gtdi|petrol)\b/.test(tokens))  palivoId = 244 // Benzín
    else if (/\b(phev|plug.?in)\b/.test(tokens))                    palivoId = 241 // Benzín+HEV
    else if (/\bhybrid\b/.test(tokens))                             palivoId = 238 // Hybrid
    else if (/\b(bev|elektro|ev|electric)\b/.test(tokens))         palivoId = 239 // Elektro

    // Prevodovka — z kódu
    let prevId = null
    if      (/\b(dsg|tronic|dct|tct|pdk|cvt|tiptronic|automat|at\/|a\/t)\b/.test(tokens)) prevId = 229
    else if (/\b(a[0-9]|at\/[0-9]|automaticka|automatic)\b/.test(tokens))                  prevId = 229
    else if (/\b(mt\/|m[5-8]|manualna|manual)\b/.test(tokens))                             prevId = 228

    return { znackaId, brandName, model, rok, vykon, palivoId, prevId, isAutobazar: isAB, isBazos: isBZ }
  } catch { return null }
}

// ── Autobazar.eu: __NEXT_DATA__ → trhové dáta + smart match ────
async function scrapeAutobazarInternal(url, hintKw, hintFuel, hintRok) {
  try {
    const res  = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sk-SK,sk;q=0.9,cs;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()
    const nd   = html.match(/id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!nd) return null

    const trpc    = JSON.parse(nd[1])?.props?.pageProps?.trpcState?.queries || []
    let records   = []
    for (const q of trpc) {
      const d = q?.state?.data
      if (d?.data && Array.isArray(d.data) && d.data[0]?.price) { records = d.data; break }
    }
    if (!records.length) return null

    const listings = records.map(r => ({
      id:         r.id,
      title:      r.title,
      price:      r.price || r.finalPrice || 0,
      km:         r.mileage || null,
      rok:        r.yearValue || null,
      palivo:     r.fuelValue || null,
      vykon:      r.enginePower || null,
      prevodovka: r.gearboxValue || null,
      brand:      r.brandValue,
      model:      r.carModelValue,
    })).filter(r => r.price > 0)

    // ── Smart match: nájdi inzerát najbližší k nášmu ──────────
    let bestMatch = null, bestScore = -1
    for (const r of listings) {
      let score = 0
      if (hintKw   && r.vykon)  score += 40 - Math.min(40, Math.abs(r.vykon - hintKw))
      if (hintFuel && r.palivo) {
        const isFuelDiesel = /diesel/i.test(r.palivo)
        const hintDiesel   = hintFuel === 234
        if (isFuelDiesel === hintDiesel) score += 30
      }
      if (hintRok  && r.rok)    score += 20 - Math.min(20, Math.abs(r.rok - hintRok) * 2)
      if (score > bestScore) { bestScore = score; bestMatch = r }
    }

    return {
      brand:    records[0]?.brandValue,
      model:    records[0]?.carModelValue,
      matched:  bestMatch,   // konkrétny inzerát pre auto-fill
      listings: listings.slice(0, 20),
      stats:    stats(listings.map(r => r.price)),
    }
  } catch (e) {
    console.error('[scrapeAB]', e.message)
    return null
  }
}

// Cache 2h — ochrana pred IP blokovaním
const getCachedAB = (url, kw, fuel, rok) =>
  unstable_cache(
    () => scrapeAutobazarInternal(url, kw, fuel, rok),
    [`ab-${url}-${kw}-${fuel}-${rok}`],
    { revalidate: 7200, tags: ['autobazar'] }
  )()

// ── Bazoš.sk scraping ──────────────────────────────────────────
async function scrapeBazos(url) {
  try {
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    })
    const html  = await res.text()
    const title = html.match(/<h1[^>]*class="[^"]*nadpis[^"]*"[^>]*>(.*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g,'').trim()
    const price = html.match(/(\d[\d\s]*)\s*€/)?.[1]?.replace(/\s/g,'')
    const desc  = html.match(/<div[^>]*class="[^"]*popis[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]?.replace(/<[^>]+>/g,'').trim() || ''
    const km    = (desc).match(/(\d[\d\s]*)\s*km/i)?.[1]?.replace(/\s/g,'')
    const rok   = (title||desc).match(/\b(20[012]\d|199\d)\b/)?.[1]
    const kw    = (title||desc).match(/(\d{2,3})\s*kw/i)?.[1]
    return {
      title:  title || null,
      price:  price  ? parseInt(price)  : null,
      km:     km     ? parseInt(km)     : null,
      rok:    rok    ? parseInt(rok)    : null,
      vykon:  kw     ? parseInt(kw)     : null,
    }
  } catch { return null }
}

// ── Pipedrive: načítaj vyhrané dealy ───────────────────────────
async function fetchWonDeals() {
  const fields = [
    'id','title','owner_name','won_time',
    F.znacka, F.model, F.km, F.vykon, F.palivo, F.prevodovka,
    F.predane_za, F.vykup_za, F.odp_autorro, F.odp_makler, F.provizka,
  ].join(',')
  let all = [], start = 0
  while (true) {
    const res  = await fetch(
      `https://api.pipedrive.com/v1/deals?api_token=${process.env.PIPEDRIVE_API_TOKEN}&status=won&limit=500&start=${start}&fields=${fields}`
    )
    const data = await res.json()
    all = all.concat(data.data || [])
    if (!data.additional_data?.pagination?.more_items_in_collection) break
    start += 500
  }
  return all
}

// ── Štatistiky ─────────────────────────────────────────────────
function stats(values) {
  const v = values.filter(x => x > 0)
  if (!v.length) return null
  const s = [...v].sort((a, b) => a - b)
  const n = s.length
  return {
    min:    s[0],
    max:    s[n - 1],
    median: Math.round(n % 2 === 0 ? (s[n/2-1] + s[n/2]) / 2 : s[Math.floor(n/2)]),
    avg:    Math.round(v.reduce((a, b) => a + b, 0) / n),
    n,
  }
}

// ── Skóre podobnosti s Pipedrive dealmi ────────────────────────
function similarity(deal, input) {
  let score = 0
  // Model (50)
  if (input.model) {
    const m1 = (deal[F.model] || '').toLowerCase().trim()
    const m2 = input.model.toLowerCase().trim()
    if (m1 === m2)                                score += 50
    else if (m1.includes(m2) || m2.includes(m1)) score += 35
    else if (m1.split(' ')[0] === m2.split(' ')[0]) score += 20
  }
  // KM (25)
  if (input.km && deal[F.km]) {
    const r = Math.abs(deal[F.km] - input.km) / input.km
    if (r < 0.15) score += 25
    else if (r < 0.30) score += 15
    else if (r < 0.50) score += 8
  }
  // Rok (20) — z titulky pomocou regexu
  if (input.rok) {
    const rokMatch = (deal.title || '').match(/\b(19\d{2}|20[012]\d)\b/)
    if (rokMatch) {
      const diff = Math.abs(parseInt(rokMatch[1]) - input.rok)
      if (diff === 0) score += 20
      else if (diff <= 1) score += 14
      else if (diff <= 2) score += 8
      else if (diff <= 3) score += 3
    }
  }
  // Palivo (10)
  if (input.palivoId && deal[F.palivo]) {
    if (String(deal[F.palivo]) === String(input.palivoId)) score += 10
  }
  // Prevodovka (10)
  if (input.prevId && deal[F.prevodovka]) {
    const isAuto  = [229,224,225,226,227,223].includes(parseInt(deal[F.prevodovka]))
    const isManual= [228,231,232].includes(parseInt(deal[F.prevodovka]))
    const inAuto  = input.prevId === 229
    if ((isAuto && inAuto) || (isManual && !inAuto)) score += 10
  }
  // Výkon (5)
  if (input.vykon && deal[F.vykon]) {
    if (Math.abs(deal[F.vykon] - input.vykon) < 10) score += 5
    else if (Math.abs(deal[F.vykon] - input.vykon) < 20) score += 2
  }
  return score
}

// ── Pomocná funkcia: URL parse + scrape → autofill objekt ───────
async function resolveAutofill(url, hintKm, hintRok, hintPalivoId, hintPrevId, hintVykon) {
  let parsed   = null
  let abMarket = null
  let scraped  = null

  if (url) {
    parsed = parseSlug(url)

    if (parsed?.isAutobazar) {
      abMarket = await getCachedAB(url, parsed.vykon || hintVykon, parsed.palivoId || hintPalivoId, parsed.rok || hintRok)
      if (abMarket?.brand && !parsed.znackaId) {
        const k = abMarket.brand.toLowerCase().replace(/[^a-z0-9]/g,'')
        if (ZNACKY_REV[k] !== undefined) {
          parsed.znackaId  = ZNACKY_REV[k]
          parsed.brandName = ZNACKY[parsed.znackaId]
        }
      }
      if (abMarket?.model && !parsed.model) parsed.model = abMarket.model
    }
    if (parsed?.isBazos) scraped = await scrapeBazos(url)
  }

  const znackaId = parsed?.znackaId ?? null
  return {
    parsed, abMarket, scraped,
    autofill: {
      znackaId,
      brandName:  znackaId ? ZNACKY[znackaId] : null,
      model:      parsed?.model ?? abMarket?.model ?? null,
      rok:        parsed?.rok   ?? abMarket?.matched?.rok  ?? scraped?.rok  ?? null,
      km:         abMarket?.matched?.km  ?? scraped?.km  ?? null,
      palivoId:   parsed?.palivoId ?? null,
      prevId:     parsed?.prevId   ?? null,
      vykon:      parsed?.vykon    ?? abMarket?.matched?.vykon ?? scraped?.vykon ?? null,
      prevodovka: abMarket?.matched?.prevodovka ?? null,
      source: url ? (parsed?.isAutobazar ? 'autobazar' : parsed?.isBazos ? 'bazos' : 'slug') : null,
    },
  }
}

// ── Hlavný POST handler ─────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json()
    const { url, znackaId, model, km, rok, palivoId, prevId, vykon, autofillOnly } = body

    // 1. Parsuj URL + scrape
    const { parsed, abMarket, scraped, autofill } = await resolveAutofill(url, km, rok, palivoId, prevId, vykon)

    // ── autofillOnly: len vráť extrahované hodnoty, bez Pipedrive ─
    if (autofillOnly) {
      return NextResponse.json({ autofill })
    }

    // 2. Zlúč vstupy (formulár > autofill zo scraping/parse)
    const inp = {
      znackaId:  znackaId  ?? autofill.znackaId  ?? null,
      model:     (model    || autofill.model      || '').trim(),
      km:        km        ?? autofill.km         ?? null,
      rok:       rok       ?? autofill.rok        ?? null,
      palivoId:  palivoId  ?? autofill.palivoId   ?? null,
      prevId:    prevId    ?? autofill.prevId      ?? null,
      vykon:     vykon     ?? autofill.vykon       ?? null,
    }

    if (!inp.znackaId && !inp.model) {
      return NextResponse.json({ autofill,
        error: 'Nepodarilo sa určiť značku a model. Zadaj ich ručne.',
      })
    }

    // 3. Načítaj Pipedrive won deals
    const deals = await fetchWonDeals()

    // 4. Filtruj podľa značky
    let filtered = inp.znackaId
      ? deals.filter(d => String(d[F.znacka]) === String(inp.znackaId))
      : deals

    if (!filtered.length && inp.znackaId) filtered = deals // fallback

    // 5. Skóre + sort
    const scored = filtered
      .map(d => ({ ...d, _score: similarity(d, inp) }))
      .filter(d => d._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 20)

    // 6. Štatistiky
    const priceStats  = stats(scored.map(d => d[F.predane_za]).filter(Boolean))
    const vykupStats  = stats(scored.map(d => d[F.vykup_za]).filter(Boolean))
    const provizStats = stats(scored.map(d => d[F.provizka]).filter(Boolean))

    // 7. Comparable deals
    const comparable = scored.slice(0, 10).map(d => ({
      id:         d.id,
      title:      d.title,
      owner:      d.owner_name,
      wonDate:    (d.won_time || '').substring(0, 10),
      km:         d[F.km]         || null,
      vykon:      d[F.vykon]      || null,
      palivo:     PALIVO[d[F.palivo]] || null,
      prevodovka: PREVODOVKA[d[F.prevodovka]] || null,
      predanZa:   d[F.predane_za] || null,
      vykupZa:    d[F.vykup_za]   || null,
      score:      d._score,
    }))

    return NextResponse.json({
      ok: true,
      autofill,
      input: {
        ...inp,
        brandName:  inp.znackaId ? ZNACKY[inp.znackaId] : null,
        palivo:     inp.palivoId ? PALIVO[inp.palivoId]  : null,
        prevodovka: inp.prevId   ? PREVODOVKA[inp.prevId]: null,
      },
      market: abMarket ? { listings: abMarket.listings, stats: abMarket.stats } : null,
      stats:  { predaj: priceStats, vykup: vykupStats, proviz: provizStats },
      comparable,
      totalFiltered: filtered.length,
      totalMatched:  scored.length,
    })
  } catch (err) {
    console.error('[kalkulacka]', err)
    return NextResponse.json({ error: 'Interná chyba servera' }, { status: 500 })
  }
}

// ── GET: enumerácie pre formulár ────────────────────────────────
export async function GET() {
  return NextResponse.json({
    znacky:     Object.entries(ZNACKY).map(([id, name]) => ({ id: parseInt(id), name })).sort((a,b) => a.name.localeCompare(b.name)),
    paliva:     Object.entries(PALIVO).map(([id, name]) => ({ id: parseInt(id), name })),
    prevodovky: Object.entries(PREVODOVKA).filter(([,n]) => n !== '—').map(([id, name]) => ({ id: parseInt(id), name })),
  })
}
