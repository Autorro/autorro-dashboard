import { fetchAllPages } from '@/lib/pipedrive'
import { cache as dataCache } from '@/lib/cache'
import { ZNACKA_KEY } from '@/lib/constants'
import { getServerUser } from '@/lib/auth-server'

export const revalidate = 600

function norm(s) {
  return (s || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[-_/]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const KNOWN_BRANDS = [
  'abarth','acura','alfa romeo','alpina','aston martin','audi','bentley','bmw',
  'buick','cadillac','chevrolet','chrysler','citroen','cupra','dacia','daewoo',
  'dodge','ds','ferrari','fiat','ford','gmc','honda','hummer','hyundai','infiniti',
  'isuzu','iveco','jaguar','jeep','kia','lada','lamborghini','lancia','land rover',
  'lexus','lincoln','lotus','mahindra','man','maserati','mazda','mclaren',
  'mercedes','mg','mini','mitsubishi','nissan','opel','peugeot','pontiac','porsche',
  'renault','rolls royce','rover','saab','seat','skoda','smart','ssangyong',
  'subaru','suzuki','tatra','tesla','toyota','volkswagen','volvo',
].sort((a, b) => b.length - a.length)

const KNOWN_BRANDS_SET = new Set(KNOWN_BRANDS)

/** Jednotná funkcia na skrášlenie názvu značky s diakritikou – predtým duplikovaná 2×. */
function prettifyBrand(brand) {
  return brand
    .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    .replace(/\bSkoda\b/,    'Škoda')
    .replace(/\bCitroen\b/,  'Citroën')
    .replace(/\bBmw\b/,      'BMW')
    .replace(/\bMg\b/,       'MG')
    .replace(/\bDs\b/,       'DS')
    .replace(/\bGmc\b/,      'GMC')
    .replace(/\bSsangyong\b/,'SsangYong')
}

function expandAbbr(t) {
  return t
    .replace(/\bvw\b/g,           'volkswagen')
    .replace(/\bwv\b/g,           'volkswagen')
    .replace(/\bvolkwagen\b/g,    'volkswagen')
    .replace(/\bvolkswagen\b/g,   'volkswagen')
    .replace(/\bvolskwagen\b/g,   'volkswagen')
    .replace(/\bwolksvagen\b/g,   'volkswagen')
    .replace(/\bvolksvagen\b/g,   'volkswagen')
    .replace(/\bwolkswagen\b/g,   'volkswagen')
    .replace(/\bvolcvagen\b/g,    'volkswagen')
    .replace(/\bvolswagen\b/g,    'volkswagen')
    .replace(/\bwolksflagen\b/g,  'volkswagen')
    .replace(/\bwolksvaden\b/g,   'volkswagen')
    .replace(/^(golf|passat|pasat|tiguan|touran|touareg|arteon|caddy|multivan|caravelle|scirocco|sharan|amarok|t-roc|t roc|troc|id\.?3|id\.?4|id\.?5|polo|t4|t5|transporter|crafter|phaeton)\b/, 'volkswagen $1')
    .replace(/^(octavia|octavie|oktavia|superb|fabia|kodiaq|karoq|rapid|enyaq|roomster|yeti|scala)\b/, 'skoda $1')
    .replace(/^(alhambra|ateca)\b/, 'seat $1')
    .replace(/\bmb\b/g,           'mercedes')
    .replace(/\bamg\b/g,          'mercedes')
    .replace(/\bmercedesbenz\b/g, 'mercedes')
    .replace(/\bmerdes\b/g,       'mercedes')
    .replace(/\blandrover\b/g,    'land rover')
    .replace(/\brange rover\b/g,  'land rover')
    .replace(/\bbmv\b/g,          'bmw')
    .replace(/\bmitsubushi\b/g,   'mitsubishi')
    .replace(/\bmitsubichi\b/g,   'mitsubishi')
    .replace(/\btoyotoa\b/g,      'toyota')
    .replace(/\bnisan\b/g,        'nissan')
    .replace(/\bnissa\b/g,        'nissan')
    .replace(/\bpeugot\b/g,       'peugeot')
    .replace(/\bsuzuky\b/g,       'suzuki')
    .replace(/\bbentli\b/g,       'bentley')
    .replace(/\bhuyndai\b/g,      'hyundai')
    .replace(/\bminicooper\b/g,   'mini cooper')
}

function brandFromTitle(title) {
  const t = expandAbbr(norm(title))
  for (const b of KNOWN_BRANDS) {
    if (b.includes(' ')) {
      if (t.includes(b)) return b
    } else {
      if (new RegExp(`(^|\\s)${b}(\\s|$)`).test(t)) return b
    }
  }
  return null
}

async function fetchZnackaMap(apiToken, rawDeals) {
  const res   = await fetch(
    `https://api.pipedrive.com/v1/dealFields?api_token=${apiToken}&limit=500`,
    { cache: 'no-store' }
  )
  const json  = await res.json()
  const field = (json.data || []).find(f => f.key === ZNACKA_KEY)
  const map   = {}
  for (const opt of (field?.options || [])) {
    map[String(opt.id)] = opt.label
  }

  const idTitles = {}
  for (const d of rawDeals) {
    const raw = String(d[ZNACKA_KEY] || '')
    if (!raw) continue
    if (!idTitles[raw]) idTitles[raw] = []
    idTitles[raw].push(d.title || '')
  }

  for (const [id, titles] of Object.entries(idTitles)) {
    if (titles.length < 4) continue
    const counts = {}
    for (const t of titles) {
      const b = brandFromTitle(t)
      if (b) counts[b] = (counts[b] || 0) + 1
    }
    if (!Object.keys(counts).length) continue
    const [[topBrand, topCount]] = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const confidence = topCount / titles.length
    if (confidence < 0.60) continue
    const currentNorm  = norm(map[id] || '')
    const detectedNorm = norm(topBrand)
    if (currentNorm === detectedNorm) continue
    map[id] = prettifyBrand(topBrand)  // ← zdieľaná funkcia namiesto duplikátu
  }

  return map
}

const CREDIT_NORM = 'auto nie je z ponuky uver'

function getZnacka(deal, znackaMap) {
  const raw   = deal[ZNACKA_KEY]
  const label = raw ? (znackaMap[String(raw)] || 'Neurčená') : 'Neurčená'
  const ln    = norm(label)
  const isKnownCarBrand = KNOWN_BRANDS_SET.has(ln)
  if (label === 'Neurčená' || ln.startsWith('auto nie je z ponuky') || !isKnownCarBrand) {
    const detected = brandFromTitle(deal.title || '')
    if (detected) return prettifyBrand(detected)  // ← zdieľaná funkcia namiesto duplikátu
    return label
  }
  return label
}

async function fetchRawDeals(apiToken) {
  // Paralelné načítanie všetkých 3 statusov naraz
  const base = `https://api.pipedrive.com/v1/deals?api_token=${apiToken}&limit=500`
  const [open, won, lost] = await Promise.all([
    fetchAllPages(`${base}&status=open`),
    fetchAllPages(`${base}&status=won`),
    fetchAllPages(`${base}&status=lost`),
  ])
  return [...open, ...won, ...lost]
}

async function fetchZnackyData() {
  const apiToken  = process.env.PIPEDRIVE_API_TOKEN
  const rawDeals  = await fetchRawDeals(apiToken)
  const znackaMap = await fetchZnackaMap(apiToken, rawDeals)

  const byNorm = {}
  for (const d of rawDeals) {
    const label = getZnacka(d, znackaMap)
    const key   = norm(label)
    if (!byNorm[key]) byNorm[key] = { brand: label, open: 0, won: 0, lost: 0 }
    byNorm[key][d.status]++
    if (label.length > byNorm[key].brand.length) byNorm[key].brand = label
  }

  return Object.values(byNorm)
    .map(b => ({
      brand:   b.brand,
      open:    b.open,
      won:     b.won,
      lost:    b.lost,
      total:   b.open + b.won + b.lost,
      winRate: b.won + b.lost > 0 ? Math.round(b.won / (b.won + b.lost) * 100) : null,
    }))
    .sort((a, z) => z.total - a.total)
}

const getCachedZnacky = dataCache(fetchZnackyData, 'znacky', 600)

export async function GET(request) {
  try {
    const user = await getServerUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === '1'

    if (force) {
      const { revalidateTag } = await import('next/cache')
      revalidateTag('znacky')
    }

    const result = await getCachedZnacky()
    return Response.json(result, { headers: { 'X-Cache': force ? 'REVALIDATED' : 'HIT' } })
  } catch {
    return Response.json({ error: 'Interná chyba' }, { status: 500 })
  }
}
