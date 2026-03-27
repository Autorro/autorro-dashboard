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
  evidencia:   'e4eb52fb66a6111543f74a35bbc6aa8eb462c3bd',
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

// ── Generation database ──────────────────────────────────────────
// Format: [fromYear, fromMonth|null, toYear, toMonth|null, genName]
// month: 1=Jan … 12=Dec, null = celý rok
const GENERATIONS = {
  'skoda-octavia': [
    [1996,null,2000,null,'I'],[2000,null,2004,null,'I FL'],
    [2004,null,2008,null,'II'],[2008,null,2013,null,'II FL'],
    [2013,null,2017,6,'III'],[2017,7,2020,null,'III FL'],[2020,null,2035,null,'IV'],
  ],
  'skoda-fabia': [
    [1999,null,2004,null,'I'],[2004,null,2007,null,'I FL'],
    [2007,null,2010,null,'II'],[2010,null,2014,null,'II FL'],
    [2014,null,2018,null,'III'],[2018,null,2021,null,'III FL'],[2021,null,2035,null,'IV'],
  ],
  'skoda-superb': [
    [2001,null,2008,null,'I'],
    [2008,null,2013,null,'II'],[2013,null,2015,null,'II FL'],
    [2015,null,2019,null,'III'],[2019,null,2023,null,'III FL'],[2023,null,2035,null,'IV'],
  ],
  'skoda-rapid':  [[2012,null,2017,null,'I'],[2017,null,2019,null,'I FL'],[2019,null,2035,null,'II']],
  'skoda-scala':  [[2018,null,2035,null,'I']],
  'skoda-kodiaq': [[2016,null,2021,null,'I'],[2021,null,2023,null,'I FL'],[2023,null,2035,null,'II']],
  'skoda-karoq':  [[2017,null,2021,null,'I'],[2021,null,2035,null,'I FL']],
  'skoda-kamiq':  [[2019,null,2035,null,'I']],
  'skoda-yeti':   [[2009,null,2013,null,'I'],[2013,null,2017,null,'I FL']],
  'volkswagen-golf': [
    [2008,null,2012,null,'VI'],
    [2012,null,2017,6,'VII'],[2017,7,2019,null,'VII FL'],[2019,null,2035,null,'VIII'],
  ],
  'volkswagen-polo':   [[2009,null,2014,null,'V (6R)'],[2014,null,2017,null,'V FL (6C)'],[2017,null,2035,null,'VI']],
  'volkswagen-passat': [[2005,null,2010,null,'B6'],[2010,null,2014,null,'B7'],[2014,null,2019,null,'B8'],[2019,null,2035,null,'B8 FL']],
  'volkswagen-tiguan': [[2007,null,2011,null,'I'],[2011,null,2016,null,'I FL'],[2016,null,2020,null,'II'],[2020,null,2035,null,'II FL']],
  'volkswagen-touran': [[2003,null,2006,null,'I'],[2006,null,2015,null,'I FL'],[2015,null,2019,null,'II'],[2019,null,2035,null,'II FL']],
  'volkswagen-t-roc':  [[2017,null,2021,null,'I'],[2021,null,2035,null,'I FL']],
  'audi-a3': [
    [2003,null,2008,null,'8P'],[2008,null,2012,null,'8P FL'],
    [2012,null,2016,null,'8V'],[2016,null,2020,null,'8V FL'],[2020,null,2035,null,'8Y'],
  ],
  'audi-a4': [[2007,null,2011,null,'B8'],[2011,null,2015,null,'B8 FL'],[2015,null,2019,null,'B9'],[2019,null,2035,null,'B9 FL']],
  'audi-a5': [[2007,null,2011,null,'8T'],[2011,null,2016,null,'8T FL'],[2016,null,2020,null,'F5'],[2020,null,2035,null,'F5 FL']],
  'audi-a6': [[2004,null,2008,null,'C6'],[2008,null,2011,null,'C6 FL'],[2011,null,2014,null,'C7'],[2014,null,2018,null,'C7 FL'],[2018,null,2035,null,'C8']],
  'audi-q3': [[2011,null,2014,null,'8U'],[2014,null,2018,null,'8U FL'],[2018,null,2035,null,'F3']],
  'audi-q5': [[2008,null,2012,null,'8R'],[2012,null,2017,null,'8R FL'],[2017,null,2035,null,'FY']],
  'audi-q7': [[2006,null,2009,null,'4L'],[2009,null,2015,null,'4L FL'],[2015,null,2035,null,'4M']],
  'bmw-1': [
    [2004,null,2007,null,'E87'],[2007,null,2011,null,'E87 FL'],
    [2011,null,2015,null,'F20'],[2015,null,2019,null,'F20 FL'],[2019,null,2035,null,'F40'],
  ],
  'bmw-3': [
    [2005,null,2008,null,'E90'],[2008,null,2012,null,'E90 FL'],
    [2012,null,2015,null,'F30'],[2015,null,2019,null,'F30 FL'],[2019,null,2035,null,'G20'],
  ],
  'bmw-5': [
    [2003,null,2007,null,'E60'],[2007,null,2010,null,'E60 FL'],
    [2010,null,2013,null,'F10'],[2013,null,2017,null,'F10 FL'],[2017,null,2035,null,'G30'],
  ],
  'bmw-x1': [[2009,null,2012,null,'E84'],[2012,null,2015,null,'E84 FL'],[2015,null,2019,null,'F48'],[2019,null,2022,null,'F48 FL'],[2022,null,2035,null,'U11']],
  'bmw-x3': [[2003,null,2010,null,'E83'],[2010,null,2017,null,'F25'],[2017,null,2035,null,'G01']],
  'bmw-x5': [[2000,null,2006,null,'E53'],[2006,null,2013,null,'E70'],[2013,null,2018,null,'F15'],[2018,null,2035,null,'G05']],
  'mercedes-benz-a': [
    [2004,null,2008,null,'W169'],[2008,null,2012,null,'W169 FL'],
    [2012,null,2015,null,'W176'],[2015,null,2018,null,'W176 FL'],[2018,null,2035,null,'W177'],
  ],
  'mercedes-benz-c': [
    [2000,null,2004,null,'W203'],[2004,null,2007,null,'W203 FL'],
    [2007,null,2011,null,'W204'],[2011,null,2014,null,'W204 FL'],
    [2014,null,2018,null,'W205'],[2018,null,2021,null,'W205 FL'],[2021,null,2035,null,'W206'],
  ],
  'mercedes-benz-e': [
    [2002,null,2006,null,'W211'],[2006,null,2009,null,'W211 FL'],
    [2009,null,2013,null,'W212'],[2013,null,2016,null,'W212 FL'],
    [2016,null,2020,null,'W213'],[2020,null,2035,null,'W213 FL'],
  ],
  'mercedes-benz-glc': [[2015,null,2019,null,'X253'],[2019,null,2022,null,'X253 FL'],[2022,null,2035,null,'X254']],
  'ford-focus':  [[2004,null,2007,null,'II'],[2007,null,2011,null,'II FL'],[2011,null,2014,null,'III'],[2014,null,2018,null,'III FL'],[2018,null,2035,null,'IV']],
  'ford-fiesta': [[2008,null,2012,null,'VI'],[2012,null,2017,null,'VI FL'],[2017,null,2035,null,'VII']],
  'ford-kuga':   [[2008,null,2012,null,'I'],[2012,null,2019,null,'II'],[2019,null,2035,null,'III']],
  'ford-mondeo': [[2007,null,2011,null,'IV'],[2011,null,2014,null,'IV FL'],[2014,null,2022,null,'V']],
  'opel-astra': [
    [2004,null,2007,null,'H'],[2007,null,2010,null,'H FL'],
    [2009,null,2012,null,'J'],[2012,null,2015,null,'J FL'],
    [2015,null,2019,null,'K'],[2019,null,2021,null,'K FL'],[2021,null,2035,null,'L'],
  ],
  'opel-insignia': [[2008,null,2013,null,'A'],[2013,null,2017,null,'A FL'],[2017,null,2035,null,'B']],
  'opel-corsa':    [[2006,null,2011,null,'D'],[2011,null,2014,null,'D FL'],[2014,null,2019,null,'E'],[2019,null,2035,null,'F']],
  'opel-mokka':    [[2012,null,2016,null,'A'],[2016,null,2020,null,'A FL'],[2020,null,2035,null,'B']],
  'renault-megane': [[2008,null,2012,null,'III'],[2012,null,2016,null,'III FL'],[2016,null,2020,null,'IV'],[2020,null,2035,null,'IV FL']],
  'renault-clio':   [[2005,null,2009,null,'III'],[2009,null,2012,null,'III FL'],[2012,null,2016,null,'IV'],[2016,null,2019,null,'IV FL'],[2019,null,2035,null,'V']],
  'renault-kadjar': [[2015,null,2019,null,'I'],[2019,null,2035,null,'I FL']],
  'renault-captur': [[2013,null,2017,null,'I'],[2017,null,2019,null,'I FL'],[2019,null,2035,null,'II']],
  'peugeot-308':  [[2007,null,2011,null,'I'],[2011,null,2013,null,'I FL'],[2013,null,2017,null,'II'],[2017,null,2021,null,'II FL'],[2021,null,2035,null,'III']],
  'peugeot-3008': [[2008,null,2013,null,'I'],[2013,null,2016,null,'I FL'],[2016,null,2020,null,'II'],[2020,null,2035,null,'II FL']],
  'peugeot-208':  [[2012,null,2015,null,'I'],[2015,null,2019,null,'I FL'],[2019,null,2035,null,'II']],
  'toyota-yaris':   [[2005,null,2011,null,'II'],[2011,null,2014,null,'III'],[2014,null,2020,null,'III FL'],[2020,null,2035,null,'IV']],
  'toyota-corolla': [[2007,null,2013,null,'X (E140)'],[2013,null,2019,null,'XI (E170)'],[2019,null,2035,null,'XII (E210)']],
  'toyota-rav4':    [[2005,null,2013,null,'III'],[2013,null,2018,null,'IV'],[2018,null,2035,null,'V']],
  'hyundai-i30':    [[2007,null,2012,null,'I'],[2012,null,2017,null,'II'],[2017,null,2020,null,'III'],[2020,null,2035,null,'III FL']],
  'hyundai-tucson': [[2004,null,2010,null,'I (JM)'],[2015,null,2018,null,'III'],[2018,null,2020,null,'III FL'],[2020,null,2035,null,'IV']],
  'kia-ceed':     [[2007,null,2012,null,'I'],[2012,null,2018,null,'II'],[2018,null,2035,null,'III']],
  'kia-sportage': [[2004,null,2010,null,'II'],[2010,null,2016,null,'III'],[2016,null,2021,null,'IV'],[2021,null,2035,null,'V']],
  'mazda-3':    [[2003,null,2009,null,'I (BK)'],[2009,null,2013,null,'II (BL)'],[2013,null,2019,null,'III (BM)'],[2019,null,2035,null,'IV (BP)']],
  'mazda-cx-5': [[2012,null,2017,null,'I'],[2017,null,2023,null,'II'],[2023,null,2035,null,'II FL']],
  'mazda-cx':   [[2012,null,2017,null,'I'],[2017,null,2023,null,'II'],[2023,null,2035,null,'II FL']],
  'honda-civic':     [[2005,null,2011,null,'VIII'],[2011,null,2015,null,'IX'],[2015,null,2021,null,'X'],[2021,null,2035,null,'XI']],
  'nissan-qashqai':  [[2006,null,2013,null,'I'],[2013,null,2021,null,'II'],[2021,null,2035,null,'III']],
  'seat-leon':   [[2005,null,2012,null,'II (1P)'],[2012,null,2017,null,'III (5F)'],[2017,null,2020,null,'III FL'],[2020,null,2035,null,'IV (KL1)']],
  'seat-ibiza':  [[2008,null,2017,null,'IV (6J)'],[2017,null,2035,null,'V (KJ1)']],
  'seat-ateca':  [[2016,null,2020,null,'I'],[2020,null,2035,null,'I FL']],
  'citroen-c3':  [[2009,null,2013,null,'II'],[2013,null,2016,null,'II FL'],[2016,null,2020,null,'III'],[2020,null,2035,null,'III FL']],
  'citroen-c4':  [[2004,null,2010,null,'I'],[2010,null,2015,null,'II'],[2015,null,2021,null,'II FL'],[2021,null,2035,null,'III']],
  'dacia-duster':  [[2010,null,2013,null,'I'],[2013,null,2017,null,'I FL'],[2017,null,2021,null,'II'],[2021,null,2035,null,'II FL']],
  'dacia-sandero': [[2008,null,2012,null,'I'],[2012,null,2020,null,'II'],[2020,null,2035,null,'III']],
  'mitsubishi-outlander': [[2006,null,2012,null,'II'],[2012,null,2015,null,'III'],[2015,null,2021,null,'III FL'],[2021,null,2035,null,'IV']],
  'suzuki-vitara': [[2015,null,2018,null,'IV'],[2018,null,2035,null,'IV FL']],
  'suzuki-swift':  [[2005,null,2010,null,'III'],[2010,null,2017,null,'IV'],[2017,null,2035,null,'V']],
}

// Nájdi generáciu pre daný model, rok a (voliteľne) mesiac
function findGeneration(brandSef, modelSef, rok, month) {
  if (!brandSef || !rok) return null
  const mTokens = (modelSef || '').split('-').filter(Boolean)
  // Skús kľúče od dlhšieho (cx-5) po kratší (cx)
  const candidates = []
  if (mTokens.length >= 2) candidates.push(`${brandSef}-${mTokens.slice(0, 2).join('-')}`)
  if (mTokens.length >= 1) candidates.push(`${brandSef}-${mTokens[0]}`)
  let gens = null
  for (const key of candidates) {
    if (GENERATIONS[key]) { gens = GENERATIONS[key]; break }
  }
  if (!gens) return null
  const ym = rok * 12 + (month || 6)   // null mesiac → predpokladáme jún
  for (const [fy, fm, ty, tm, name] of gens) {
    const from = fy * 12 + (fm || 1)
    const to   = ty * 12 + (tm || 12)
    if (ym >= from && ym <= to) {
      return { fromYear: fy, fromMonth: fm || 1, toYear: ty, toMonth: tm || 12, name }
    }
  }
  return null
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
// Parametre: powerFrom/powerTo (kW), mileageTo (max km), yearFrom/yearTo
function buildABSearchUrl(brandSef, modelSef, { yearFrom, yearTo, kw, kmTo } = {}) {
  if (!brandSef) return null
  const base = `https://www.autobazar.eu/vysledky/osobne-vozidla/${brandSef}/`
  const path = modelSef ? `${base}${modelSef}/` : base
  const params = []
  if (yearFrom)        params.push(`yearFrom=${yearFrom}`)
  if (yearTo)          params.push(`yearTo=${yearTo}`)
  if (kw)              params.push(`powerFrom=${kw - 1}&powerTo=${kw + 1}`)
  if (kmTo)            params.push(`mileageTo=${kmTo}`)
  return params.length ? `${path}?${params.join('&')}` : path
}

// ── Autobazar.eu: načítaj jednu stránku výsledkov → pole records ─
async function fetchABRecords(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sk-SK,sk;q=0.9,cs;q=0.8',
        'Referer':         'https://www.autobazar.eu/',
      },
      signal: AbortSignal.timeout(14000),
    })
    if (!res.ok) return []
    const html = await res.text()
    const nd   = html.match(/id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!nd) return []
    const trpc = JSON.parse(nd[1])?.props?.pageProps?.trpcState?.queries || []
    for (const q of trpc) {
      const d = q?.state?.data
      if (d?.data && Array.isArray(d.data) && d.data.length > 0 && d.data[0]?.price != null)
        return d.data
    }
    return []
  } catch { return [] }
}

// ── Autobazar.eu: scraping 3 stránok výsledkov naraz ─────────────
async function scrapeABPage(url, hintKw, hintFuel, hintRok, hintPrevId, yearFrom, yearTo) {
  try {
    // Stránky 1–5 paralelne
    const sep = url.includes('?') ? '&' : '?'
    const pages = await Promise.all([
      fetchABRecords(url),
      fetchABRecords(`${url}${sep}page=2`),
      fetchABRecords(`${url}${sep}page=3`),
      fetchABRecords(`${url}${sep}page=4`),
      fetchABRecords(`${url}${sep}page=5`),
    ])

    // Zlúč a deduplikuj podľa id
    const seen = new Set()
    const allRecords = pages.flat().filter(r => {
      if (!r.id || seen.has(r.id)) return false
      seen.add(r.id); return true
    })

    if (!allRecords.length) { console.error('[scrapeAB] no records', url); return null }

    const listings = allRecords.map(r => ({
      id:         r.id,
      title:      r.title || '',
      price:      r.finalPrice || r.price || 0,
      km:         r.mileage    != null ? r.mileage              : null,
      rok:        r.yearValue  != null ? parseInt(r.yearValue)  : null,
      palivo:     r.fuelValue  || null,
      palivoId:   mapAbPalivo(r.fuelValue),
      vykon:      r.enginePower != null ? r.enginePower         : null,
      prevodovka: r.gearboxValue || null,
      prevId:     mapAbGearbox(r.gearboxValue),
      brand:      r.brandValue  || null,
      model:      r.carModelValue || null,
    })).filter(r => r.price > 0)

    if (!listings.length) return null

    // ── Strict filter: palivo + prevodovka + rok + kW ────────────
    const fuelGroup = id => {
      if ([234, 240].includes(id))                return 'diesel'
      if ([244, 233, 235, 236, 237].includes(id)) return 'benzin'
      if ([238, 241].includes(id))                return 'hybrid'
      if ([239].includes(id))                     return 'elektro'
      return 'other'
    }
    const AUTO_IDS = [229,224,225,226,227,223]
    const filtered = listings.filter(r => {
      if (hintFuel && r.palivoId) {
        if (fuelGroup(r.palivoId) !== fuelGroup(hintFuel)) return false
      }
      if (hintPrevId) {
        const wAuto = AUTO_IDS.includes(hintPrevId)
        if (r.prevId) {
          if (AUTO_IDS.includes(r.prevId) !== wAuto) return false
        } else {
          const t = (r.title || '').toLowerCase()
          if (wAuto  && /manu[aá]|manual/.test(t))              return false
          if (!wAuto && /automat|dsg|s-tronic|tiptronic|pdk|cvt/.test(t)) return false
        }
      }
      if (r.rok) {
        if (yearFrom && yearTo) {
          if (r.rok < yearFrom - 1 || r.rok > yearTo + 1) return false
        } else if (hintRok) {
          if (Math.abs(r.rok - hintRok) > 2) return false
        }
      }
      if (hintKw && r.vykon && Math.abs(r.vykon - hintKw) > 10) return false
      return true
    })

    // bestMatch pre autofill (najlepší z filtrovaných alebo všetkých)
    const pool = filtered.length ? filtered : listings
    let bestMatch = pool[0], bestScore = -1
    for (const r of pool) {
      let score = 0
      if (hintKw  && r.vykon != null) score += Math.max(0, 40 - Math.abs(r.vykon - hintKw) * 2)
      if (hintFuel && r.palivoId === hintFuel) score += 30
      if (hintRok  && r.rok != null)  score += Math.max(0, 20 - Math.abs(r.rok - hintRok) * 4)
      if (score > bestScore) { bestScore = score; bestMatch = r }
    }

    return {
      brand:            allRecords[0]?.brandValue    || null,
      model:            allRecords[0]?.carModelValue || null,
      matched:          bestMatch,
      listings:         listings.slice(0, 100),
      filteredListings: filtered.slice(0, 100),
      stats:            calcStats(listings.map(r => r.price)),
      filteredStats:    calcStats(filtered.map(r => r.price)),
      filteredCount:    filtered.length,
    }
  } catch (e) {
    console.error('[scrapeABPage]', url, e.message)
    return null
  }
}

// Cache 2 hodiny — ochrana pred IP blokovaním
const getCachedAB = (url, kw, fuel, rok, prevId, yearFrom, yearTo) =>
  unstable_cache(
    () => scrapeABPage(url, kw, fuel, rok, prevId, yearFrom, yearTo),
    [`ab9-${url}-${kw}-${fuel}-${rok}-${prevId}-${yearFrom}-${yearTo}`],
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
  // Mesiac prvej registrácie z "firstRegistration": "2017-09", "09/2017", atď.
  let month = null
  if (r.firstRegistration) {
    const mm = String(r.firstRegistration).match(/(\d{4})[/-](\d{1,2})|(\d{1,2})[/-](\d{4})/)
    if (mm) {
      const m = mm[2] ? parseInt(mm[2]) : parseInt(mm[3])
      if (m >= 1 && m <= 12) month = m
    }
  }
  return {
    km:         r.mileage       ?? null,
    rok:        r.yearValue     ? parseInt(r.yearValue) : null,
    month,
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
    F.evidencia,
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
  // Len dealy vyhrané za posledných 12 mesiacov — ceny starších sú zastarané
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 1)
  return all.filter(d => d.won_time && new Date(d.won_time) >= cutoff)
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

// ── Podobnosť: Pipedrive deal vs. vstup (strict mode) ───────────
// gen = { fromYear, toYear, ... } | null
function similarity(deal, input, gen) {
  if (!input.model) return 0
  const m1 = (deal[F.model] || '').toLowerCase().trim()
  const m2 = input.model.toLowerCase().trim()
  if (!m1) return 0

  // ── Model (50 pts) ─────────────────────────────────────────────
  let score = 0
  if (m1 === m2)                                        score += 50
  else if (m1.includes(m2) || m2.includes(m1))         score += 35
  else if (m1.split(/\s+/)[0] === m2.split(/\s+/)[0])  score += 20
  else return 0   // žiadna zhoda modelu → vylúčiť

  // ── Palivo — HARD ELIMINATE ─────────────────────────────────────
  const fuelGroup = id => {
    if ([234, 240].includes(id))                return 'diesel'
    if ([244, 233, 235, 236, 237].includes(id)) return 'benzin'
    if ([238, 241].includes(id))                return 'hybrid'
    if ([239].includes(id))                     return 'elektro'
    return 'other'
  }
  if (input.palivoId && deal[F.palivo]) {
    const df = parseInt(deal[F.palivo])
    if (fuelGroup(df) !== fuelGroup(input.palivoId)) return 0
    score += (df === input.palivoId) ? 15 : 5
  }

  // ── Prevodovka — HARD ELIMINATE (auto vs. manuál) ──────────────
  const AUTO_IDS   = [229,224,225,226,227,223]
  const MANUAL_IDS = [228,231,232]
  if (input.prevId && deal[F.prevodovka]) {
    const dp = parseInt(deal[F.prevodovka])
    const rA = AUTO_IDS.includes(dp)
    const rM = MANUAL_IDS.includes(dp)
    const wA = AUTO_IDS.includes(input.prevId)
    if (rA && !wA) return 0
    if (rM && wA)  return 0
    if (rA && wA || rM && !wA) score += 15
  }

  // ── KM — HARD ELIMINATE > 20 000 km ────────────────────────────
  if (input.km && deal[F.km]) {
    const diff = Math.abs(deal[F.km] - input.km)
    if (diff > 20000)      return 0
    else if (diff <= 10000) score += 25
    else                   score += 12
  }

  // ── Dátum 1. evidencie / rok ─────────────────────────────────────
  // Preferujeme evidencia pole z Pipedrive; fallback na rok z titulku
  const dealRok = (() => {
    const ev = deal[F.evidencia]   // napr. "2020-03" alebo "03/2020"
    if (ev) {
      const m = String(ev).match(/(\d{4})/)
      if (m) return parseInt(m[1])
    }
    const rokM = (deal.title || '').match(/\b(19\d{2}|20[012]\d)\b/)
    return rokM ? parseInt(rokM[1]) : null
  })()

  if (input.rok && dealRok) {
    if (gen) {
      if (dealRok < gen.fromYear - 1 || dealRok > gen.toYear + 1) return 0
      score += (dealRok >= gen.fromYear && dealRok <= gen.toYear) ? 25 : 10
    } else {
      const diff = Math.abs(dealRok - input.rok)
      if      (diff === 0) score += 20
      else if (diff <= 1)  score += 14
      else if (diff <= 2)  score += 8
      else if (diff > 3)   return 0
    }
  }

  // ── Výkon kW — HARD ELIMINATE > 10 kW ──────────────────────────
  if (input.vykon && deal[F.vykon]) {
    const diff = Math.abs(deal[F.vykon] - input.vykon)
    if (diff > 10)       return 0
    else if (diff <= 5)  score += 10
    else                 score += 5
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
      const kw     = parsed.vykon    || hintVykon
      const fuel   = parsed.palivoId || hintPalivoId
      const rok    = parsed.rok      || hintRok
      const prevId = parsed.prevId   || hintPrevId

      // Generácia na základe roku zo slugu (detail ešte nemáme)
      const brandSef = parsed.brandSlug || AB_BRAND_SEF[parsed.znackaId]
      const gen      = brandSef && parsed.modelSlug && rok
        ? findGeneration(brandSef, parsed.modelSlug, rok, null)
        : null

      // Paralelne: detail stránka (presné dáta) + search stránka (trhové dáta)
      // kw/km posielame do URL — autobazar.eu filtruje serverovo (powerFrom/powerTo, mileageTo)
      const searchUrl = buildABSearchUrl(brandSef, parsed.modelSlug, {
        yearFrom: gen?.fromYear, yearTo: gen?.toYear,
        kw,
        kmTo: hintKm ? hintKm + 20000 : undefined,
      })

      ;[detail, abData] = await Promise.all([
        getCachedABDetail(url),
        searchUrl ? getCachedAB(searchUrl, kw, fuel, rok, prevId, gen?.fromYear, gen?.toYear) : Promise.resolve(null),
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

    // 3. Generácia pre inp (brandSef + modelSef + rok)
    const inpBrandSef = AB_BRAND_SEF[inp.znackaId]
    const inpModelSef = inp.model
      ? inp.model.toLowerCase().replace(/[^\w]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      : null
    const inpGen = inpBrandSef && inpModelSef && inp.rok
      ? findGeneration(inpBrandSef, inpModelSef, inp.rok, null)
      : null

    // 4. Autobazar.eu trhové dáta
    // Ak URL nebola zadaná (manuálny vstup), skúsime nájsť trhové dáta sami
    let abMarket = abFromUrl
    if (!abMarket && inp.znackaId) {
      const searchUrl = buildABSearchUrl(inpBrandSef, inpModelSef, {
        yearFrom: inpGen?.fromYear, yearTo: inpGen?.toYear,
        kw:   inp.vykon,
        kmTo: inp.km ? inp.km + 20000 : undefined,
      })
      if (searchUrl) {
        abMarket = await getCachedAB(searchUrl, inp.vykon, inp.palivoId, inp.rok, inp.prevId, inpGen?.fromYear, inpGen?.toYear)
      }
    }

    // 5. Pipedrive — načítaj vyhrané dealy
    const deals = await fetchWonDeals()

    // 6. Filtruj podľa značky + vyhodnoť podobnosť (strict mode s generáciou)
    const byBrand = inp.znackaId
      ? deals.filter(d => String(d[F.znacka]) === String(inp.znackaId))
      : deals

    const scored = byBrand
      .map(d => ({ ...d, _score: similarity(d, inp, inpGen) }))
      .filter(d => d._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 20)

    // 7. Štatistiky z Pipedrive histórie
    const histPredaj = calcStats(scored.map(d => d[F.predane_za]).filter(Boolean))
    const histVykup  = calcStats(scored.map(d => d[F.vykup_za]).filter(Boolean))
    const histProviz = calcStats(scored.map(d => d[F.provizka]).filter(Boolean))

    // 8. Odporúčané ceny
    //    Predajná: z autobazar.eu filteredStats (aktuálny trh, rok±2, rovnaké palivo)
    //    Výkupná:  z trhovej ceny * historická marža z Pipedrive (fallback 82%)
    const marketMedian  = abMarket?.filteredStats?.median ?? abMarket?.stats?.median ?? null
    const marginRatio   = (histPredaj?.median && histVykup?.median)
      ? histVykup.median / histPredaj.median
      : 0.82  // default 18% marža

    const recPredaj = marketMedian   ?? histPredaj?.median ?? null
    const recVykup  = recPredaj      ? Math.round(recPredaj * marginRatio) : histVykup?.median ?? null

    // 9. Comparable deals pre tabuľku
    const comparable = scored.slice(0, 10).map(d => ({
      id:         d.id,
      title:      d.title,
      owner:      d.owner_name,
      wonDate:    (d.won_time || '').substring(0, 10),
      evidencia:  d[F.evidencia] || null,
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
      generation: inpGen,   // napr. { fromYear:2017, toYear:2020, name:'III FL' }

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
