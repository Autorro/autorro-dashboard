# 🚘 Značky vozidiel — CLAUDE.md

## Súbory
```
app/(dashboard)/znacky/page.js          → render ZnackyClient
app/(dashboard)/znacky/ZnackyClient.js  → Značky UI
app/api/znacky/route.js                 → API pre štatistiky značiek
```

## Čo robí
Zobrazuje štatistiky predaných áut podľa značky a modelu — počty, priemerné ceny, obrat. Pomáha identifikovať ktoré značky/modely Autorro predáva najviac.

## API `GET /api/znacky`
- Parametre: `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`
- Dáta: Pipedrive won deals, Pipedrive field značky (`F.znacka`)
- Vracia: zoskupené per značka → počet predajov, priemerná cena, celkový obrat

## Pipedrive field
```js
// Zo lib/constants.js alebo lokálne v route
znacka = 'c5d33ca43498a4e3e0e90dc8e1cfa3944107290d'
model  = '40ae61427f898087ee54a8ee06ce2b5311079a2b'
```

## UI
- Tabuľka: Značka | Počet predajov | Priem. cena | Obrat
- Zoradenie: podľa počtu predajov (desc)
- Filter obdobia
