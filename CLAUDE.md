# Autorro Dashboard — CLAUDE.md

## Čo je tento projekt
Next.js 16 (App Router) dashboard pre interné použitie v autobazári Autorro. Zobrazuje štatistiky maklérov, zdravie ponuky, kalkulačku cien áut a ďalšie metriky. Dáta pochádzajú z Pipedrive CRM a autobazar.eu.

## Tech stack
- **Next.js 16** + App Router (`app/` adresár)
- **React 19**, **Tailwind CSS v4**
- **Supabase** — auth + databáza (tabuľky: `market_snapshots`, ...)
- **Pipedrive API** — CRM zdroj dealov a kontaktov
- **Anthropic SDK** — AI analýza v kalkulačke (`@anthropic-ai/sdk`)
- **Vercel** — hosting + Cron Jobs

## Prostredie
```
PIPEDRIVE_API_TOKEN=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
CRON_SECRET=...
NEXT_PUBLIC_ADMIN_EMAILS=tomas@autorro.sk,...
NEXT_PUBLIC_APP_URL=https://autorro-dashboard-git-dev-tomasmartisnms-projects.vercel.app
```

## Deploy
- Branch `dev` → Vercel preview (testovanie)
- Branch `main` → Vercel production

## Štruktúra projektu
```
app/
  (dashboard)/          ← všetky chránené stránky (layout so sidebarom)
    page.js             → 🏆 Leaderboard predaja
    zdravie-ponuky/     → 🏥 Zdravie ponuky
    reakčný-čas/        → ⚡ Reakčný čas
    cas-predaja/        → 🕐 Čas predaja
    znacky/             → 🚘 Značky vozidiel
    konverzia/          → 🎯 Konverzia leadov
    vyhodnotenie-callcentra/ → 📞 Vyhodnotenie callcentra
    kalkulacka/         → 🧮 Kalkulačka ocenenia
    users/              → 👥 Používatelia (admin only)
    zmena-hesla/        → 🔑 Zmena hesla
  api/
    leaderboard/        → API pre leaderboard
    zdravie-ponuky/     → API pre zdravie ponuky
    reakčný-čas/        → API pre reakčný čas
    cas-predaja/        → API pre čas predaja
    znacky/             → API pre značky
    wasitlead-conversion/ → API pre konverziu leadov
    optimcall/          → API pre callcentrum (Optimcall)
    kalkulacka/         → API pre kalkulačku (+ /ai subendpoint)
    cron/               → Cron joby (warm, market-data)
    snapshot/           → Nočný snapshot Pipedrive dát do Supabase
    pipedrive/          → Utility Pipedrive routes
lib/
  constants.js          → Zdieľané Pipedrive field keys a konštanty
  pipedrive.js          → fetchAllPages() helper
  supabase.js           → Supabase client (browser)
  supabase-server.js    → Supabase client (server, service role)
  user-context.js       → React context pre rolu používateľa
```

## Zdieľané konštanty (lib/constants.js)
```js
INZEROVANE_STAGES = [13, 31, 34, 22]   // stage IDs pre "inzerované" v Pipedrive
EXCLUDE = ['Development', 'Tomáš Martiš', 'Miroslav Hrehor', 'Peter Hudec', 'Jaroslav Kováč']
CENA_KEY      // Pipedrive: Cena je OK (enum)
ODP_AUTORRO   // Pipedrive: Odporúčaná cena – AUTORRO
CENA_VOZIDLA  // Pipedrive: Cena vozidla
```

## Kancelárie maklérov
BB, TT, NR, BA, TN, ZA, PP, KE — zoznam maklérov per kancelária je v `SalesLeaderboardClient.js`

## Autentifikácia
Supabase Auth. Roly: `admin` (email v `NEXT_PUBLIC_ADMIN_EMAILS`) vs. bežný používateľ. Admin vidí všetkých maklérov, bežný len seba.

## CLAUDE.md pre jednotlivé sekcie
- `app/(dashboard)/CLAUDE.md` — Leaderboard + Zdravie ponuky + všeobecné UI
- `app/(dashboard)/kalkulacka/CLAUDE.md` — Kalkulačka ocenenia (najkomplexnejšia časť)
- `app/(dashboard)/reakčný-čas/CLAUDE.md` — Reakčný čas + Čas predaja
- `app/(dashboard)/konverzia/CLAUDE.md` — Konverzia leadov + Callcentrum
- `app/api/cron/CLAUDE.md` — Cron joby + snapshot
