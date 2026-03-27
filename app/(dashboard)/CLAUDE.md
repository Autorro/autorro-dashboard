# 🏆 Leaderboard predaja + 🏥 Zdravie ponuky — CLAUDE.md

## Súbory
```
app/(dashboard)/page.js                    → render SalesLeaderboardClient
app/(dashboard)/SalesLeaderboardClient.js  → Leaderboard UI (hlavný klient)
app/(dashboard)/DashboardClient.js         → Zdravie ponuky UI
app/(dashboard)/zdravie-ponuky/page.js     → render DashboardClient
app/api/leaderboard/route.js               → API: predaje maklérov z Pipedrive
app/api/zdravie-ponuky/route.js            → API: zdravie inzerátov
app/api/check-listings/route.js            → kontrola inzerátov (autobazar/sauto URL)
app/api/trend-zdravia/route.js             → historický trend zdravia ponuky
```

## 🏆 Leaderboard predaja (`SalesLeaderboardClient.js`)

### Čo robí
Zobrazuje rebríček maklérov podľa objemu predajov (€). Dáta z Pipedrive won deals.

### Kľúčové konštanty
```js
// Kariérne úrovne (tiery) — hranice v € obrate
TIERS = [
  { id:"M1", min:0,       max:30_000  },
  { id:"M2", min:30_000,  max:100_000 },
  { id:"M3", min:100_000, max:200_000 },
  { id:"M4", min:200_000, max:400_000 },
  { id:"M5", min:400_000, max:800_000 },
  { id:"M6", min:800_000, max:Infinity },
]

// Percentá provízií per tier
hotovostna: 40/45/50/60/75/90 %
uverova: 20/20/25/25/25/25 %
```

### API `/api/leaderboard`
- GET: `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`
- Vracia predaje per maklér, filtrované podľa `EXCLUDE`
- Pipedrive field: `CENA_VOZIDLA` + provízne polia

### Filter kancelárií
```js
OFFICES = { "Všetky": null, "BB": [...makléri], "TT": [...], "NR": [...], ... }
```
Každá kancelária má hardcoded zoznam mien maklérov (vrátane variant s/bez diakritiky).

---

## 🏥 Zdravie ponuky (`DashboardClient.js`)

### Čo robí
Zobrazuje "zdravie" aktívnych inzerátov — či majú správnu cenu, autobazar URL, fotky atď.
Skóre zdravia 0–100% per inzerát + celkový dashboard.

### Kľúčové Pipedrive field keys (lokálne v DashboardClient)
```js
AUTOBAZAR_URL_KEY  = '8ad28e02...'  // URL na autobazar.eu / sauto.sk
AUTORRO_URL_KEY    = '65230483...'  // URL na autorro.sk/cz
INZEROVANE_OD_KEY  = '3f9740a6...'  // Dátum inzerovania
```

### Inzerované stages
```js
INZEROVANE_STAGES = [13, 31, 34, 22]  // z lib/constants.js
```

### API `/api/zdravie-ponuky`
- GET: vracia všetky aktívne inzerované dealy s ich metrikami
- Používa `unstable_cache` s krátkou TTL

### API `/api/check-listings`
- POST: `{ dealId, autobazarUrl }` — overí či inzerát stále existuje
- Scrape autobazar.eu / sauto.sk

### Trend zdravia `/api/trend-zdravia`
- GET: historické snapshoty zdravia z Supabase

---

## Spoločné UI vzory
- Farby: sidebar `#481132`, akcentová `#FF501C` (oranžová Autorro)
- Pozadie stránky: `#F7F6F4`
- Karty: `bg-white border border-gray-200 rounded-xl shadow-sm`
- Admin vidí všetkých, bežný maklér len seba (`useUser()` hook z `lib/user-context.js`)
- Kancelársky filter: `<select>` s OFFICES konštantou
