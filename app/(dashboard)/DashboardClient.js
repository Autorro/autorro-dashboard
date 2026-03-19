"use client";
import { useEffect, useRef, useState } from "react";

const CONFETTI_EMOJIS = ["🎉","🎊","⭐","✨","🌟","💥","🎈","🏆","🥇","💰","🚗"];
const CONFETTI_COUNT  = 40;

function Fireworks() {
  const particles = useRef(
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id:    i,
      emoji: CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length],
      left:  Math.random() * 100,
      delay: Math.random() * 1.2,
      dur:   1.8 + Math.random() * 1.2,
      size:  1.4 + Math.random() * 1.4,
      rot:   Math.random() * 720 - 360,
    }))
  ).current;

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-80px) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(var(--rot)); opacity: 0; }
        }
        .confetti-particle {
          position: fixed;
          top: 0;
          pointer-events: none;
          z-index: 9999;
          animation: confettiFall var(--dur) ease-in var(--delay) forwards;
          font-size: var(--size);
          will-change: transform;
        }
      `}</style>
      {particles.map(p => (
        <span key={p.id} className="confetti-particle" style={{
          left:    p.left + "vw",
          "--delay": p.delay + "s",
          "--dur":   p.dur   + "s",
          "--size":  p.size  + "rem",
          "--rot":   p.rot   + "deg",
        }}>
          {p.emoji}
        </span>
      ))}
    </>
  );
}

const OFFICES = {
  "Všetky": null,
  "BB": ["Dominika Kompaniková", "Dominka Kompaníková", "Milan Kováč", "Andrej Čík", "Tomáš Urbán", "Tomás Urban", "Dávid Juhaniak", "David Juhaniak"],
  "TT": ["Bálint Forró", "Bálint Forro", "Tomáš Opálek", "Karolína Lisická", "Martin Blažek", "Lukáš Krommel"],
  "NR": ["Martin Petráš", "Dávid Kalužák", "David Kalužák", "Daniel Kádek", "Gabriela Šodorová", "Dávid Čintala"],
  "BA": ["Milan Švorc", "Ján Mikuš", "Richard Kiss", "Karin Harvan", "Matej Hromada", "Milan Pulc", "Martin Bošeľa", "Peter Maťo", "Jonathán Pavelka", "Matej Klačko", "Dominik Ďurčo"],
  "TN": ["Libor Koníček", "Tomáš Otrubný", "Peter Mjartan", "Martin Mečiar", "Ján Skovajsa", "Tomáš Kučerka", "Patrik Frič"],
  "ZA": ["Tomáš Smieško", "Daniel Jašek", "Vladko Hess", "Wlodzimierz Hess", "Irena Varadová", "Matej Gažo", "Veronika Maťková", "Tomáš Ďurana"],
  "PP": ["Sebastián Čuban", "Tomáš Matta"],
  "KE": ["Ján Tej", "Adrián Šomšág", "Viliam Baran", "Jaroslav Hažlinský", "Martin Živčák", "Ján Slivka"]
};

const EXCLUDE       = ["Development", "Tomáš Martiš", "Miroslav Hrehor", "Peter Hudec", "Jaroslav Kováč"];
const CENA_KEY      = "880011fdbacbc3eee50103ec49001ac8abd56ae1"; // Cena je OK (enum, 100 = áno)
const ODP_AUTORRO   = "b4d54b0e06789b713abe1062178c19490259e00a"; // Odporúčaná cena - AUTORRO
const CENA_VOZIDLA  = "7bc01b48cc10642c58f19ce14bb33fe8abb7bb97"; // Cena vozidla

function norm(s) {
  return (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}

function nameMatchesOffice(name, officeNames) {
  if (!officeNames) return true;
  const n = norm(name);
  return officeNames.some(alias => norm(alias) === n);
}

function getHealth(pct) {
  if (pct >= 50) return { label: "Výborné", color: "text-green-400" };
  if (pct >= 35) return { label: "Priemerné", color: "text-yellow-400" };
  return { label: "Slabé", color: "text-red-400" };
}

function HealthBar({ pct, dark }) {
  const color = pct >= 50 ? "bg-green-500" : pct >= 35 ? "bg-yellow-500" : "bg-red-500";
  const track = dark ? "bg-gray-700" : "bg-gray-300";
  return (
    <div className={"w-full rounded-full h-2 mt-1 " + track}>
      <div className={color + " h-2 rounded-full"} style={{ width: pct + "%" }}></div>
    </div>
  );
}

function fmtMoney(val, currency) {
  if (val == null || val === 0) return "—";
  return new Intl.NumberFormat("sk-SK", { style: "currency", currency: currency || "EUR", maximumFractionDigits: 0 }).format(val);
}

function fmt(isoStr) {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleDateString("sk-SK", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Price diff logic: (selling - recommended) / recommended * 100
// Positive = selling price is ABOVE recommended (bad)
// Negative = below recommended (good)
function getPriceDiff(selling, recommended) {
  if (!selling || !recommended || recommended === 0) return null;
  return Math.round(((selling - recommended) / recommended) * 100 * 10) / 10;
}

function PriceDiffBadge({ diff }) {
  if (diff === null) return <span className="text-gray-400">—</span>;
  if (diff > 10)  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">+{diff}% ↑</span>;
  if (diff > 0)   return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">+{diff}%</span>;
  if (diff === 0) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">OK</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">{diff}% ↓</span>;
}

const REFRESH_SEC = 180; // 3 minúty

function computeBrokerHealth(deals) {
  const map = {};
  deals.forEach(d => {
    const name = d.owner_name || "Neznámy";
    if (EXCLUDE.includes(name)) return;
    if (!map[name]) map[name] = { ok: 0, total: 0 };
    map[name].total++;
    if (d[CENA_KEY] == 100) map[name].ok++;
  });
  const out = {};
  Object.entries(map).forEach(([name, s]) => {
    out[name] = s.total > 0 ? Math.round((s.ok / s.total) * 100) : 0;
  });
  return out;
}

export default function DashboardClient() {
  const [deals, setDeals]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [office, setOffice]     = useState("Všetky");
  const [dark, setDark]         = useState(false);
  const [expanded, setExpanded] = useState({});
  const [partyMode, setPartyMode]       = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [countdown, setCountdown]       = useState(REFRESH_SEC);
  const [history, setHistory]           = useState([]); // [{time, health:{name:pct}, prices}]
  const [refreshing, setRefreshing]     = useState(false);
  const baselineRef       = useRef(null);
  const baselinePricesRef = useRef(null);
  const intervalRef       = useRef(null);
  const countdownRef      = useRef(null);

  function loadDeals(force = false) {
    setRefreshing(true);
    fetch("/api/zdravie-ponuky" + (force ? "?force=1" : ""))
      .then(r => r.json())
      .then(data => {
        setDeals(data);
        setLoading(false);
        setRefreshing(false);
        const health = computeBrokerHealth(data);
        // Snapshot cien: { dealId → { title, price, owner, currency } }
        const prices = {};
        data.forEach(d => {
          if (!EXCLUDE.includes(d.owner_name) && d[CENA_VOZIDLA] > 0) {
            prices[d.id] = { title: d.title, price: d[CENA_VOZIDLA], owner: d.owner_name, currency: d.currency || "EUR" };
          }
        });
        if (!baselineRef.current)       baselineRef.current       = health;
        if (!baselinePricesRef.current) baselinePricesRef.current = prices;
        setHistory(h => [...h.slice(-9), {
          time: new Date().toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          health,
          prices,
        }]);
      })
      .catch(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { loadDeals(false); }, []);

  useEffect(() => {
    if (!partyMode) {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
      return;
    }
    setCountdown(REFRESH_SEC);
    intervalRef.current = setInterval(() => { loadDeals(true); setCountdown(REFRESH_SEC); }, REFRESH_SEC * 1000);
    countdownRef.current = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 1000);
    return () => { clearInterval(intervalRef.current); clearInterval(countdownRef.current); };
  }, [partyMode]);

  function toggleExpand(name) { setExpanded(e => ({ ...e, [name]: !e[name] })); }

  const bg         = dark ? "text-white" : "text-gray-900";
  const bgStyle    = dark ? {backgroundColor: '#481132'} : {backgroundColor: '#FFFFFF'};
  const cardCls    = dark ? "shadow" : "bg-white shadow";
  const cardStyle  = dark ? {backgroundColor: '#5c1a42'} : {};
  const rowCls     = dark ? "border-gray-700" : "border-gray-100";
  const subRowCls  = dark ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-100";
  const theadCls   = dark ? "text-gray-300" : "text-gray-700";
  const theadStyle = dark ? {backgroundColor: '#3d0e2a'} : {backgroundColor: '#F7F6F4'};
  const subHeadStyle = dark ? {backgroundColor: '#2d0820'} : {backgroundColor: '#EFEFEF'};
  const btnBase    = dark ? "text-gray-300 hover:opacity-80" : "bg-gray-100 text-gray-700 hover:bg-gray-200";

  const cleanDeals  = deals.filter(d => !EXCLUDE.includes(d.owner_name));
  const officeDeals = office === "Všetky" ? cleanDeals : cleanDeals.filter(d =>
    nameMatchesOffice(d.owner_name, OFFICES[office] || [])
  );

  // Build broker map with deal list
  const brokersMap = {};
  officeDeals.forEach(deal => {
    const name = deal.owner_name || "Neznámy";
    if (!brokersMap[name]) brokersMap[name] = { total: 0, ok: 0, nie: 0, deals: [] };
    brokersMap[name].total++;
    if (deal[CENA_KEY] == 100) brokersMap[name].ok++;
    else brokersMap[name].nie++;
    brokersMap[name].deals.push(deal);
  });

  const brokerList = Object.entries(brokersMap)
    .map(([name, s]) => ({ name, ...s, pct: s.total > 0 ? Math.round((s.ok / s.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct);

  const totalOk  = officeDeals.filter(d => d[CENA_KEY] == 100).length;
  const totalPct = officeDeals.length > 0 ? Math.round((totalOk / officeDeals.length) * 100) : 0;
  const health   = getHealth(totalPct);

  const TOP_BRANDS = ["ŠKODA", "VOLKSWAGEN", "BMW", "AUDI", "MERCEDES"];
  const brandStats = TOP_BRANDS.map(brand => {
    const matches = officeDeals.filter(d => d.title && d.title.toUpperCase().includes(brand));
    const pct = officeDeals.length > 0 ? Math.round((matches.length / officeDeals.length) * 100) : 0;
    return { brand, count: matches.length, pct };
  });
  const topBrandTotal = brandStats.reduce((a, b) => a + b.count, 0);
  const topBrandPct   = officeDeals.length > 0 ? Math.round((topBrandTotal / officeDeals.length) * 100) : 0;

  const officeSummary = Object.keys(OFFICES).filter(o => o !== "Všetky").map(o => {
    const names = OFFICES[o];
    const od    = cleanDeals.filter(d => nameMatchesOffice(d.owner_name, names));
    const ok    = od.filter(d => d[CENA_KEY] == 100).length;
    const pct   = od.length > 0 ? Math.round((ok / od.length) * 100) : 0;
    return { name: o, total: od.length, ok, pct };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <div className={"min-h-screen " + bg} style={bgStyle}>
      {showFireworks && <Fireworks />}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-3xl font-bold">Autorro Dashboard</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!partyMode) {
                  baselineRef.current = null;
                  baselinePricesRef.current = null;
                  setHistory([]);
                  setPartyMode(true);
                  setShowFireworks(true);
                  setTimeout(() => setShowFireworks(false), 3500);
                  // Ihneď načítaj čerstvé dáta — leaderboard sa zobrazí okamžite
                  setTimeout(() => loadDeals(true), 50);
                } else {
                  setPartyMode(false);
                }
              }}
              className={"px-4 py-2 rounded-full text-sm font-bold transition-all " + (partyMode ? "text-white animate-pulse" : btnBase)}
              style={partyMode ? { backgroundColor: "#FF501C" } : {}}>
              {partyMode ? "🎉 LIVE" : "🎉 Party Mode"}
            </button>
            <button onClick={() => setDark(!dark)} className={"px-4 py-2 rounded-full text-sm font-medium " + btnBase}>
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
        <p className={"mb-6 " + (dark ? "text-gray-400" : "text-gray-500")}>
          {partyMode
            ? <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-ping" />
                Live – obnovuje sa každých {REFRESH_SEC}s · ďalší refresh za <strong>{countdown}s</strong>
                {refreshing && <span className="ml-2 text-orange-400">⟳ načítavam…</span>}
              </span>
            : "Zdravie ponuky – Stage: Inzerované · klikni na makléra pre detail dealov"}
        </p>

        {loading && (
          <div className="animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={"rounded-xl p-4 h-20 " + (dark ? "bg-[#5c1a42]" : "bg-gray-100")} />
              ))}
            </div>
            <div className={"rounded-xl p-4 mb-6 h-32 " + (dark ? "bg-[#5c1a42]" : "bg-gray-100")} />
            <div className="flex gap-2 mb-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className={"rounded-full h-9 w-16 " + (dark ? "bg-[#5c1a42]" : "bg-gray-100")} />
              ))}
            </div>
            <div className={"rounded-xl h-64 " + (dark ? "bg-[#5c1a42]" : "bg-gray-100")} />
          </div>
        )}

        {!loading && partyMode && history.length > 0 && (() => {
          const snap          = history[history.length - 1];
          const latest        = snap.health;
          const latestPrices  = snap.prices || {};
          const baseline      = baselineRef.current || latest;
          const baselinePrices = baselinePricesRef.current || latestPrices;
          const officeNames   = office === "Všetky" ? null : (OFFICES[office] || []);

          // ── Zníženia cien per deal ────────────────────────────────
          const reducedDeals = Object.entries(latestPrices)
            .filter(([, d]) => nameMatchesOffice(d.owner, officeNames))
            .filter(([id, d]) => {
              const base = baselinePrices[id];
              return base && d.price < base.price;
            })
            .map(([id, d]) => {
              const base = baselinePrices[id];
              return {
                id,
                title:     d.title,
                owner:     d.owner,
                reduction: base.price - d.price,
                basePrice: base.price,
                newPrice:  d.price,
                currency:  d.currency,
              };
            });

          // Zníženia zoskupené podľa makléra: { ownerNorm → totalReduction }
          const reductionByBroker = {};
          reducedDeals.forEach(d => {
            const key = norm(d.owner);
            reductionByBroker[key] = (reductionByBroker[key] || 0) + d.reduction;
          });

          const totalReduction = reducedDeals.reduce((s, d) => s + d.reduction, 0);

          // ── Leaderboard ──────────────────────────────────────────
          const partyBrokers = Object.entries(latest)
            .filter(([name]) => nameMatchesOffice(name, officeNames))
            .map(([name, pct]) => {
              const base         = baseline[name] ?? pct;
              const delta        = pct - base;
              const hist         = history.map(h => h.health[name] ?? base);
              const priceReduced = reductionByBroker[norm(name)] || 0;
              return { name, pct, base, delta, hist, priceReduced };
            })
            .sort((a, b) => b.delta !== a.delta ? b.delta - a.delta : b.pct - a.pct);

          const medals = ["🥇", "🥈", "🥉"];
          return (
            <>
              {/* Leaderboard */}
              <div className={"rounded-xl p-4 mb-4 " + cardCls} style={{ ...(dark ? { backgroundColor: "#3d0e2a" } : { backgroundColor: "#fff7f5" }), border: "2px solid #FF501C" }}>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                  <h2 className="text-lg font-bold flex items-center gap-2">🏆 Live leaderboard
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FF501C", color: "white" }}>
                      {history.length} snapshots
                    </span>
                    {office !== "Všetky" && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                        📍 {office}
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-3">
                    {totalReduction > 0 && (
                      <span className="text-sm font-semibold text-green-600">
                        💰 Celkom znížené: <span className="font-extrabold">−{fmtMoney(totalReduction, "EUR")}</span>
                      </span>
                    )}
                    <span className={"text-xs " + (dark ? "text-gray-400" : "text-gray-500")}>Zoradené podľa zlepšenia</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {partyBrokers.map((b, i) => {
                    const h = getHealth(b.pct);
                    const barW = Math.max(b.pct, 2);
                    const barColor = b.pct >= 50 ? "#22c55e" : b.pct >= 35 ? "#eab308" : "#ef4444";
                    // Deals tohto makléra so znížením
                    const brokerDeals = reducedDeals
                      .filter(d => norm(d.owner) === norm(b.name))
                      .sort((a, z) => z.reduction - a.reduction);
                    return (
                      <div key={b.name} className={"rounded-lg p-3 " + (dark ? "bg-[#481132]" : "bg-white shadow-sm")}>
                        {/* Riadok 1: medaila, meno, zdravie %, delta */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-lg w-7 text-center shrink-0">{medals[i] || `${i + 1}.`}</span>
                          <span className="font-semibold flex-1 text-sm truncate">{b.name}</span>
                          <span className={"font-bold text-sm " + h.color}>{b.pct}%</span>
                          <span className={"text-sm font-bold px-2 py-0.5 rounded-full " + (b.delta > 0 ? "bg-green-100 text-green-700" : b.delta < 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500")}>
                            {b.delta > 0 ? `+${b.delta}%` : b.delta < 0 ? `${b.delta}%` : "—"}
                            {b.delta > 0 ? " ↑" : b.delta < 0 ? " ↓" : ""}
                          </span>
                          {b.priceReduced > 0 && (
                            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full shrink-0">
                              −{fmtMoney(b.priceReduced, "EUR")}
                            </span>
                          )}
                        </div>
                        {/* Riadok 2: progress bar + sparkline */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={"flex-1 rounded-full h-2.5 " + (dark ? "bg-gray-700" : "bg-gray-100")}>
                            <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: barW + "%", backgroundColor: barColor }} />
                          </div>
                          <div className="flex gap-0.5 items-end h-4">
                            {b.hist.map((v, j) => (
                              <div key={j} className="w-1.5 rounded-sm transition-all" style={{
                                height: Math.max(4, Math.round((v / 100) * 16)) + "px",
                                backgroundColor: v >= 50 ? "#22c55e" : v >= 35 ? "#eab308" : "#ef4444",
                                opacity: 0.4 + (j / b.hist.length) * 0.6
                              }} />
                            ))}
                          </div>
                        </div>
                        {/* Riadok 3: znížené dealy tohto makléra */}
                        {brokerDeals.length > 0 && (
                          <div className={"flex flex-col gap-1 mt-2 pt-2 border-t " + (dark ? "border-gray-700" : "border-gray-100")}>
                            {brokerDeals.map(d => (
                              <div key={d.id} className="flex items-center justify-between text-xs gap-2">
                                <a href={`https://autorro.pipedrive.com/deal/${d.id}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="truncate hover:underline flex-1" style={{ color: "#FF501C" }}>
                                  {d.title || `#${d.id}`}
                                </a>
                                <span className={"shrink-0 " + (dark ? "text-gray-400" : "text-gray-400")}>
                                  <span className="line-through">{fmtMoney(d.basePrice, d.currency)}</span>
                                  <span className="mx-1">→</span>
                                  <span>{fmtMoney(d.newPrice, d.currency)}</span>
                                </span>
                                <span className="font-bold text-green-600 shrink-0">−{fmtMoney(d.reduction, d.currency)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })()}

        {!loading && <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <div className={"rounded-xl p-4 " + cardCls}>
              <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Celkom dealov</p>
              <p className="text-2xl font-bold">{officeDeals.length}</p>
            </div>
            <div className={"rounded-xl p-4 " + cardCls}>
              <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Cena OK</p>
              <p className="text-2xl font-bold text-green-400">{totalOk}</p>
            </div>
            <div className={"rounded-xl p-4 " + cardCls}>
              <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Cena nie OK</p>
              <p className="text-2xl font-bold text-red-400">{officeDeals.length - totalOk}</p>
            </div>
            <div className={"rounded-xl p-4 " + cardCls}>
              <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Zdravie ponuky</p>
              <p className={"text-2xl font-bold " + health.color}>{totalPct}% – {health.label}</p>
            </div>
          </div>

          {/* Top 5 značiek */}
          <div className={"rounded-xl p-4 mb-6 " + cardCls} style={cardStyle}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">Top 5 značiek v ponuke</h2>
              <span className={"text-sm font-medium " + (dark ? "text-gray-400" : "text-gray-500")}>
                {topBrandTotal} vozidiel ({topBrandPct}% ponuky)
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {brandStats.map(({ brand, count, pct }) => (
                <div key={brand}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{brand}</span>
                    <span className={dark ? "text-gray-400" : "text-gray-500"}>{count} ks &nbsp;·&nbsp; {pct}%</span>
                  </div>
                  <div className={"w-full rounded-full h-2 " + (dark ? "bg-gray-700" : "bg-gray-200")}>
                    <div className="h-2 rounded-full" style={{ width: pct + "%", backgroundColor: "#FF501C" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Office filter */}
          <div className="flex flex-wrap gap-2 mb-4 md:mb-8">
            {Object.keys(OFFICES).map(o => (
              <button key={o} onClick={() => setOffice(o)}
                className={"px-4 py-2 rounded-full text-sm font-medium " + (office === o ? "text-white" : btnBase)}
                style={office === o ? {backgroundColor: "#FF501C"} : {}}>
                {o}
              </button>
            ))}
          </div>

          {/* Office summary cards */}
          {office === "Všetky" && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Prehľad kancelárií</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {officeSummary.map(o => {
                  const h = getHealth(o.pct);
                  return (
                    <div key={o.name} onClick={() => setOffice(o.name)} className={"rounded-xl p-4 cursor-pointer hover:opacity-80 " + cardCls}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-lg">{o.name}</span>
                        <span className={"font-bold " + h.color}>{o.pct}%</span>
                      </div>
                      <HealthBar pct={o.pct} dark={dark} />
                      <p className={"text-xs mt-2 " + (dark ? "text-gray-400" : "text-gray-500")}>{o.ok} / {o.total} dealov</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Broker table with expandable rows */}
          <h2 className="text-xl font-semibold mb-4">
            {office === "Všetky" ? "Všetci makléri" : "Makléri – " + office}
          </h2>
          <table className="w-full text-sm">
              <thead className={theadCls} style={theadStyle}>
                <tr>
                  <th className="p-3 text-left w-8"></th>
                  <th className="p-3 text-left hidden md:table-cell">#</th>
                  <th className="p-3 text-left">Maklér</th>
                  <th className="p-3 text-left">Celkom</th>
                  <th className="p-3 text-left hidden md:table-cell">Áno</th>
                  <th className="p-3 text-left hidden md:table-cell">Nie</th>
                  <th className="p-3 text-left">Zdravie</th>
                  <th className="p-3 text-left w-32 hidden md:table-cell">Graf</th>
                </tr>
              </thead>
              <tbody>
                {brokerList.map((b, i) => {
                  const h      = getHealth(b.pct);
                  const isOpen = !!expanded[b.name];
                  const sortedDeals = [...b.deals].sort((a, z) => {
                    const aOk = a[CENA_KEY] == 100;
                    const zOk = z[CENA_KEY] == 100;
                    if (!aOk && zOk) return -1;
                    if (aOk && !zOk) return 1;
                    const aDiff = getPriceDiff(a[CENA_VOZIDLA], a[ODP_AUTORRO]) ?? 0;
                    const zDiff = getPriceDiff(z[CENA_VOZIDLA], z[ODP_AUTORRO]) ?? 0;
                    return zDiff - aDiff;
                  });

                  return (
                    <>
                      <tr key={b.name}
                        className={"border-t cursor-pointer hover:opacity-80 " + rowCls}
                        onClick={() => toggleExpand(b.name)}>
                        <td className="p-3 text-center text-gray-400 select-none text-base">{isOpen ? "▾" : "▸"}</td>
                        <td className="p-3 text-gray-500 hidden md:table-cell">{i + 1}</td>
                        <td className="p-3 font-medium">{b.name}</td>
                        <td className="p-3">{b.total}</td>
                        <td className="p-3 text-green-400 hidden md:table-cell">{b.ok}</td>
                        <td className="p-3 text-red-400 hidden md:table-cell">{b.nie}</td>
                        <td className={"p-3 font-bold " + h.color}>{b.pct}%</td>
                        <td className="p-3 hidden md:table-cell"><HealthBar pct={b.pct} dark={dark} /></td>
                      </tr>

                      {isOpen && (
                        <tr key={b.name + "_detail"} className={"border-t " + rowCls}>
                          <td colSpan={8} className="p-2">
                            <div className="border-l-4 rounded-lg overflow-hidden" style={{ borderColor: "#FF501C" }}>
                              {/* Mobile: cards */}
                              <div className="md:hidden flex flex-col gap-2 p-2">
                                {sortedDeals.map(d => {
                                  const cenaOk  = d[CENA_KEY] == 100;
                                  const cenaVoz = d[CENA_VOZIDLA];
                                  const odAut   = d[ODP_AUTORRO];
                                  const diff    = getPriceDiff(cenaVoz, odAut);
                                  const cardBg  = !cenaOk && diff > 10
                                    ? (dark ? "bg-red-950" : "bg-red-50 border border-red-200")
                                    : !cenaOk
                                    ? (dark ? "bg-yellow-950" : "bg-yellow-50 border border-yellow-200")
                                    : (dark ? "bg-gray-800" : "bg-white border border-gray-100");
                                  return (
                                    <div key={d.id} className={"rounded-lg p-3 text-xs " + cardBg}>
                                      <div className="flex justify-between items-start mb-2">
                                        <a href={`https://autorro.pipedrive.com/deal/${d.id}`}
                                          target="_blank" rel="noopener noreferrer"
                                          className="font-semibold hover:underline leading-tight" style={{ color: "#FF501C" }}
                                          onClick={e => e.stopPropagation()}>
                                          {d.title || "—"}
                                        </a>
                                        {cenaOk
                                          ? <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 shrink-0">✓ OK</span>
                                          : <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 shrink-0">✗ Nie</span>}
                                      </div>
                                      <div className="grid grid-cols-2 gap-1 text-gray-500">
                                        <span>#{d.id}</span><span>{fmt(d.add_time)}</span>
                                        <span>Cena: <span className="font-medium text-gray-800">{fmtMoney(cenaVoz, d.currency)}</span></span>
                                        <span>Odp: <span className="font-medium text-gray-800">{fmtMoney(odAut, d.currency)}</span></span>
                                      </div>
                                      {diff !== null && <div className="mt-1"><PriceDiffBadge diff={diff} /></div>}
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Desktop: table */}
                              <table className="hidden md:table w-full text-xs">
                                <thead style={subHeadStyle}>
                                  <tr className={theadCls}>
                                    <th className="px-3 py-2 text-left">ID</th>
                                    <th className="px-3 py-2 text-left">Názov dealu</th>
                                    <th className="px-3 py-2 text-left">Otvorený</th>
                                    <th className="px-3 py-2 text-left">Cena vozidla</th>
                                    <th className="px-3 py-2 text-left">Odp. cena Autorro</th>
                                    <th className="px-3 py-2 text-left">% rozdiel</th>
                                    <th className="px-3 py-2 text-left">Cena OK</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sortedDeals.map(d => {
                                    const cenaOk  = d[CENA_KEY] == 100;
                                    const cenaVoz = d[CENA_VOZIDLA];
                                    const odAut   = d[ODP_AUTORRO];
                                    const diff    = getPriceDiff(cenaVoz, odAut);
                                    const rowBg   = !cenaOk && diff > 10
                                      ? (dark ? "bg-red-950" : "bg-red-50")
                                      : !cenaOk ? (dark ? "bg-yellow-950" : "bg-yellow-50") : "";
                                    return (
                                      <tr key={d.id} className={"border-t " + subRowCls + " " + rowBg}>
                                        <td className="px-3 py-2 text-gray-500 font-mono">#{d.id}</td>
                                        <td className="px-3 py-2 font-medium max-w-[200px] truncate" title={d.title}>
                                          <a href={`https://autorro.pipedrive.com/deal/${d.id}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="hover:underline" style={{ color: "#FF501C" }}
                                            onClick={e => e.stopPropagation()}>
                                            {d.title || "—"}
                                          </a>
                                        </td>
                                        <td className="px-3 py-2">{fmt(d.add_time)}</td>
                                        <td className="px-3 py-2 font-medium">{fmtMoney(cenaVoz, d.currency)}</td>
                                        <td className="px-3 py-2">{fmtMoney(odAut, d.currency)}</td>
                                        <td className="px-3 py-2"><PriceDiffBadge diff={diff} /></td>
                                        <td className="px-3 py-2">
                                          {cenaOk
                                            ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Áno</span>
                                            : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">✗ Nie</span>}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
        </>}
      </div>
    </div>
  );
}
