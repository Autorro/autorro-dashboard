"use client";
import { useEffect, useState } from "react";

/* ── Kancelárie ── */
const OFFICES = {
  "Všetky": null,
  "BB": ["Dominika Kompaniková","Dominka Kompaníková","Milan Kováč","Andrej Čík","Tomáš Urbán","Tomás Urban","Dávid Juhaniak","David Juhaniak"],
  "TT": ["Bálint Forró","Bálint Forro","Tomáš Opálek","Karolína Lisická","Martin Blažek","Lukáš Krommel"],
  "NR": ["Martin Petráš","Dávid Kalužák","David Kalužák","Daniel Kádek","Gabriela Šodorová","Dávid Čintala"],
  "BA": ["Milan Švorc","Ján Mikuš","Richard Kiss","Karin Harvan","Matej Hromada","Milan Pulc","Martin Bošeľa","Peter Maťo","Jonathán Pavelka","Matej Klačko","Dominik Ďurčo"],
  "TN": ["Libor Koníček","Tomáš Otrubný","Peter Mjartan","Martin Mečiar","Ján Skovajsa","Tomáš Kučerka","Patrik Frič"],
  "ZA": ["Tomáš Smieško","Daniel Jašek","Vladko Hess","Wlodzimierz Hess","Irena Varadová","Matej Gažo","Veronika Maťková","Tomáš Ďurana"],
  "PP": ["Sebastián Čuban","Tomáš Matta"],
  "KE": ["Ján Tej","Adrián Šomšág","Viliam Baran","Jaroslav Hažlinský","Martin Živčák","Ján Slivka"],
};
const EXCLUDE = ["Development","Tomáš Martiš","Miroslav Hrehor","Peter Hudec","Jaroslav Kováč"];

/* ── Kariérne pozície (objem historicky = deal.value all-time) ── */
const TIERS = [
  { id: "M1", label: "M1", min: 0,       max: 30_000,  color: "#6b7280", bg: "#f3f4f6", hotovostna: 40, uverova: 20 },
  { id: "M2", label: "M2", min: 30_000,  max: 100_000, color: "#2563eb", bg: "#eff6ff", hotovostna: 45, uverova: 20 },
  { id: "M3", label: "M3", min: 100_000, max: 200_000, color: "#16a34a", bg: "#f0fdf4", hotovostna: 50, uverova: 25 },
  { id: "M4", label: "M4", min: 200_000, max: 400_000, color: "#d97706", bg: "#fffbeb", hotovostna: 60, uverova: 25 },
  { id: "M5", label: "M5", min: 400_000, max: 800_000, color: "#ea580c", bg: "#fff7ed", hotovostna: 75, uverova: 25 },
  { id: "M6", label: "M6", min: 800_000, max: Infinity, color: "#7c3aed", bg: "#f5f3ff", hotovostna: 90, uverova: 25 },
];

function getTier(allTimeTotal) {
  return TIERS.findLast(t => allTimeTotal >= t.min) || TIERS[0];
}

function getTierProgress(allTimeTotal) {
  const tier = getTier(allTimeTotal);
  if (tier.max === Infinity) return { tier, pct: 100, remaining: 0, next: null };
  const pct       = Math.min(100, ((allTimeTotal - tier.min) / (tier.max - tier.min)) * 100);
  const remaining = tier.max - allTimeTotal;
  const next      = TIERS[TIERS.indexOf(tier) + 1] || null;
  return { tier, pct, remaining, next };
}

/* ── Kurzy ── */
const FX = { EUR: 1, CZK: 1 / 25.5 };
function toEur(value, currency) {
  return value * (FX[currency] ?? 1);
}

/* ── Helpers ── */
function norm(s) {
  return (s || "").normalize("NFD").replace(/\p{Diacritic}/gu,"").trim().toLowerCase();
}
function inOffice(name, officeNames) {
  if (!officeNames) return true;
  const n = norm(name);
  return officeNames.some(a => norm(a) === n);
}
function fmtMoney(v) {
  return new Intl.NumberFormat("sk-SK", { style:"currency", currency:"EUR", maximumFractionDigits: 0 }).format(v);
}
function fmtOrig(v, currency) {
  if (currency === "EUR") return null;
  return new Intl.NumberFormat("sk-SK", { style:"currency", currency, maximumFractionDigits: 0 }).format(v);
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sk-SK", { day:"2-digit", month:"2-digit", year:"numeric" });
}

/* ── Prednastavené obdobia ── */
function getRange(period) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  switch (period) {
    case "Tento mesiac":        return { from: new Date(y, m, 1),   to: new Date(y, m+1, 0) };
    case "Minulý mesiac":       return { from: new Date(y, m-1, 1), to: new Date(y, m, 0)   };
    case "Posledné 3 mesiace":  return { from: new Date(y, m-2, 1), to: new Date(y, m+1, 0) };
    case "Tento rok":           return { from: new Date(y, 0, 1),   to: new Date(y, 11, 31) };
    default:                    return null;
  }
}

const PERIODS = ["Tento mesiac","Minulý mesiac","Posledné 3 mesiace","Tento rok","Vlastné"];
const MEDALS  = ["🥇","🥈","🥉"];
const ACCENT  = "#FF501C";
const cardCls = "bg-white shadow-sm rounded-xl";

/* ── Tier badge komponent ── */
function TierBadge({ tier, size = "md" }) {
  const cls = size === "sm"
    ? "text-xs px-1.5 py-0.5 rounded font-bold"
    : "text-xs px-2 py-1 rounded-md font-extrabold tracking-wide";
  return (
    <span className={cls} style={{ backgroundColor: tier.bg, color: tier.color, border: `1.5px solid ${tier.color}` }}>
      {tier.label}
    </span>
  );
}

/* ── Tier progress bar ── */
function TierProgressBar({ allTimeTotal }) {
  const { tier, pct, remaining, next } = getTierProgress(allTimeTotal);
  return (
    <div className="mt-1">
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-full max-w-xs">
        <div className="h-full rounded-full transition-all" style={{ width: pct + "%", backgroundColor: tier.color }} />
      </div>
      {next && (
        <p className="text-xs mt-0.5" style={{ color: tier.color }}>
          do {next.label}: {fmtMoney(remaining)}
        </p>
      )}
    </div>
  );
}

/* ── Hlavný komponent ── */
export default function SalesLeaderboardClient() {
  const [allDeals, setAllDeals] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [office,   setOffice]   = useState("Všetky");
  const [period,   setPeriod]   = useState("Tento mesiac");
  const [from,     setFrom]     = useState("");
  const [to,       setTo]       = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/leaderboard")
      .then(r => r.json())
      .then(d => setAllDeals(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  /* ── All-time historický objem podľa makléra (bez filtra dátumu/kancelárie) ── */
  const allTimeByBroker = {};
  for (const d of allDeals) {
    if (EXCLUDE.some(e => norm(e) === norm(d.owner))) continue;
    if (!allTimeByBroker[d.owner]) allTimeByBroker[d.owner] = 0;
    allTimeByBroker[d.owner] += toEur(d.cenaVozidla, d.currency);
  }

  /* ── Filter podľa dátumu + kancelárie ── */
  const range = period === "Vlastné"
    ? (from && to ? { from: new Date(from), to: new Date(to + "T23:59:59") } : null)
    : getRange(period);

  const filtered = allDeals.filter(d => {
    if (EXCLUDE.some(e => norm(e) === norm(d.owner))) return false;
    if (!inOffice(d.owner, OFFICES[office])) return false;
    if (!d.wonTime) return false;
    if (range) {
      const t = new Date(d.wonTime);
      if (t < range.from || t > range.to) return false;
    }
    return true;
  });

  /* ── Agregácia podľa makléra ── */
  const brokerMap = {};
  for (const d of filtered) {
    if (!brokerMap[d.owner]) brokerMap[d.owner] = { count: 0, total: 0, deals: [] };
    brokerMap[d.owner].count += 1;
    brokerMap[d.owner].total += toEur(d.cenaVozidla, d.currency);
    brokerMap[d.owner].deals.push(d);
  }
  const brokers = Object.entries(brokerMap)
    .map(([name, s]) => ({
      name, ...s,
      avg:         s.total / s.count,
      allTimeTotal: allTimeByBroker[name] || 0,
    }))
    .sort((a, b) => b.total - a.total || b.count - a.count);

  const totalDeals   = brokers.reduce((s, b) => s + b.count, 0);
  const totalRevenue = brokers.reduce((s, b) => s + b.total, 0);
  const avgPerDeal   = totalDeals ? totalRevenue / totalDeals : 0;

  /* ── Skeleton ── */
  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-gray-200 rounded-xl w-1/2" />
      <div className="h-28 bg-gray-200 rounded-xl" />
      {[...Array(6)].map((_,i) => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── Nadpis ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏆 Leaderboard predaja</h1>
          <p className="text-sm text-gray-500 mt-0.5">Predané vozidlá a obrat podľa makléra · pozícia = kariérny objem</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetch("/api/leaderboard?force=1").then(r=>r.json()).then(d=>setAllDeals(Array.isArray(d)?d:[])).finally(()=>setLoading(false)); }}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center gap-1"
        >🔄 Obnoviť</button>
      </div>

      {/* ── Legenda pozícií ── */}
      <div className={cardCls + " p-4"}>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Kariérne pozície — kumulatívny objem dealov</p>
        <div className="flex flex-wrap gap-2">
          {TIERS.map(t => (
            <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: t.bg, border: `1px solid ${t.color}20` }}>
              <span className="text-xs font-extrabold" style={{ color: t.color }}>{t.label}</span>
              <span className="text-xs text-gray-500">
                {t.max === Infinity ? `${fmtMoney(t.min)}+` : `${fmtMoney(t.min)} – ${fmtMoney(t.max)}`}
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs font-medium" style={{ color: t.color }}>{t.hotovostna}% hot.</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filtre ── */}
      <div className={cardCls + " p-4 flex flex-wrap gap-3 items-end"}>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kancelária</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(OFFICES).map(o => (
              <button key={o} onClick={() => setOffice(o)}
                className="px-3 py-1 rounded-full text-sm font-medium transition-colors"
                style={office === o ? { backgroundColor: ACCENT, color:"white" } : { backgroundColor:"#f3f4f6", color:"#374151" }}
              >{o}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Obdobie</label>
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-3 py-1 rounded-full text-sm font-medium transition-colors"
                style={period === p ? { backgroundColor:"#1e3a5f", color:"white" } : { backgroundColor:"#f3f4f6", color:"#374151" }}
              >{p}</button>
            ))}
          </div>
        </div>
        {period === "Vlastné" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Od</label>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Do</label>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2" />
            </div>
          </div>
        )}
      </div>

      {/* ── Súhrnné karty ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label:"Predané vozidlá",   value: totalDeals,    fmt: v=>v,        suffix:" ks", color:"#1e3a5f" },
          { label:"Celkový obrat",     value: totalRevenue,  fmt: fmtMoney,    suffix:"",   color:"#15803d" },
          { label:"Priemerná hodnota", value: avgPerDeal,    fmt: fmtMoney,    suffix:"",   color:"#9333ea" },
        ].map(s => (
          <div key={s.label} className={cardCls + " p-4"}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.fmt(s.value)}{s.suffix}</p>
          </div>
        ))}
      </div>

      {/* ── Leaderboard ── */}
      {brokers.length === 0 ? (
        <div className={cardCls + " p-8 text-center text-gray-500"}>Žiadne predaje v zvolenom období.</div>
      ) : (
        <div className="space-y-2">
          {brokers.map((b, i) => {
            const isExpanded              = expanded === b.name;
            const sharePct                = totalRevenue ? (b.total / totalRevenue * 100) : 0;
            const { tier, pct: tierPct, remaining, next } = getTierProgress(b.allTimeTotal);

            return (
              <div key={b.name} className={cardCls + " overflow-hidden"}>
                {/* ── Riadok makléra ── */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : b.name)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Rank */}
                  <span className="text-xl w-8 text-center flex-shrink-0">
                    {i < 3 ? MEDALS[i] : <span className="text-gray-400 font-bold text-base">#{i+1}</span>}
                  </span>

                  {/* Meno + tier progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 truncate">{b.name}</p>
                      <TierBadge tier={tier} />
                    </div>
                    {/* Progress k ďalšej pozícii */}
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full max-w-xs">
                      <div className="h-full rounded-full transition-all" style={{ width: tierPct + "%", backgroundColor: tier.color }} />
                    </div>
                    {next ? (
                      <p className="text-xs mt-0.5" style={{ color: tier.color }}>
                        do {next.label}: chýba {fmtMoney(remaining)} · kariéra: {fmtMoney(b.allTimeTotal)}
                      </p>
                    ) : (
                      <p className="text-xs mt-0.5 font-semibold" style={{ color: tier.color }}>
                        ✦ Maximálna pozícia · kariéra: {fmtMoney(b.allTimeTotal)}
                      </p>
                    )}
                  </div>

                  {/* Počet */}
                  <div className="text-center hidden sm:block flex-shrink-0 w-16">
                    <p className="text-xl font-extrabold text-gray-900">{b.count}</p>
                    <p className="text-xs text-gray-400">vozidiel</p>
                  </div>

                  {/* Obrat v období */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-extrabold" style={{ color:"#15803d" }}>{fmtMoney(b.total)}</p>
                    <p className="text-xs text-gray-400">ø {fmtMoney(b.avg)}/deal</p>
                  </div>

                  <span className="text-gray-400 flex-shrink-0 ml-1">{isExpanded ? "▲" : "▼"}</span>
                </button>

                {/* ── Detail ── */}
                {isExpanded && (
                  <div className="border-t border-gray-100">

                    {/* Tier karta v detaile */}
                    <div className="px-5 py-3 flex flex-wrap items-center gap-4"
                      style={{ backgroundColor: tier.bg, borderBottom: `1px solid ${tier.color}20` }}>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Kariérna pozícia</p>
                        <div className="flex items-center gap-2">
                          <TierBadge tier={tier} size="lg" />
                          <span className="text-sm font-semibold" style={{ color: tier.color }}>
                            {tier.hotovostna}% hotovostná / {tier.uverova}% úverová
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Kariérny objem (all-time)</p>
                        <p className="text-lg font-extrabold text-gray-900">{fmtMoney(b.allTimeTotal)}</p>
                      </div>
                      {next && (
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Do pozície {next.label}</p>
                          <p className="text-sm font-bold text-gray-700">{fmtMoney(remaining)}</p>
                          <div className="mt-1 h-2 bg-white rounded-full overflow-hidden w-32">
                            <div className="h-full rounded-full" style={{ width: tierPct+"%", backgroundColor: tier.color }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mobile: karty dealov */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {b.deals.sort((a,z) => new Date(z.wonTime) - new Date(a.wonTime)).map(d => {
                        const orig = fmtOrig(d.cenaVozidla, d.currency);
                        const eur  = fmtMoney(toEur(d.cenaVozidla, d.currency));
                        return (
                          <div key={d.id} className="px-4 py-3 flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{d.title}</p>
                              <p className="text-xs text-gray-400">{fmtDate(d.wonTime)}</p>
                            </div>
                            <div className="text-right ml-2">
                              <p className="font-bold text-green-700 text-sm whitespace-nowrap">{orig ?? eur}</p>
                              {orig && <p className="text-xs text-gray-400 whitespace-nowrap">≈ {eur}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop: tabuľka dealov */}
                    <table className="hidden md:table w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs uppercase text-gray-400">
                          <th className="px-5 py-2 text-left font-semibold">Vozidlo</th>
                          <th className="px-5 py-2 text-left font-semibold">Predané dňa</th>
                          <th className="px-5 py-2 text-right font-semibold">Pôvodná hodnota</th>
                          <th className="px-5 py-2 text-right font-semibold">EUR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {b.deals.sort((a,z) => new Date(z.wonTime) - new Date(a.wonTime)).map(d => {
                          const orig = fmtOrig(d.cenaVozidla, d.currency);
                          const eur  = fmtMoney(toEur(d.cenaVozidla, d.currency));
                          return (
                            <tr key={d.id} className="hover:bg-gray-50">
                              <td className="px-5 py-2.5 font-medium text-gray-800">{d.title}</td>
                              <td className="px-5 py-2.5 text-gray-500">{fmtDate(d.wonTime)}</td>
                              <td className="px-5 py-2.5 text-right">
                                {orig ? <span className="font-semibold text-blue-700">{orig}</span> : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-5 py-2.5 text-right font-bold text-green-700">{eur}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-green-50">
                          <td colSpan={3} className="px-5 py-2 text-sm font-semibold text-green-800">Spolu v období (EUR)</td>
                          <td className="px-5 py-2 text-right font-extrabold text-green-800">{fmtMoney(b.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {range && (
        <p className="text-xs text-gray-400 text-center">
          Obdobie: {fmtDate(range.from.toISOString())} – {fmtDate(range.to.toISOString())} · {filtered.length} dealov · cache 5 min
        </p>
      )}
    </div>
  );
}
