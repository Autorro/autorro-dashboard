# 🎯 Konverzia leadov + 📞 Vyhodnotenie callcentra — CLAUDE.md

## Súbory
```
app/(dashboard)/konverzia/page.js                    → render KonverziaClient
app/(dashboard)/konverzia/KonverziaClient.js          → Konverzia UI
app/(dashboard)/vyhodnotenie-callcentra/page.js       → Callcentrum UI (priamo)
app/api/wasitlead-conversion/route.js                 → API pre konverziu leadov
app/api/optimcall/route.js                            → API pre callcentrum (Optimcall)
```

---

## 🎯 Konverzia leadov

### Čo robí
Zobrazuje konverzný funnel: koľko leadov sa zmenilo na dealy. Štatistiky per maklér alebo celkovo.

### API `GET /api/wasitlead-conversion`
- Parametre: `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`
- Dáta z Pipedrive: leads + deals
- Počíta: celkové leady, konvertované, % konverzie

### UI (`KonverziaClient.js`)
- Funnel vizualizácia
- Filter: obdobie + kancelária
- Tabuľka per maklér

---

## 📞 Vyhodnotenie callcentra

### Čo robí
Štatistiky hovorov z Optimcall systému. Zobrazuje počty hovorov, prepojenia, zmeškaných hovorov per maklér/deň.

### API `GET /api/optimcall`
- Parametre: `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`
- Externý Optimcall API (nie Pipedrive)
- Vracia: hovory, trvanie, typ (prichádzajúci/odchádzajúci)

### UI
```js
PERIODS = [
  { label: "Dnes",    days: 0  },
  { label: "7 dní",   days: 7  },
  { label: "30 dní",  days: 30 },
  ...
]
```
- Filter obdobia (rýchle tlačidlá)
- Tabuľka: maklér, počet hovorov, priemerná dĺžka, zmeškaných
- Farebné zvýraznenie podľa výkonu

### Env var
Optimcall API potrebuje vlastný token (check `.env`)
