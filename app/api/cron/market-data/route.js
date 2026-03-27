/**
 * Nočný cron job — zbiera trhové dáta z autobazar.eu pre top 30 modelov.
 * Výsledky ukladá do Supabase tabuľky `market_snapshots`.
 * Spúšťa sa každú noc o 2:00 UTC (3:00 SK).
 *
 * Supabase DDL (spusti raz v SQL editore):
 *   CREATE TABLE IF NOT EXISTS market_snapshots (
 *     key TEXT PRIMARY KEY,
 *     data JSONB NOT NULL,
 *     fetched_at TIMESTAMPTZ DEFAULT now()
 *   );
 */

export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase-server'

// Top 30 modelov na slovenskom trhu (brandSef, modelSef, typické kW, typické km)
const TOP_MODELS = [
  { brand: 'skoda',      model: 'octavia',   kw: 110, km: 120000 },
  { brand: 'skoda',      model: 'fabia',     kw: 70,  km: 80000  },
  { brand: 'skoda',      model: 'superb',    kw: 140, km: 150000 },
  { brand: 'volkswagen', model: 'golf',      kw: 110, km: 100000 },
  { brand: 'volkswagen', model: 'passat',    kw: 110, km: 150000 },
  { brand: 'volkswagen', model: 'polo',      kw: 70,  km: 80000  },
  { brand: 'volkswagen', model: 'tiguan',    kw: 110, km: 100000 },
  { brand: 'audi',       model: 'a4',        kw: 110, km: 120000 },
  { brand: 'audi',       model: 'a3',        kw: 110, km: 100000 },
  { brand: 'audi',       model: 'a6',        kw: 140, km: 150000 },
  { brand: 'bmw',        model: '3',         kw: 110, km: 120000 },
  { brand: 'bmw',        model: '5',         kw: 140, km: 150000 },
  { brand: 'bmw',        model: 'x3',        kw: 140, km: 120000 },
  { brand: 'mercedes-benz', model: 'e-trieda', kw: 143, km: 150000 },
  { brand: 'mercedes-benz', model: 'c-trieda', kw: 125, km: 120000 },
  { brand: 'ford',       model: 'focus',     kw: 110, km: 100000 },
  { brand: 'opel',       model: 'astra',     kw: 95,  km: 100000 },
  { brand: 'opel',       model: 'insignia',  kw: 110, km: 130000 },
  { brand: 'renault',    model: 'megane',    kw: 85,  km: 100000 },
  { brand: 'peugeot',    model: '308',       kw: 95,  km: 100000 },
  { brand: 'hyundai',    model: 'tucson',    kw: 100, km: 100000 },
  { brand: 'kia',        model: 'ceed',      kw: 88,  km: 90000  },
  { brand: 'toyota',     model: 'corolla',   kw: 90,  km: 100000 },
  { brand: 'toyota',     model: 'rav4',      kw: 90,  km: 100000 },
  { brand: 'mazda',      model: '3',         kw: 88,  km: 90000  },
  { brand: 'seat',       model: 'leon',      kw: 110, km: 100000 },
  { brand: 'nissan',     model: 'qashqai',   kw: 103, km: 100000 },
  { brand: 'dacia',      model: 'duster',    kw: 85,  km: 80000  },
  { brand: 'honda',      model: 'civic',     kw: 96,  km: 90000  },
  { brand: 'mitsubishi', model: 'outlander', kw: 107, km: 100000 },
]

function buildSearchUrl(brand, model, { kw, km } = {}) {
  const base   = `https://www.autobazar.eu/vysledky/osobne-vozidla/${brand}/${model}/`
  const params = []
  if (kw) {
    params.push(`powerFrom=${kw - 15}&powerTo=${kw + 15}`)
  }
  if (km) {
    params.push(`mileageFrom=${Math.max(0, km - 40000)}&mileageTo=${km + 40000}`)
  }
  return params.length ? `${base}?${params.join('&')}` : base
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sk-SK,sk;q=0.9',
        'Referer':         'https://www.autobazar.eu/',
      },
      signal: AbortSignal.timeout(12000),
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

async function scrapeModel({ brand, model, kw, km }) {
  const url  = buildSearchUrl(brand, model, { kw, km })
  const sep  = url.includes('?') ? '&' : '?'

  const pages = await Promise.all([
    fetchPage(url),
    fetchPage(`${url}${sep}page=2`),
    fetchPage(`${url}${sep}page=3`),
  ])

  const seen = new Set()
  const records = pages.flat().filter(r => {
    if (!r.id || seen.has(r.id)) return false
    seen.add(r.id); return true
  })

  const prices = records
    .map(r => r.finalPrice || r.price)
    .filter(p => p > 0)
    .sort((a, b) => a - b)

  const n      = prices.length
  if (n === 0) return null

  const median = n % 2 === 0
    ? Math.round((prices[n/2-1] + prices[n/2]) / 2)
    : prices[Math.floor(n/2)]

  return {
    brand, model, kw, km,
    count:  n,
    median,
    min:    prices[0],
    max:    prices[n - 1],
    avg:    Math.round(prices.reduce((a, b) => a + b, 0) / n),
  }
}

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true   // dev mode
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = new Date().toISOString()
  const results   = []

  // Spracuj po 5 modeloch paralelne, aby sme nespamili autobazar.eu
  for (let i = 0; i < TOP_MODELS.length; i += 5) {
    const batch  = TOP_MODELS.slice(i, i + 5)
    const batchR = await Promise.allSettled(batch.map(scrapeModel))

    for (let j = 0; j < batchR.length; j++) {
      const entry = batchR[j]
      const m     = batch[j]
      const key   = `${m.brand}/${m.model}`

      if (entry.status === 'fulfilled' && entry.value) {
        const data = { ...entry.value, fetchedAt: startedAt }
        results.push({ key, ok: true, count: entry.value.count, median: entry.value.median })

        // Ulož do Supabase
        await supabase
          .from('market_snapshots')
          .upsert({ key, data, fetched_at: startedAt }, { onConflict: 'key' })
      } else {
        results.push({ key, ok: false })
      }
    }

    // Krátka pauza medzi dávkami
    if (i + 5 < TOP_MODELS.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  const ok    = results.filter(r => r.ok).length
  const total = results.length

  console.log(`[cron/market-data] ${ok}/${total} modelov úspešne`, startedAt)

  return Response.json({
    ok:        ok === total,
    fetched:   ok,
    total,
    startedAt,
    finishedAt: new Date().toISOString(),
    results,
  })
}
