import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

// ── Pipedrive field keys ─────────────────────────────────────────
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

// ── Enumerácie ───────────────────────────────────────────────────
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
// Normalizácia s diakritikou → ASCII (Škoda→skoda, Citroën→citroen, ...)
function normSlug(s) {
  return s.toLowerCase()
    .replace(/[šŠ]/g,'s').replace(/[čČ]/g,'c').replace(/[žŽ]/g,'z')
    .replace(/[áÁ]/g,'a').replace(/[éÉ]/g,'e').replace(/[íÍ]/g,'i')
    .replace(/[óÓ]/g,'o').replace(/[úÚ]/g,'u').replace(/[ä]/g,'a')
    .replace(/[ëë]/g,'e').replace(/[üÜ]/g,'u').replace(/[öÖ]/g,'o')
    .replace(/[ñÑ]/g,'n')
    .replace(/[^a-z0-9]/g,'')
}
const ZNACKY_REV = Object.fromEntries(
  Object.entries(ZNACKY).map(([id, name]) => [normSlug(name), parseInt(id)])
)
const PALIVO = {
  233:'Benzín+CNG',234:'Diesel',235:'Benzín+LPG',236:'LPG',237:'CNG',
  238:'Hybrid',239:'Elektro',240:'Diesel+HEV',241:'Benzín+HEV',242:'Iné',244:'Benzín',
}
const PREVODOVKA = {
  223:'CVT',224:'AT/9',225:'AT/8',226:'AT/7',227:'AT/6',
  228:'Manuálna',229:'Automatická',230:'—',231:'MT/6',232:'MT/5',
}

// Mapovanie znackaId → autobazar.eu SEF slug pre search URL
const AB_BRAND_SEF = {
  122:'alfa-romeo',123:'alpina',125:'aston-martin',126:'audi',129:'bentley',
  130:'bmw',133:'cadillac',134:'chevrolet',135:'chrysler',136:'citroen',
  137:'cupra',138:'daewoo',972:'dacia',141:'dodge',142:'ds',143:'ferrari',
  144:'fiat',146:'ford',149:'honda',151:'hyundai',152:'infiniti',
  155:'jaguar',156:'jeep',159:'kia',160:'lada',161:'lamborghini',
  163:'land-rover',164:'lexus',166:'lotus',169:'maserati',170:'mazda',
  171:'mclaren',172:'mercedes-benz',173:'mg',174:'mini',175:'mitsubishi',
  176:'nissan',177:'opel',178:'peugeot',180:'porsche',181:'renault',
  184:'saab',185:'seat',186:'skoda',187:'smart',188:'ssangyong',
  189:'subaru',190:'suzuki',192:'tesla',193:'toyota',196:'volkswagen',
  197:'volvo',995:'polestar',
}

// ── Mappery: autobazar.eu string → naše enum ID ──────────────────
function mapAbPalivo(s) {
  if (!s) return null
  const p = s.toLowerCase()
  if (p.includes('diesel'))                              return 234
  if (p.includes('benzín') || p.includes('benzin'))     return 244
  if (p.includes('plug') || p.includes('phev'))         return 241
  if (p.includes('hybrid'))                             return 238
  if (p.includes('elektr') || p.includes('bev'))        return 239
  if (p.includes('lpg'))                                return 235
  if (p.includes('cng'))                                return 237
  return null
}

function mapAbGearbox(s) {
  if (!s) return null
  const g = s.toLowerCase()
  if (g.includes('automat') || g.includes('dsg')   ||
      g.includes('tronic')  || g.includes('pdk')   ||
      g.includes('cvt')     || g.includes('tiptronic')) return 229
  if (g.includes('manu') || g.includes('mecht') || g.includes('mechanick')) return 228
  return null
}

// ── Parsovanie URL slugu ─────────────────────────────────────────
function parseSlug(url) {
  try {
    const u     = new URL(url)
    const isAB  = u.hostname.includes('autobazar')
    const isBZ  = u.hostname.includes('bazos')
    const parts = u.pathname.split('/').filter(Boolean)

    let slug = ''
    if (isAB)      slug = parts[1] || parts[0] || ''
    else if (isBZ) slug = (parts[2] || '').replace('.php', '')
    else           slug = parts.join('-')

    const tokens = slug.toLowerCase()
    const tArr   = tokens.split(/[-_\s]+/).filter(t => t.length > 0)

    // Značka — skús 1-3 tokeny, normalizuj diakritiku pre porovnanie
    let znackaId = null, brandTokens = 0, brandSlug = null
    for (let n = 3; n >= 1; n--) {
      const cand = normSlug(tArr.slice(0, n).join(''))
      if (ZNACKY_REV[cand] !== undefined) {
        znackaId  = ZNACKY_REV[cand]
        brandSlug = tArr.slice(0, n).join('-')   // napr. "mercedes-benz"
        brandTokens = n
        break
      }
    }
    const brandName = znackaId ? ZNACKY[znackaId] : null

    // Model — tokeny po značke, kým nenarazíme na technický token
    const SPEC = new Set([
      'tdi','tdci','crdi','cdi','cdti','tgi','dci',           // diesel
      'tsi','tfsi','gdi','t-gdi','gtdi','petrol',             // benzín
      'phev','mhev','hev','hybrid','ev','bev','elektro',      // alternativa
      'lpg','cng',                                            // plyn
      'dsg','pdk','cvt','tronic','tiptronic','dct','tct',     // prevodovka
      'at','mt','awd','4wd','4x4','fwd','rwd',                // pohon/prevod
    ])
    const isSpecToken = t =>
      SPEC.has(t)               ||
      /^(19|20)\d{2}$/.test(t) ||   // rok
      /^\d+$/.test(t)          ||   // číslo (kW, rok, ...)
      /^\d+kw$/.test(t)        ||   // "110kw"
      /^[a-z]{1,3}\d+/.test(t)      // ID ako "lx30k", "ab123", "rs3", "c220"

    const modelTokens = []
    for (let i = brandTokens; i < tArr.length; i++) {
      const t = tArr[i]
      if (isSpecToken(t) || t.length <= 1) break
      modelTokens.push(t)
      if (modelTokens.length >= 3) break
    }
    const modelSlug = modelTokens.join('-')           // "octavia-combi"
    const model     = modelTokens.join(' ')           // "octavia combi"

    // Rok
    const rokMatch = tokens.match(/\b(19\d{2}|20[012]\d)\b/)
    const rok      = rokMatch ? parseInt(rokMatch[1]) : null

    // Výkon kW — zachytí "110kw", "110 kw", "110-kw"
    const kWMatch  = tokens.match(/\b(\d{2,3})[\s-]*kw\b/)
    const vykon    = kWMatch ? parseInt(kWMatch[1]) : null

    // Palivo z kódu motora
    let palivoId = null
    if      (/\b(tdi|tdci|crdi|cdi|cdti|tgi|dci)\b/.test(tokens))     palivoId = 234
    else if (/\b(tsi|tfsi|gdi|t-gdi|gtdi|petrol|benzin)\b/.test(tokens)) palivoId = 244
    else if (/\b(phev|plug.?in)\b/.test(tokens))                        palivoId = 241
    else if (/\bhybrid\b/.test(tokens))                                 palivoId = 238
    else if (/\b(bev|elektro|ev|electric)\b/.test(tokens))             palivoId = 239

    // Prevodovka — dsg7/dsg6/dsg, xtronic, s-tronic, 7-dct, pdk, cvt, automat...
    let prevId = null
    if      (/\b(dsg\d?|[a-z]-?tronic\d?|dct\d?|tct\d?|pdk|cvt\d?|tiptronic|automat(icka)?)\b/.test(tokens)) prevId = 229
    else if (/\b(manualna|manual|mechanick|6mt|5mt)\b/.test(tokens))                                           prevId = 228

    return { znackaId, brandName, brandSlug, modelSlug, model, rok, vykon, palivoId, prevId, isAutobazar: isAB, isBazos: isBZ }
  } catch { return null }
}

// ── Autobazar.eu search URL ──────────────────────────────────────
// Správna URL schéma: /vysledky/osobne-vozidla/{brandSef}/{modelSef}/
function buildABSearchUrl(brandSef, modelSef) {
  if (!brandSef) return null
  const base = `https://www.autobazar.eu/vysledky/osobne-vozidla/${brandSef}/`
  return modelSef ? `${base}${modelSef}/` : base
}

// ── Autobazar.eu: scraping __NEXT_DATA__ z listing/search stránky ─
async function scrapeABPage(url, hintKw, hintFuel, hintRok) {
  try {
    const res  = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sk-SK,sk;q=0.9,cs;q=0.8',
        'Referer':         'https://www.autobazar.eu/',
      },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) { console.error('[scrapeAB]', url, res.status); return null }

    const html = await res.text()
    const nd   = html.match(/id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!nd) { console.error('[scrapeAB] no __NEXT_DATA__', url); return null }

    const trpc    = JSON.parse(nd[1])?.props?.pageProps?.trpcState?.queries || []
    let records   = []
    for (const q of trpc) {
      const d = q?.state?.data
      if (d?.data && Array.isArray(d.data) && d.data.length > 0 && d.data[0]?.price != null) {
        records = d.data; break
      }
    }
    if (!records.length) { console.error('[scrapeAB] no records', url); return null }

    const listings = records.map(r => ({
      id:         r.id,
      title:      r.title || '',
      price:      r.finalPrice || r.price || 0,
      km:         r.mileage   != null ? r.mileage   : null,
      rok:        r.yearValue  != null ? parseInt(r.yearValue) : null,
      palivo:     r.fuelValue  || null,
      palivoId:   mapAbPalivo(r.fuelValue),
      vykon:      r.enginePower != null ? r.enginePower : null,
      prevodovka: r.gearboxValue || null,
      prevId:     mapAbGearbox(r.gearboxValue),
      brand:      r.brandValue  || null,
      model:      r.carModelValue || null,
    })).filter(r => r.price > 0)

    if (!listings.length) return null

    // ── Smart match: nájdi inzerát najbližší k nášmu ─────────────
    let bestMatch = null, bestScore = -1
    for (const r of listings) {
      let score = 0
      // kW
      if (hintKw && r.vykon != null)
        score += Math.max(0, 40 - Math.abs(r.vykon - hintKw) * 2)
      // palivo
      if (hintFuel && r.palivoId === hintFuel) score += 30
      // rok
      if (hintRok && r.rok != null)
        score += Math.max(0, 20 - Math.abs(r.rok - hintRok) * 4)

      if (score > bestScore) { bestScore = score; bestMatch = r }
    }
    if (!bestMatch) bestMatch = listings[0]

    // ── Filtered stats: relevantné inzeráty pre daný rok + palivo ─
    const filtered = listings.filter(r => {
      const rokOk  = !hintRok  || !r.rok      || Math.abs(r.rok - hintRok) <= 2
      const fuelOk = !hintFuel || !r.palivoId || r.palivoId === hintFuel
      return rokOk && fuelOk
    })

    return {
      brand:         records[0]?.brandValue     || null,
      model:         records[0]?.carModelValue  || null,
      matched:       bestMatch,
      listings:      listings.slice(0, 20),
      stats:         calcStats(listings.map(r => r.price)),
      filteredStats: calcStats(filtered.map(r => r.price)),
      filteredCount: filtered.length,
    }
  } catch (e) {
    console.error('[scrapeABPage]', url, e.message)
    return null
  }
}

// Cache 2 hodiny — ochrana pred IP blokovaním
const getCachedAB = (url, kw, fuel, rok) =>
  unstable_cache(
    () => scrapeABPage(url, kw, fuel, rok),
    [`ab3-${url}-${kw}-${fuel}-${rok}`],
    { revalidate: 7200, tags: ['autobazar'] }
  )()

// ── Autobazar.eu: detail stránky → props.pageProps.advertisement ─
// Obsahuje PRESNÉ dáta konkrétneho inzerátu (nie odhad zo 20 podobných)
async function scrapeABDetail(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sk-SK,sk;q=0.9,cs;q=0.8',
        'Referer':         'https://www.autobazar.eu/',
      },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const nd   = html.match(/id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!nd) return null

    const parsed = JSON.parse(nd[1])

    // 1. Priamy prístup — props.pageProps.advertisement (najspoľahlivejší)
    const ad = parsed?.props?.pageProps?.advertisement
    if (ad?.mileage != null || ad?.yearValue != null) {
      return mapAdRecord(ad)
    }

    // 2. Fallback — tRPC query "record.findById" (query[0].state.data)
    const trpc = parsed?.props?.pageProps?.trpcState?.queries || []
    for (const q of trpc) {
      const d = q?.state?.data
      if (d && !Array.isArray(d) && (d.mileage != null || d.yearValue != null)) {
        return mapAdRecord(d)
      }
    }
    return null
  } catch (e) {
    console.error('[scrapeABDetail]', e.message)
    return null
  }
}

function mapAdRecord(r) {
  return {
    km:         r.mileage       ?? null,
    rok:        r.yearValue     ? parseInt(r.yearValue) : null,
    palivo:     r.fuelValue     || null,
    palivoId:   mapAbPalivo(r.fuelValue),
    vykon:      r.enginePower   ?? null,
    prevodovka: r.gearboxValue  || null,
    prevId:     mapAbGearbox(r.gearboxValue),
    price:      r.finalPrice    || r.price || null,
    title:      r.title         || null,
    brand:      r.brandValue    || null,
    model:      r.carModelValue || null,
  }
}

// Cache 30 min pre detail stránky
const getCachedABDetail = (url) =>
  unstable_cache(
    () => scrapeABDetail(url),
    [`ab-detail-${url}`],
    { revalidate: 1800, tags: ['autobazar-detail'] }
  )()

// ── Bazoš.sk scraping ───────────────────────────────────────────
async function scrapeBazos(url) {
  try {
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    })
    const html  = await res.text()
    const title = html.match(/<h1[^>]*class="[^"]*nadpis[^"]*"[^>]*>(.*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g,'').trim()
    const desc  = html.match(/<div[^>]*class="[^"]*popis[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]?.replace(/<[^>]+>/g,'').trim() || ''
    const km    = desc.match(/(\d[\d\s]*)\s*km/i)?.[1]?.replace(/\s/g,'')
    const rok   = (title || desc).match(/\b(20[012]\d|199\d)\b/)?.[1]
    const kw    = (title || desc).match(/(\d{2,3})\s*kw/i)?.[1]
    const price = html.match(/(\d[\d\s]*)\s*€/)?.[1]?.replace(/\s/g,'')
    return {
      title: title || null,
      price: price ? parseInt(price) : null,
      km:    km    ? parseInt(km)    : null,
      rok:   rok   ? parseInt(rok)   : null,
      vykon: kw    ? parseInt(kw)    : null,
    }
  } catch { return null }
}

// ── Pipedrive: načítaj vyhrané dealy ────────────────────────────
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

// ── Štatistiky ──────────────────────────────────────────────────
function calcStats(values) {
  const v = values.filter(x => x != null && x > 0)
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

// ── Podobnosť: Pipedrive deal vs. vstup ─────────────────────────
function similarity(deal, input) {
  // Model MUSÍ nejakým spôsobom sedieť
  if (!input.model) return 0
  const m1 = (deal[F.model] || '').toLowerCase().trim()
  const m2 = input.model.toLowerCase().trim()
  if (!m1) return 0

  let score = 0
  // Model (50 pts)
  if (m1 === m2)                                    score += 50
  else if (m1.includes(m2) || m2.includes(m1))     score += 35
  else if (m1.split(/\s+/)[0] === m2.split(/\s+/)[0]) score += 20
  else return 0 // žiadna model zhoda → vylúčiť

  // KM (25 pts)
  if (input.km && deal[F.km]) {
    const r = Math.abs(deal[F.km] - input.km) / input.km
    if      (r < 0.15) score += 25
    else if (r < 0.30) score += 15
    else if (r < 0.50) score += 8
  }
  // Rok (20 pts) — z titulky dealу
  if (input.rok) {
    const rokM = (deal.title || '').match(/\b(19\d{2}|20[012]\d)\b/)
    if (rokM) {
      const diff = Math.abs(parseInt(rokM[1]) - input.rok)
      if      (diff === 0) score += 20
      else if (diff <= 1)  score += 14
      else if (diff <= 2)  score += 8
      else if (diff <= 3)  score += 3
    }
  }
  // Palivo (10 pts)
  if (input.palivoId && deal[F.palivo]) {
    if (String(deal[F.palivo]) === String(input.palivoId)) score += 10
  }
  // Prevodovka (10 pts)
  if (input.prevId && deal[F.prevodovka]) {
    const dPrev = parseInt(deal[F.prevodovka])
    const isAuto   = [229,224,225,226,227,223].includes(dPrev)
    const isManual = [228,231,232].includes(dPrev)
    const wantAuto = [229,224,225,226,227,223].includes(input.prevId)
    if ((isAuto && wantAuto) || (isManual && !wantAuto)) score += 10
  }
  // Výkon (5 pts)
  if (input.vykon && deal[F.vykon]) {
    const d = Math.abs(deal[F.vykon] - input.vykon)
    if (d < 10) score += 5; else if (d < 25) score += 2
  }
  return score
}

// ── Autofill: parse URL + scrape → autofill objekt ──────────────
async function resolveAutofill(url, hintKm, hintRok, hintPalivoId, hintPrevId, hintVykon) {
  let parsed   = null
  let abData   = null   // trhové dáta (20 podobných) pre pricing
  let detail   = null   // presné dáta konkrétneho inzerátu pre autofill
  let bazos    = null

  if (url) {
    parsed = parseSlug(url)

    if (parsed?.isAutobazar) {
      const kw   = parsed.vykon    || hintVykon
      const fuel = parsed.palivoId || hintPalivoId
      const rok  = parsed.rok      || hintRok

      // Paralelne: detail stránka (presné dáta) + search stránka (trhové dáta)
      const brandSef  = parsed.brandSlug || AB_BRAND_SEF[parsed.znackaId]
      const searchUrl = buildABSearchUrl(brandSef, parsed.modelSlug)

      ;[detail, abData] = await Promise.all([
        getCachedABDetail(url),
        searchUrl ? getCachedAB(searchUrl, kw, fuel, rok) : Promise.resolve(null),
      ])

      // Dopl brand/model z dát ak slug nestačil
      const brandFromData = detail?.brand || abData?.brand
      if (brandFromData && !parsed.znackaId) {
        const k = normSlug(brandFromData)
        if (ZNACKY_REV[k] !== undefined) {
          parsed.znackaId  = ZNACKY_REV[k]
          parsed.brandName = ZNACKY[parsed.znackaId]
        }
      }
      if (!parsed.model) parsed.model = detail?.model || abData?.model || null
    }

    if (parsed?.isBazos) {
      bazos = await scrapeBazos(url)
    }
  }

  const znackaId = parsed?.znackaId ?? null

  // Autofill priority:
  //   km/rok/palivo/prevodovka/kW: detail page (presné) > bazos > slug
  //   brand/model: detail page > slug
  const palivoId = parsed?.palivoId ?? detail?.palivoId ?? mapAbPalivo(abData?.matched?.palivo) ?? null
  const prevId   = parsed?.prevId   ?? detail?.prevId   ?? mapAbGearbox(abData?.matched?.prevodovka) ?? null

  return {
    parsed, abData, detail, bazos,
    autofill: {
      znackaId,
      brandName:  znackaId ? ZNACKY[znackaId] : null,
      model:      parsed?.model  ?? detail?.model ?? abData?.model ?? null,
      // Presné dáta z konkrétneho inzerátu (detail) majú najvyššiu prioritu
      rok:        parsed?.rok    ?? detail?.rok   ?? abData?.matched?.rok  ?? bazos?.rok   ?? null,
      km:         detail?.km     ?? abData?.matched?.km                    ?? bazos?.km    ?? null,
      palivoId,
      prevId,
      vykon:      parsed?.vykon  ?? detail?.vykon ?? abData?.matched?.vykon ?? bazos?.vykon ?? null,
      source: url
        ? (parsed?.isAutobazar ? 'autobazar' : parsed?.isBazos ? 'bazos' : 'slug')
        : null,
    },
  }
}

// ── POST handler ─────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json()
    const { url, znackaId, model, km, rok, palivoId, prevId, vykon, autofillOnly } = body

    // 1. Parsuj URL + scrape → autofill
    const { parsed, abData: abFromUrl, bazos, autofill } =
      await resolveAutofill(url, km, rok, palivoId, prevId, vykon)

    if (autofillOnly) return NextResponse.json({ autofill })

    // 2. Zlúč vstupy (form hodnoty majú prednosť pred autofillom)
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
      return NextResponse.json({
        autofill,
        error: 'Nepodarilo sa určiť značku a model. Zadaj ich ručne.',
      })
    }

    // 3. Autobazar.eu trhové dáta
    // Ak URL nebola zadaná (manuálny vstup), skúsime nájsť trhové dáta sami
    let abMarket = abFromUrl
    if (!abMarket && inp.znackaId) {
      const brandSef  = AB_BRAND_SEF[inp.znackaId]
      const modelSef  = inp.model
        ? inp.model.toLowerCase().replace(/[^\w]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
        : null
      const searchUrl = buildABSearchUrl(brandSef, modelSef)
      if (searchUrl) {
        abMarket = await getCachedAB(searchUrl, inp.vykon, inp.palivoId, inp.rok)
      }
    }

    // 4. Pipedrive — načítaj vyhrané dealy
    const deals = await fetchWonDeals()

    // 5. Filtruj podľa značky + vyhodnoť podobnosť (similarity vyžaduje model zhodu)
    const byBrand = inp.znackaId
      ? deals.filter(d => String(d[F.znacka]) === String(inp.znackaId))
      : deals

    const scored = byBrand
      .map(d => ({ ...d, _score: similarity(d, inp) }))
      .filter(d => d._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 20)

    // 6. Štatistiky z Pipedrive histórie
    const histPredaj = calcStats(scored.map(d => d[F.predane_za]).filter(Boolean))
    const histVykup  = calcStats(scored.map(d => d[F.vykup_za]).filter(Boolean))
    const histProviz = calcStats(scored.map(d => d[F.provizka]).filter(Boolean))

    // 7. Odporúčané ceny
    //    Predajná: z autobazar.eu filteredStats (aktuálny trh, rok±2, rovnaké palivo)
    //    Výkupná:  z trhovej ceny * historická marža z Pipedrive (fallback 82%)
    const marketMedian  = abMarket?.filteredStats?.median ?? abMarket?.stats?.median ?? null
    const marginRatio   = (histPredaj?.median && histVykup?.median)
      ? histVykup.median / histPredaj.median
      : 0.82  // default 18% marža

    const recPredaj = marketMedian   ?? histPredaj?.median ?? null
    const recVykup  = recPredaj      ? Math.round(recPredaj * marginRatio) : histVykup?.median ?? null

    // 8. Comparable deals pre tabuľku
    const comparable = scored.slice(0, 10).map(d => ({
      id:         d.id,
      title:      d.title,
      owner:      d.owner_name,
      wonDate:    (d.won_time || '').substring(0, 10),
      km:         d[F.km]         || null,
      vykon:      d[F.vykon]      || null,
      palivo:     PALIVO[d[F.palivo]]        || null,
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
        brandName:  inp.znackaId ? ZNACKY[inp.znackaId]   : null,
        palivo:     inp.palivoId ? PALIVO[inp.palivoId]    : null,
        prevodovka: inp.prevId   ? PREVODOVKA[inp.prevId]  : null,
      },

      // Odporúčané ceny (hlavný výsledok)
      recommended: {
        predaj:       recPredaj,
        vykup:        recVykup,
        marginRatio:  Math.round(marginRatio * 100),
        source:       marketMedian ? 'market' : 'history',
      },

      // Trhové dáta z autobazar.eu
      market: abMarket ? {
        listings:      abMarket.listings,
        stats:         abMarket.stats,          // všetky inzeráty
        filteredStats: abMarket.filteredStats,  // rok±2 + rovnaké palivo
        filteredCount: abMarket.filteredCount,
      } : null,

      // Pipedrive história (referencia)
      history: {
        predaj: histPredaj,
        vykup:  histVykup,
        proviz: histProviz,
      },

      // Spätná kompatibilita (page.js stats)
      stats: {
        predaj: histPredaj,
        vykup:  histVykup,
        proviz: histProviz,
      },

      comparable,
      totalFiltered: byBrand.length,
      totalMatched:  scored.length,
    })
  } catch (err) {
    console.error('[kalkulacka POST]', err)
    return NextResponse.json({ error: 'Interná chyba servera' }, { status: 500 })
  }
}

// ── GET: enumerácie pre formulár ────────────────────────────────
export async function GET() {
  return NextResponse.json({
    znacky:     Object.entries(ZNACKY)
      .map(([id, name]) => ({ id: parseInt(id), name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'sk')),
    paliva:     Object.entries(PALIVO)
      .map(([id, name]) => ({ id: parseInt(id), name })),
    prevodovky: Object.entries(PREVODOVKA)
      .filter(([, n]) => n !== '—')
      .map(([id, name]) => ({ id: parseInt(id), name })),
  })
}
