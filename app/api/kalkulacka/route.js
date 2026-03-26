import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

// Cache pre autobazar.eu scraping — rovnaká URL sa nebude fetchovať viackrát za 2 hodiny
// Toto znižuje frekvenciu requestov → nižšie riziko blokovania
const getCachedAutobazarData = (url) =>
  unstable_cache(
    () => scrapeAutobazarInternal(url),
    [`autobazar-${url}`],
    { revalidate: 7200, tags: ['autobazar'] } // 2 hodiny
  )()

// ── Pipedrive field keys ────────────────────────────────────────
const F = {
  znacka:        'c5d33ca43498a4e3e0e90dc8e1cfa3944107290d',
  model:         '40ae61427f898087ee54a8ee06ce2b5311079a2b',
  km:            'b8fe1deaac2bd1dace60c545c248c6a2f98e3a52',
  vykon:         '2f9dfecf996dfe8534ea1bf7f66baa8168c4e408',
  palivo:        'b443ce5a8f885638f2f749d7be7c90e200bf8155',
  predane_za:    'a259a3e33801fbbd38f47fec09eec01ab6680023',
  vykup_za:      '7f4a915f993bc7cfb5aaaf0804ec54f83be6ccc6',
  odp_autorro:   'b4d54b0e06789b713abe1062178c19490259e00a',
  odp_makler:    'be22b659e743dc6999971965c384c727f3b1f35b',
  provizka:      '3c229676e9af562e9df014540cc1617eccf9b0cb',
}

// ── Značka ID → názov ──────────────────────────────────────────
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
// Reverzná mapa: lowercase → id
const ZNACKY_REV = Object.fromEntries(
  Object.entries(ZNACKY).map(([id, name]) => [name.toLowerCase().replace(/[^a-z0-9]/g,''), parseInt(id)])
)

const PALIVO = { 233:'Benzín+CNG',234:'Diesel',235:'Benzín+LPG',236:'LPG',237:'CNG',238:'Hybrid',239:'Elektro',240:'Diesel+HEV',241:'Benzín+HEV',242:'Iné',244:'Benzín' }

// ── Parsovanie URL slugu → brand/model hint ────────────────────
function parseSlug(url) {
  try {
    const u = new URL(url)
    const isAutobazar = u.hostname.includes('autobazar')
    const isBazos     = u.hostname.includes('bazos')

    // autobazar.eu: /detail/[slug]/[ID]/
    // bazos.sk:     /inzerat/[ID]/[slug].php
    let slug = ''
    if (isAutobazar) {
      const parts = u.pathname.split('/').filter(Boolean)
      slug = parts[1] || parts[0] || ''
    } else if (isBazos) {
      const parts = u.pathname.split('/').filter(Boolean)
      slug = (parts[2] || '').replace('.php','')
    } else {
      slug = u.pathname.split('/').filter(Boolean).join('-')
    }

    const tokens = slug.toLowerCase().split('-').filter(t => t.length > 1)
    if (!tokens.length) return null

    // Nájdi značku — porovnaj prvé 1-3 tokeny so zoznamom značiek
    let znackaId = null
    let brandTokens = 0
    for (let n = 3; n >= 1; n--) {
      const candidate = tokens.slice(0, n).join('').replace(/[^a-z0-9]/g,'')
      if (ZNACKY_REV[candidate] !== undefined) {
        znackaId = ZNACKY_REV[candidate]
        brandTokens = n
        break
      }
    }
    const brandName = znackaId ? ZNACKY[znackaId] : tokens[0]
    // Model = ďalšie 1-2 tokeny po značke
    const modelTokens = tokens.slice(brandTokens, brandTokens + 2)
    const model = modelTokens.join(' ')

    return { znackaId, brandName, model, slug, isAutobazar, isBazos }
  } catch {
    return null
  }
}

// ── Scraping autobazar.eu cez __NEXT_DATA__ ────────────────────
// Autobazar.eu vždy vracia search results pre model v __NEXT_DATA__ —
// toto je náš "bypass" bot ochrany: nevyžaduje JS, len HTML + JSON parse.
// Interná funkcia — volaj cez getCachedAutobazarData() pre caching
async function scrapeAutobazarInternal(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sk-SK,sk;q=0.9,cs;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()

    // Extrahuj __NEXT_DATA__ JSON
    const nd = html.match(/id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!nd) return null
    const pageData = JSON.parse(nd[1])
    const trpc = pageData?.props?.pageProps?.trpcState?.queries || []

    // Nájdi search records (obsahujú aktuálne inzeráty podobného modelu)
    let records = []
    for (const q of trpc) {
      const data = q?.state?.data
      if (data?.data && Array.isArray(data.data) && data.data[0]?.price) {
        records = data.data
        break
      }
    }

    if (!records.length) return null

    // Extrahuj kľúčové polia z prvého záznamu (model info)
    const first = records[0]
    const marketListings = records.map(r => ({
      title:    r.title,
      price:    r.price || r.finalPrice || r.priceCurrent,
      km:       r.mileage,
      rok:      r.yearValue,
      palivo:   r.fuelValue,
      vykon:    r.enginePower,
      brand:    r.brandValue,
      model:    r.carModelValue,
    })).filter(r => r.price > 0)

    // Štatistiky trhu
    const prices = marketListings.map(r => r.price)
    const marketStats = stats(prices)

    return {
      brand:    first.brandValue,
      model:    first.carModelValue,
      marketListings: marketListings.slice(0, 20),
      marketStats,
    }
  } catch (e) {
    console.error('[scrapeAutobazar]', e.message)
    return null
  }
}

// ── Scraping bazoš.sk ──────────────────────────────────────────
async function scrapeBazos(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    })
    const html = await res.text()
    // Bazoš má jednoduchý HTML
    const title  = html.match(/<h1[^>]*class="[^"]*nadpis[^"]*"[^>]*>(.*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g,'').trim()
    const price  = html.match(/(\d[\d\s]*)\s*€/)?.[1]?.replace(/\s/g,'')
    const desc   = html.match(/<div[^>]*class="[^"]*popis[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]?.replace(/<[^>]+>/g,'').trim()
    const kmMatch= (desc||'').match(/(\d[\d\s]*)\s*km/i)
    const yrMatch= (title||desc||'').match(/\b(20[012]\d|199\d)\b/)
    return {
      title:  title  || null,
      price:  price  ? parseInt(price) : null,
      km:     kmMatch ? parseInt(kmMatch[1].replace(/\s/g,'')) : null,
      rok:    yrMatch ? parseInt(yrMatch[1]) : null,
    }
  } catch {
    return null
  }
}

// ── Fetch won deals z Pipedrive ────────────────────────────────
async function fetchWonDeals() {
  const BASE = `https://api.pipedrive.com/v1/deals?api_token=${process.env.PIPEDRIVE_API_TOKEN}&status=won&limit=500`
  const fields = [
    'id','title','owner_name','won_time','value',
    F.znacka, F.model, F.km, F.vykon, F.palivo,
    F.predane_za, F.vykup_za, F.odp_autorro, F.odp_makler, F.provizka,
  ].join(',')
  let all = []
  let start = 0
  while (true) {
    const res  = await fetch(`${BASE}&fields=${fields}&start=${start}`)
    const data = await res.json()
    const items = data.data || []
    all = all.concat(items)
    if (!data.additional_data?.pagination?.more_items_in_collection) break
    start += 500
  }
  return all
}

// ── Štatistiky pre pole hodnôt ──────────────────────────────────
function stats(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const median = n % 2 === 0 ? (sorted[n/2-1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)]
  const avg  = values.reduce((s, v) => s + v, 0) / n
  return { min: sorted[0], max: sorted[n-1], median: Math.round(median), avg: Math.round(avg), n }
}

// ── Skóre podobnosti ────────────────────────────────────────────
function similarity(deal, input) {
  let score = 0
  // Model (váha 50)
  if (input.model) {
    const m1 = (deal[F.model] || '').toLowerCase()
    const m2 = input.model.toLowerCase()
    if (m1 === m2) score += 50
    else if (m1.includes(m2) || m2.includes(m1)) score += 35
    else if (m1.split(' ')[0] === m2.split(' ')[0]) score += 20
  }
  // KM (váha 30) — čím bližšie, tým viac bodov
  if (input.km && deal[F.km]) {
    const ratio = Math.abs(deal[F.km] - input.km) / input.km
    if (ratio < 0.15) score += 30
    else if (ratio < 0.30) score += 20
    else if (ratio < 0.50) score += 10
  }
  // Palivo (váha 15)
  if (input.palivoId && deal[F.palivo] == input.palivoId) score += 15
  // Výkon (váha 5)
  if (input.vykon && deal[F.vykon]) {
    const diff = Math.abs(deal[F.vykon] - input.vykon)
    if (diff < 10) score += 5
    else if (diff < 20) score += 2
  }
  return score
}

// ── Hlavný handler ─────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json()
    const { url, znackaId, model, km, palivoId, vykon } = body

    // 1. Parsuj URL ak bola zadaná
    let scraped      = null
    let urlParsed    = null
    let abMarket     = null  // autobazar.eu market data
    if (url) {
      urlParsed = parseSlug(url)
      if (urlParsed?.isBazos) {
        scraped = await scrapeBazos(url)
      }
      if (urlParsed?.isAutobazar) {
        abMarket = await getCachedAutobazarData(url)
        // Doplň brand/model ak sa podarilo scrapovať
        if (abMarket && !urlParsed.znackaId) {
          // Skús matchovať brand z autobazar.eu na naše Pipedrive IDs
          const abBrand = abMarket.brand?.toLowerCase().replace(/[^a-z0-9]/g,'')
          if (abBrand && ZNACKY_REV[abBrand] !== undefined) {
            urlParsed.znackaId  = ZNACKY_REV[abBrand]
            urlParsed.brandName = ZNACKY[urlParsed.znackaId]
          }
          if (!urlParsed.model && abMarket.model) {
            urlParsed.model = abMarket.model
          }
        }
      }
    }

    const inputZnackaId = znackaId ?? urlParsed?.znackaId ?? null
    const inputModel    = (model ?? urlParsed?.model ?? '').trim()
    const inputKm       = km ?? scraped?.km ?? null
    const inputPalivoId = palivoId ?? null
    const inputVykon    = vykon ?? null

    if (!inputZnackaId && !inputModel) {
      return NextResponse.json({
        parsed: urlParsed,
        scraped,
        error: 'Nepodarilo sa určiť značku a model. Zadaj ich ručne.',
      })
    }

    // 2. Načítaj won deals
    const deals = await fetchWonDeals()

    // 3. Filtruj podľa značky
    let filtered = inputZnackaId
      ? deals.filter(d => String(d[F.znacka]) === String(inputZnackaId))
      : deals

    // 4. Ak nie sú nič — skús len podľa modelu (fallback)
    if (!filtered.length && inputZnackaId) {
      filtered = deals
    }

    // 5. Skóre podobnosti
    const scored = filtered
      .map(d => ({
        ...d,
        _score: similarity(d, { model: inputModel, km: inputKm, palivoId: inputPalivoId, vykon: inputVykon }),
      }))
      .filter(d => d._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 20) // top 20

    // 6. Štatistiky
    const predane = scored.map(d => d[F.predane_za]).filter(Boolean)
    const vykup   = scored.map(d => d[F.vykup_za]).filter(Boolean)
    const proviz  = scored.map(d => d[F.provizka]).filter(Boolean)

    const priceStats  = stats(predane)
    const vykupStats  = stats(vykup)
    const provizStats = stats(proviz)

    // 7. Formátuj comparable deals pre UI
    const comparable = scored.slice(0, 10).map(d => ({
      id:        d.id,
      title:     d.title,
      owner:     d.owner_name,
      wonDate:   (d.won_time || '').substring(0, 10),
      km:        d[F.km]         || null,
      vykon:     d[F.vykon]      || null,
      palivo:    PALIVO[d[F.palivo]] || null,
      predanZa:  d[F.predane_za] || null,
      vykupZa:   d[F.vykup_za]   || null,
      odp:       d[F.odp_autorro]|| null,
      provizka:  d[F.provizka]   || null,
      score:     d._score,
    }))

    return NextResponse.json({
      ok: true,
      parsed: urlParsed ? {
        znackaId: urlParsed.znackaId,
        brandName: urlParsed.brandName,
        model: urlParsed.model,
      } : null,
      scraped,
      market: abMarket ? {
        listings: abMarket.marketListings,
        stats:    abMarket.marketStats,
      } : null,
      input: {
        znackaId: inputZnackaId,
        brandName: inputZnackaId ? ZNACKY[inputZnackaId] : null,
        model: inputModel,
        km: inputKm,
        palivoId: inputPalivoId,
        palivo: inputPalivoId ? PALIVO[inputPalivoId] : null,
        vykon: inputVykon,
      },
      stats: {
        predaj: priceStats,
        vykup:  vykupStats,
        proviz: provizStats,
      },
      comparable,
      totalFiltered: filtered.length,
      totalMatched: scored.length,
    })
  } catch (err) {
    console.error('[kalkulacka]', err)
    return NextResponse.json({ error: 'Interná chyba servera' }, { status: 500 })
  }
}

// ── GET — vráti enumerácie pre formulár ─────────────────────────
export async function GET() {
  return NextResponse.json({
    znacky: Object.entries(ZNACKY).map(([id, name]) => ({ id: parseInt(id), name })).sort((a,b) => a.name.localeCompare(b.name)),
    paliva: Object.entries(PALIVO).map(([id, name]) => ({ id: parseInt(id), name })),
  })
}
