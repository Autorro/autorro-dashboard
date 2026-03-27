# 🧮 Kalkulačka ocenenia — CLAUDE.md

## Súbory
```
app/(dashboard)/kalkulacka/page.js       → Frontend (client component)
app/api/kalkulacka/route.js              → Hlavný API (POST + GET)
app/api/kalkulacka/ai/route.js           → Streaming AI analýza (Claude)
```

## Čo robí
Nástroj pre maklérov na ocenenie ojazdených áut. Vstup: URL inzerátu alebo ručné zadanie parametrov. Výstup: odporúčaná predajná + výkupná cena na základe:
1. Aktuálnych trhových inzerátov z autobazar.eu (scraping)
2. Histórie podobných predajov Autorro z Pipedrive (posledných 18 mesiacov)
3. AI analýzy od Claude (streaming, po výpočte)

---

## API `POST /api/kalkulacka`

### Vstupné parametre (body JSON)
```js
{
  url?:       string,   // autobazar.eu alebo bazos.sk URL (voliteľné)
  znackaId?:  number,   // Pipedrive enum ID značky
  model?:     string,   // napr. "A6", "Octavia", "e trieda"
  km?:        number,
  rok?:       number,
  palivoId?:  number,   // Pipedrive enum ID
  prevId?:    number,   // Pipedrive enum ID prevodovky
  vykon?:     number,   // kW
  pohonId?:   number,   // Pipedrive enum ID pohonu
  autofillOnly?: bool,  // ak true → vráti len autofill bez pricing
}
```

### Výstup
```js
{
  autofill: { znackaId, model, km, rok, palivoId, prevId, vykon, pohonId, source },
  input:    { ...inp, brandName, palivo, prevodovka, pohonLabel },
  generation: { fromYear, toYear, fromMonth, toMonth, name } | null,
  recommended: { predaj, vykup, marginRatio, source: "market"|"history" },
  market:   { listings[], stats, filteredStats, filteredCount },
  history:  { predaj: stats, vykup: stats, proviz: stats },
  comparable: [{ id, title, owner, wonDate, evidencia, km, palivo, prevodovka, pohon, predanZa, vykupZa }],
  totalFiltered, totalMatched
}
```

---

## Pipedrive field keys (`F` objekt)
```js
F.znacka      = 'c5d33ca4...'
F.model       = '40ae6142...'
F.km          = 'b8fe1dea...'
F.vykon       = '2f9dfecf...'
F.palivo      = 'b443ce5a...'
F.prevodovka  = '00fb549c...'
F.predane_za  = 'a259a3e3...'
F.vykup_za    = '7f4a915f...'
F.evidencia   = 'e4eb52fb...'   // 1. evidencia (dátum registrácie)
F.pohon       = '6d647f33...'
```

## Enumerácie
```js
PALIVO:      { 234:'Diesel', 244:'Benzín', 238:'Hybrid', 239:'Elektro', ... }
PREVODOVKA:  { 228:'Manuálna', 229:'Automatická', 223:'CVT', 224:'AT/9', ... }
POHON:       { 276:'Predný náhon', 277:'Zadný náhon', 278:'4x4', 279:'Iné' }
AUTO_IDS = [229, 224, 225, 226, 227, 223]   // automatické prevodovky
```

---

## Autobazar.eu scraping

### Search URL schéma
```
/vysledky/osobne-vozidla/{brandSef}/{modelSef}/?powerFrom=X&powerTo=Y&mileageFrom=A&mileageTo=B&yearFrom=C&yearTo=D
```
- **kW v URL:** ±10 (široký pool), **kW client-side filter:** ±5
- **km v URL:** ±30k, **km client-side filter:** progressívne ±20k→±40k→±60k→bez limitu
- 5 stránok paralelne (page=1..5), max 100 inzerátov, dedup podľa id

### `__NEXT_DATA__` parsing
- Search: `props.pageProps.trpcState.queries[].state.data.data[]`
- Detail: `props.pageProps.advertisement`

### `buildABSearchUrl(brandSef, modelSef, { yearFrom, yearTo, kw, kmFrom, kmTo })`

### AB_BRAND_SEF mapovanie
```js
{ 126:'audi', 130:'bmw', 172:'mercedes-benz', 186:'skoda', 196:'volkswagen', ... }
```

### Mapovanie autobazar → Pipedrive enums
```js
mapAbPalivo(fuelValue)    → palivoId
mapAbGearbox(gearboxValue) → prevId
mapAbDrive(driveValue)    → pohonId (276/277/278/279)
```

---

## Parsovanie URL slugu (`parseSlug`)
- Extrahuje: znackaId, brandName, brandSlug, modelSlug, model, rok, vykon, palivoId, prevId
- **DÔLEŽITÉ:** Pre prvý model token používa `isSpecTokenFirst` (miernejší) — povolí alfanumerické modely ako `a6`, `q7`, `x3`, `rs6`, `320d`
- Pre ďalšie tokeny striktný filter (zastaví na roku, čísle, kóde motora)
- Aliasy značiek: `mercedesbenz→172`, `landrover→163`, `astonmartin→125`, `rollsroyce→182`

---

## Generačná databáza (`GENERATIONS`)
~45 modelov. Formát: `[fromYear, fromMonth|null, toYear, toMonth|null, genName]`
```js
'skoda-octavia': [[1996,null,2000,null,'I'], [2004,null,2008,null,'II'], ...]
'mercedes-benz-e': [[2009,null,2013,null,'W212'], ...]
```
`findGeneration(brandSef, modelSef, rok, month)` → `{ fromYear, toYear, name }`

---

## Similarity scoring (Pipedrive dealy)
Hard eliminátory (vrátia 0):
- Palivo: iná skupina (diesel ≠ benzín ≠ hybrid)
- Prevodovka: auto ≠ manuál
- KM: rozdiel > 30 000
- Pohon: 4x4 ≠ predný/zadný
- kW: rozdiel > 10
- Rok/generácia: mimo generácie ±1 rok

---

## Client-side filtrovanie (`filterListings` v page.js)
```
kW: ±5 (striktné)
palivo: rovnaká skupina
prevodovka: auto vs. manuál
pohon: 4x4 vs. nie-4x4
km: progresívne ±20k → ±40k → ±60k → bez limitu (kým ≥5 výsledkov)
```

---

## AI analýza (`POST /api/kalkulacka/ai`)
- Model: `claude-opus-4-6` s `thinking: { type: 'adaptive' }`
- Vstup: `{ input, recommended, market, comparable, generation, history }`
- Výstup: streaming plain text, slovensky, max ~300 slov
- Frontend streamuje pomocou `ReadableStream` + `TextDecoder`

---

## Cache
- `unstable_cache` TTL 2h, kľúč `ab12-{url}-{kw}-{fuel}-{rok}-...`
- Detail stránka: TTL 30 min, kľúč `ab-detail-{url}`

---

## GET `/api/kalkulacka`
Vracia enumerácie pre formulár:
```js
{ znacky: [{id,name}], paliva: [{id,name}], prevodovky: [{id,name}], pohony: [{id,name}] }
```

---

## Časté chyby / história opráv
- `a6`, `q7`, `x3` sa nesprávne parsujú ako spec tokeny → opravené cez `isSpecTokenFirst`
- mercedes-benz slug → opravené cez `ZNACKY_REV` aliasy
- Výsledky bez modelu (všetky Audi) → POST handler re-fetchuje ak `parsed.modelSlug` je prázdny
- Cache key sa bumpe (ab11→ab12) pri zmenách logiky filtrovania
