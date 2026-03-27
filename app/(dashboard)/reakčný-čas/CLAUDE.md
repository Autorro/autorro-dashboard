# ⚡ Reakčný čas + 🕐 Čas predaja — CLAUDE.md

## Súbory
```
app/(dashboard)/reakčný-čas/page.js          → render ReakcnyClient
app/(dashboard)/reakčný-čas/ReakcnyClient.js → Reakčný čas UI
app/(dashboard)/cas-predaja/page.js           → render CasPredajaClient
app/(dashboard)/cas-predaja/CasPredajaClient.js → Čas predaja UI
app/api/reakčný-čas/route.js                 → API pre reakčný čas
app/api/cas-predaja/route.js                  → API pre čas predaja
```

---

## ⚡ Reakčný čas

### Čo robí
Meria ako rýchlo makléri reagujú na nové leady. Zobrazuje priemerný reakčný čas per maklér + porovnanie s cieľom.

### API `GET /api/reakčný-čas`
- Parametre: `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`
- Dáta z Pipedrive activities / deals
- Filtruje podľa `EXCLUDE` (lib/constants.js)

### UI
- Graf (Recharts: BarChart) s priemerným reakčným časom
- Farebné kódovanie: zelená (rýchlo) → červená (pomaly)
- Filter kancelárií (OFFICES konštanta rovnaká ako Leaderboard)
- Zoradenie: od najrýchlejšieho

---

## 🕐 Čas predaja

### Čo robí
Zobrazuje priemerný čas od inzerovania do predaja per maklér. Porovnanie s mediánom.

### API `GET /api/cas-predaja`
- Parametre: `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`
- Dáta: Pipedrive won deals, rozdiel medzi `INZEROVANE_OD_KEY` a `won_time`
- Filtruje `EXCLUDE`

### UI
- Tabuľka/graf priemerného času predaja v dňoch
- Filter kancelárií
- Zoradenie: od najkratšieho

### Kľúčová Pipedrive konštanta
```js
INZEROVANE_OD_KEY = '3f9740a67e24bf1c3f3e65360abc0673bb07a4a8'  // dátum inzerovania
```

---

## Spoločné
- Recharts pre vizualizácie (Bar, Line, Tooltip, ResponsiveContainer)
- Rovnaký OFFICES filter ako Leaderboard
- `EXCLUDE` z `lib/constants.js`
