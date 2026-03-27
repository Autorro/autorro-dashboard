# Cron joby + Snapshot — CLAUDE.md

## Súbory
```
app/api/cron/warm/route.js          → Pre-warm cache (pracovné dni 06:00 UTC)
app/api/cron/market-data/route.js   → Trhové dáta autobazar.eu (každú noc 02:00 UTC)
app/api/snapshot/route.js           → Pipedrive snapshot do Supabase (22:00 UTC)
vercel.json                         → Definícia cron schedules
```

## vercel.json schedules
```json
{ "path": "/api/snapshot",          "schedule": "0 22 * * *"   }  // 22:00 UTC denne
{ "path": "/api/cron/warm",         "schedule": "0 6 * * 1-5"  }  // 06:00 UTC po-pi
{ "path": "/api/cron/market-data",  "schedule": "0 2 * * *"    }  // 02:00 UTC denne
```

## Autorizácia
Všetky cron routy overujú `Authorization: Bearer {CRON_SECRET}` header.
Vercel automaticky posiela tento header. Pre manuálne testovanie:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/market-data
```

---

## `/api/cron/warm` — Cache warming

### Čo robí
Volá všetky pomalé API routes aby Vercel Data Cache bol vždy teplý → okamžité odpovede pre používateľov.

### Routes ktoré warmuje
```js
ROUTES = [
  '/api/leaderboard',
  '/api/zdravie-ponuky',
  '/api/znacky',
  '/api/cas-predaja',
  '/api/wasitlead-conversion',
  '/api/reakčný-čas',
]
```

---

## `/api/cron/market-data` — Trhové dáta

### Čo robí
Každú noc stiahne trhové ceny z autobazar.eu pre 30 najčastejších modelov a uloží do Supabase.

### Supabase tabuľka `market_snapshots`
```sql
CREATE TABLE IF NOT EXISTS market_snapshots (
  key TEXT PRIMARY KEY,         -- napr. "skoda/octavia"
  data JSONB NOT NULL,          -- { brand, model, count, median, min, max, avg, fetchedAt }
  fetched_at TIMESTAMPTZ DEFAULT now()
);
```

### Top 30 modelov (hardcoded)
skoda/octavia, skoda/fabia, volkswagen/golf, audi/a4, bmw/3, mercedes-benz/e-trieda, ford/focus, opel/astra, renault/megane, ... (pozri route.js)

### Dávkovanie
5 modelov paralelne, 1s pauza medzi dávkami (ochrana pred rate limitom autobazar.eu)

### Výstup
```json
{ "ok": true, "fetched": 28, "total": 30, "startedAt": "...", "finishedAt": "...", "results": [...] }
```

---

## `/api/snapshot` — Pipedrive snapshot

### Čo robí
Každú noc uloží snapshot aktuálnych inzerovaných dealov do Supabase (pre historický trend zdravia ponuky).

### Supabase tabuľka
Pozri implementáciu v `route.js` (používa `supabase` z `lib/supabase-server.js`)

### Vzťah na Zdravie ponuky
`/api/trend-zdravia` číta historické snapshoty z Supabase pre graf trendu.
