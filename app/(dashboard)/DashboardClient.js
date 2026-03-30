"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { EXCLUDE, CENA_KEY, ODP_AUTORRO, CENA_VOZIDLA } from "@/lib/constants";

// ── Inzercia – field keys ──────────────────────────────────────────────────
const AUTOBAZAR_URL_KEY  = '8ad28e02d445f11af2064ed71aab1aa1906db534'; // Autobazar.eu/Sauto.sk (new)
const AUTORRO_URL_KEY    = '65230483051b78019de87ebe7ca1b8380b3e85b2'; // Autorro.sk/cz (new)
const INZEROVANE_OD_KEY  = '3f9740a67e24bf1c3f3e65360abc0673bb07a4a8'; // Inzerované od (date)
// const BAZOS_URL_KEY   = null; // zatiaľ nemáme pole – rezervované pre budúcnosť

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
  if (recommended === 1) return 0; // placeholder hodnota = cena OK
  return Math.round(((selling - recommended) / recommended) * 100 * 10) / 10;
}

function PriceDiffBadge({ diff }) {
  if (diff === null) return <span className="text-gray-400">—</span>;
  if (diff > 10)  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">+{diff}% ↑</span>;
  if (diff > 0)   return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">+{diff}%</span>;
  if (diff === 0) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">OK</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">{diff}% ↓</span>;
}

/* ── Predajnosť badges ── */
function getDays(addTime) {
  if (!addTime) return null;
  return Math.floor((Date.now() - new Date(addTime)) / 864e5);
}

function DaysBadge({ addTime }) {
  const days = getDays(addTime);
  if (days === null) return <span className="text-gray-400">—</span>;
  const cls = days < 45 ? "bg-green-100 text-green-700" : days <= 90 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
  return <span className={"px-2 py-0.5 rounded-full text-xs font-bold " + cls}>{days}d</span>;
}

function KmBadge({ km }) {
  if (!km && km !== 0) return <span className="text-gray-400">—</span>;
  const k = Number(km);
  if (isNaN(k)) return <span className="text-gray-400">—</span>;
  const label = k >= 1000 ? `${Math.round(k / 1000)}k km` : `${k} km`;
  const cls   = k < 100_000 ? "bg-green-100 text-green-700"
              : k < 200_000 ? "bg-gray-100 text-gray-600"
              : k < 250_000 ? "bg-yellow-100 text-yellow-700"
              :               "bg-red-100 text-red-700";
  return <span className={"px-2 py-0.5 rounded-full text-xs font-bold " + cls}>{label}</span>;
}

function RokBadge({ rokRaw }) {
  if (!rokRaw) return <span className="text-gray-400">—</span>;
  let year;
  if (typeof rokRaw === "number" && rokRaw > 1900) year = rokRaw;
  else { const m = String(rokRaw).match(/\b(19|20)\d{2}\b/); year = m ? parseInt(m[0]) : null; }
  if (!year) return <span className="text-gray-400">—</span>;
  const age = new Date().getFullYear() - year;
  const cls = age <= 10 ? "bg-green-100 text-green-700" : age <= 15 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
  return <span className={"px-2 py-0.5 rounded-full text-xs font-bold " + cls}>{year}</span>;
}

/* ── Odporúčanie pre každý deal ── */
function getRecommendation(deal) {
  const days   = getDays(deal.add_time);
  const diff   = getPriceDiff(deal[CENA_VOZIDLA], deal[ODP_AUTORRO]); // null | number
  const km     = deal._km != null ? Number(deal._km) : null;
  const rokRaw = deal._rok;
  let year = null;
  if (typeof rokRaw === "number" && rokRaw > 1900) year = rokRaw;
  else if (rokRaw) { const m = String(rokRaw).match(/\b(19|20)\d{2}\b/); year = m ? parseInt(m[0]) : null; }
  const age    = year ? new Date().getFullYear() - year : null;
  const highKm = km != null && km >= 250_000;
  const oldCar = age != null && age >= 16;

  // ── 90+ dní ────────────────────────────────────────────────
  if (days !== null && days > 90) {
    if (diff !== null && diff > 10)
      return { level: "critical", icon: "🚨", text: "Znížiť cenu ihneď na odporúčanú alebo vyradiť z ponuky" };
    if (diff !== null && diff > 0)
      return { level: "critical", icon: "🚨", text: "Znížiť cenu na odporúčanú alebo vyradiť z ponuky" };
    if (highKm || oldCar)
      return { level: "critical", icon: "🚨", text: "Vyradiť z ponuky – dlho inzerované, " + (highKm ? "vysoký nájazd" : "starší ročník") };
    return { level: "critical", icon: "🔴", text: "Zvážiť vyradenie z ponuky – v inzercii viac ako 90 dní" };
  }

  // ── 45–90 dní ──────────────────────────────────────────────
  if (days !== null && days >= 45) {
    if (diff !== null && diff > 10)
      return { level: "warning", icon: "⚠️", text: "Znížiť cenu – výrazne nad odporúčanou (" + diff + "%)" };
    if (diff !== null && diff > 0)
      return { level: "warning", icon: "⚠️", text: "Zvážiť zníženie ceny – mierne nad odporúčanou" };
    if (highKm)
      return { level: "warning", icon: "⚠️", text: "Monitorovať – vysoký nájazd môže spomaľovať predaj" };
    return { level: "watch", icon: "👁️", text: "Monitorovať – v ponuke 45+ dní" };
  }

  // ── do 45 dní ─────────────────────────────────────────────
  if (diff !== null && diff > 10)
    return { level: "warning", icon: "⚠️", text: "Cena výrazne nad odporúčanou (" + diff + "%) – zvážiť úpravu" };
  if (diff !== null && diff > 0)
    return { level: "ok", icon: "💡", text: "Cena mierne nad odporúčanou – sledovať záujem" };

  return { level: "ok", icon: "✅", text: "V poriadku" };
}

const REC_STYLE = {
  critical: { bg: "bg-red-50",     border: "border-red-200",    text: "text-red-700"    },
  warning:  { bg: "bg-amber-50",   border: "border-amber-200",  text: "text-amber-700"  },
  watch:    { bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700"   },
  ok:       { bg: "bg-green-50",   border: "border-green-200",  text: "text-green-700"  },
};

// ── Pravidlá inzercie – fázy ───────────────────────────────────────────────
function getInzerciaDays(deal) {
  const raw = deal[INZEROVANE_OD_KEY];
  const start = raw
    ? new Date(raw)
    : new Date(new Date(deal.add_time).getTime() + 7 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.floor((Date.now() - start) / 864e5));
}

function getInzerciaFaza(days) {
  if (days <= 90)  return { num: 1, label: 'Fáza 1', bg: 'bg-green-100',  text: 'text-green-700'  };
  if (days <= 180) return { num: 2, label: 'Fáza 2', bg: 'bg-orange-100', text: 'text-orange-700' };
  return             { num: 3, label: 'Fáza 3', bg: 'bg-red-100',    text: 'text-red-700'    };
}

function InzerciaFazaBadge({ deal }) {
  const days  = getInzerciaDays(deal);
  const faza  = getInzerciaFaza(days);
  const is4   = faza.num === 3 && deal[CENA_KEY] != 100;
  if (is4) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
      Fáza 4 · {days}d
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${faza.bg} ${faza.text}`}>
      {faza.label} · {days}d
    </span>
  );
}

function ListingUrlBadge({ url, urlStatuses, label }) {
  if (!url) return null;
  const st = urlStatuses[url];
  const icon = st === 'active'
    ? <span className="text-green-600 font-bold">✓</span>
    : st === 'inactive'
    ? <span className="text-red-500 font-bold">✗</span>
    : null; // čaká na výsledok alebo ešte nebola spustená kontrola
  const cls = st === 'active'
    ? 'bg-green-50 text-green-700 border border-green-200'
    : st === 'inactive'
    ? 'bg-red-50 text-red-700 border border-red-200'
    : 'bg-gray-100 text-gray-600';
  return (
    <a
      href={url} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium hover:opacity-80 transition-colors ${cls}`}
      onClick={e => e.stopPropagation()}
      title={url}
    >
      {label}{icon ? <> {icon}</> : null}
    </a>
  );
}

function RecommendationRow({ deal, dark }) {
  const rec = getRecommendation(deal);
  if (rec.level === "ok" && rec.text === "V poriadku") return null; // neskrývaj ostatné OK odporúčania
  const s = REC_STYLE[rec.level] || REC_STYLE.ok;
  return (
    <div className={"mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium " + s.bg + " " + s.border + " " + s.text}>
      <span>{rec.icon}</span>
      <span>{rec.text}</span>
    </div>
  );
}

/* ── Dumbbell chart – zdravie kancelárií ── */
function OfficeTrendChart({ officeResults, dark }) {
  const W     = 560;
  const LEFT  = 46;   // šírka office labelu
  const CEND  = 450;  // koniec chart oblasti
  const TOP   = 8;
  const ROW_H = 52;
  const H     = TOP + officeResults.length * ROW_H + 30;
  const xOf   = p => LEFT + (p / 100) * (CEND - LEFT);
  const dim   = dark ? '#9ca3af' : '#9ca3af';
  const grid  = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {/* Vertikálne grid čiary */}
      {[0, 25, 50, 75, 100].map(p => (
        <line key={p}
          x1={xOf(p)} y1={TOP} x2={xOf(p)} y2={H - 22}
          stroke={p === 50 ? (dark ? '#4b5563' : '#cbd5e1') : grid}
          strokeWidth={p === 50 ? 1.5 : 1}
          strokeDasharray={p === 50 ? '5 3' : '3 3'} />
      ))}

      {officeResults.map((o, i) => {
        const y  = TOP + i * ROW_H + ROW_H / 2;
        const sp = o.startPct ?? 0;
        const ep = o.endPct   ?? 0;
        const xs = xOf(sp);
        const xe = xOf(ep);
        const pos = o.delta !== null && o.delta > 0;
        const neg = o.delta !== null && o.delta < 0;
        const lineCol  = pos ? '#22c55e' : neg ? '#ef4444' : '#6b7280';
        const textCol  = pos ? (dark ? '#4ade80' : '#16a34a')
                       : neg ? (dark ? '#f87171' : '#dc2626')
                       : dim;
        const dStr = o.delta === null ? '—' : o.delta > 0 ? `+${o.delta}%` : `${o.delta}%`;

        return (
          <g key={o.office}>
            {/* Stredový pruh (každý druhý riadok) */}
            {i % 2 === 0 && (
              <rect x={LEFT - 2} y={y - ROW_H / 2 + 3} width={CEND - LEFT + 4} height={ROW_H - 6}
                rx="4"
                fill={dark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.018)'} />
            )}

            {/* Kancelária label */}
            <text x={LEFT - 8} y={y + 4}
              textAnchor="end" fontSize="11" fontWeight="700"
              fill={dark ? '#e5e7eb' : '#374151'}>{o.office}</text>

            {/* Connecting line */}
            {Math.abs(xe - xs) > 1 && (
              <line x1={xs} y1={y} x2={xe} y2={y}
                stroke={lineCol} strokeWidth="2.5" strokeLinecap="round" />
            )}

            {/* Počiatočný bod (dutý kruh = "bolo") */}
            <circle cx={xs} cy={y} r="5"
              fill={dark ? '#481132' : 'white'}
              stroke={dark ? '#6b7280' : '#9ca3af'} strokeWidth="2" />

            {/* Koncový bod (plný = "teraz") */}
            <circle cx={xe} cy={y} r="7" fill={lineCol} />

            {/* Delta % – hlavný label */}
            <text x={CEND + 12} y={y - 3}
              fontSize="12" fontWeight="800" fill={textCol}>{dStr}</text>

            {/* "bolo → teraz" – vedľajší label */}
            <text x={CEND + 12} y={y + 11}
              fontSize="9.5" fill={dim}>{sp}%→{ep}%</text>
          </g>
        );
      })}

      {/* X-axis popisky */}
      {[0, 25, 50, 75, 100].map(p => (
        <text key={p} x={xOf(p)} y={H - 6}
          textAnchor="middle" fontSize="9" fill={dim}>{p}%</text>
      ))}
    </svg>
  );
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
  const [partyMode, setPartyMode]           = useState(false);
  const [showFireworks, setShowFireworks]   = useState(false);
  const [countdown, setCountdown]           = useState(REFRESH_SEC);
  const [history, setHistory]               = useState([]); // [{time, health:{name:pct}, prices}]
  const [refreshing, setRefreshing]         = useState(false);
  const [partyResults, setPartyResults]     = useState(null); // výsledky po ukončení party
  const baselineRef       = useRef(null);
  const baselinePricesRef = useRef(null);
  const intervalRef       = useRef(null);
  const countdownRef      = useRef(null);

  // ── Zobrazenie: 'zdravie' | 'trend' ─────────────────────────
  const [view, setView] = useState('zdravie');

  // ── Trend zdravia ────────────────────────────────────────────
  const [trendPeriod,     setTrendPeriod]     = useState('week');
  const [trendCustomFrom, setTrendCustomFrom] = useState('');
  const [trendCustomTo,   setTrendCustomTo]   = useState('');
  const [trendSnapshots,  setTrendSnapshots]  = useState(null); // null = ešte nenačítané
  const [trendLoading,    setTrendLoading]    = useState(false);
  const [loadError,   setLoadError]   = useState(false);
  const [trendError,  setTrendError]  = useState(false);

  // ── URL statusy inzerátov ─────────────────────────────────────
  const [urlStatuses,    setUrlStatuses]    = useState({}); // { url: 'active'|'inactive' }
  const [urlCheckState,  setUrlCheckState]  = useState('idle'); // 'idle'|'checking'|'done'|'error'
  const [urlCheckCount,  setUrlCheckCount]  = useState({ done: 0, total: 0 });

  // ── Radenie v detaile makléra ─────────────────────────────────
  const [detailSort, setDetailSort] = useState('diff'); // 'diff' | 'cena' | 'faza'

  // ── PDF export ────────────────────────────────────────────────
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfPhases,   setPdfPhases]   = useState({ 1: true, 2: true, 3: true, 4: true });

  // ── Radenie zoznamu maklérov ──────────────────────────────────
  const [brokerSort, setBrokerSort] = useState('health'); // 'health' | 'faza3desc' | 'faza3asc'

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
      .catch(() => { setLoading(false); setRefreshing(false); setLoadError(true); });
  }

  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }

  function loadTrend(period, customFrom, customTo) {
    const today = new Date().toISOString().split('T')[0];
    let from, to = today;
    if (period === 'week')        from = daysAgo(7);
    else if (period === 'month')  from = daysAgo(30);
    else if (period === 'year')   from = new Date().getFullYear() + '-01-01';
    else if (period === 'custom') { from = customFrom; to = customTo || today; }
    if (!from) return;
    setTrendError(false); setTrendLoading(true);
    fetch(`/api/trend-zdravia?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(res => { setTrendSnapshots(res.snapshots || []); setTrendLoading(false); })
      .catch(() => { setTrendLoading(false); setTrendError(true); });
  }

  useEffect(() => { loadDeals(false); }, []);

  // Kontrola URL inzerátov — volaná manuálne aj automaticky pri načítaní
  async function checkListingUrls() {
    if (!deals.length || urlCheckState === 'checking') return;
    // Zber všetkých URL (autobazar + autorro) — kontrolujeme obe
    const allUrls = [...new Set(
      deals.flatMap(d => [d[AUTOBAZAR_URL_KEY], d[AUTORRO_URL_KEY]].filter(Boolean))
    )];
    if (!allUrls.length) { setUrlCheckState('done'); return; }

    setUrlCheckState('checking');
    setUrlCheckCount({ done: 0, total: allUrls.length });

    // Rozdeľ do dávok po 15 — zaistí response do 10s (Vercel limit)
    const BATCH = 15;
    const batches = [];
    for (let i = 0; i < allUrls.length; i += BATCH) batches.push(allUrls.slice(i, i + BATCH));

    let done = 0;
    let hasError = false;
    for (const batch of batches) {
      try {
        const res = await fetch('/api/check-listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: batch }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const results = await res.json();
        setUrlStatuses(prev => {
          const next = { ...prev };
          for (const [url, result] of Object.entries(results)) {
            next[url] = result.active ? 'active' : 'inactive';
          }
          return next;
        });
        done += batch.length;
        setUrlCheckCount({ done, total: allUrls.length });
      } catch (e) {
        console.error('[check-listings] chyba pre dávku:', e);
        hasError = true;
        done += batch.length;
        setUrlCheckCount({ done, total: allUrls.length });
      }
    }
    setUrlCheckState(hasError ? 'error' : 'done');
  }

  // Auto-spusti po načítaní dealsov
  useEffect(() => {
    if (deals.length) checkListingUrls();
  }, [deals]);

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

  useEffect(() => {
    if (trendPeriod !== 'custom') loadTrend(trendPeriod);
  }, [trendPeriod]);

  function toggleExpand(name) { setExpanded(e => ({ ...e, [name]: !e[name] })); }

  function generateReportHtml() {
    const fmtM = (val, cur) => {
      if (!val || val === 0) return '—';
      return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: cur || 'EUR', maximumFractionDigits: 0 }).format(val);
    };
    const fmtDays = t => t ? Math.floor((Date.now() - new Date(t)) / 864e5) + 'd' : '—';
    const fmtYear = r => {
      if (!r) return '';
      if (typeof r === 'number' && r > 1900) return r;
      const m = String(r).match(/\b(19|20)\d{2}\b/); return m ? m[0] : '';
    };
    const fmtKm = km => {
      if (!km && km !== 0) return ''; const k = Number(km);
      return isNaN(k) ? '' : k >= 1000 ? `${Math.round(k/1000)}k km` : `${k} km`;
    };
    const effPhase = d => {
      const f = getInzerciaFaza(getInzerciaDays(d)).num;
      return (f === 3 && d[CENA_KEY] != 100) ? 4 : f;
    };
    const phaseBadge = d => {
      const eff = effPhase(d); const days = getInzerciaDays(d);
      const styles = { 1:'background:#dcfce7;color:#15803d', 2:'background:#ffedd5;color:#c2410c', 3:'background:#fee2e2;color:#b91c1c', 4:'background:#f3e8ff;color:#6b21a8' };
      return `<span style="padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;${styles[eff]}">Fáza ${eff} · ${days}d</span>`;
    };
    const diffBadge = (s, r) => {
      const d = getPriceDiff(s, r);
      if (d === null) return '—';
      if (d > 10)  return `<span style="padding:1px 6px;border-radius:999px;font-size:10px;font-weight:700;background:#fee2e2;color:#b91c1c">+${d}% ↑</span>`;
      if (d > 0)   return `<span style="padding:1px 6px;border-radius:999px;font-size:10px;font-weight:700;background:#fef9c3;color:#854d0e">+${d}%</span>`;
      return `<span style="padding:1px 6px;border-radius:999px;font-size:10px;font-weight:700;background:#dcfce7;color:#15803d">${d > 0 ? '+'+d+'%' : d === 0 ? 'OK' : d+'% ↓'}</span>`;
    };

    const filtered = officeDeals.filter(d => !!pdfPhases[effPhase(d)]);
    const byBroker = {};
    filtered.forEach(d => { const n = d.owner_name || 'Neznámy'; if (!byBroker[n]) byBroker[n] = []; byBroker[n].push(d); });
    const brokerEntries = Object.entries(byBroker).sort((a,b) => a[0].localeCompare(b[0]));
    const selectedPhaseLabels = [1,2,3,4].filter(n => pdfPhases[n]).map(n => 'Fáza ' + n).join(', ');

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Zdravie ponuky – ${new Date().toLocaleDateString('sk-SK')}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#1f2937;background:#fff}
.hdr{padding:14px 20px;border-bottom:3px solid #FF501C;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center}
.hdr h1{font-size:18px;font-weight:bold;color:#481132}
.hdr .meta{font-size:10px;color:#6b7280;margin-top:3px}
.broker{margin-bottom:20px;page-break-inside:avoid}
.brow{padding:6px 10px;background:#f7f6f4;border-left:4px solid #FF501C;display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.bname{font-size:13px;font-weight:bold}
.bstats{font-size:10px;color:#6b7280}
table{width:100%;border-collapse:collapse;font-size:10px}
th{background:#f7f6f4;padding:5px 7px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb}
td{padding:4px 7px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
tr.r4{background:#faf5ff}tr.r3{background:#fff7f7}tr.r2{background:#fffbf5}
.mono{font-family:monospace;color:#9ca3af;font-size:10px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.broker{page-break-inside:avoid}}
</style></head><body>
<div class="hdr">
  <div><h1>Autorro – Zdravie ponuky</h1>
  <div class="meta">${office !== 'Všetky' ? 'Kancelária: '+office+' · ' : ''}Vygenerované: ${new Date().toLocaleString('sk-SK')} · ${selectedPhaseLabels}</div></div>
  <div style="font-size:20px;font-weight:bold;color:#FF501C">${filtered.length} dealov</div>
</div>`;

    for (const [name, deals] of brokerEntries) {
      const ok  = deals.filter(d => d[CENA_KEY] == 100).length;
      const pct = deals.length > 0 ? Math.round((ok / deals.length) * 100) : 0;
      const f4  = deals.filter(d => effPhase(d) === 4).length;
      const f3  = deals.filter(d => effPhase(d) === 3).length;
      const sorted = [...deals].sort((a, z) => { const ae=effPhase(a), ze=effPhase(z); if(ze!==ae) return ze-ae; return getInzerciaDays(z)-getInzerciaDays(a); });
      html += `<div class="broker"><div class="brow"><span class="bname">${name}</span><span class="bstats">${deals.length} dealov · ${pct}% zdravie${f4>0?' · Fáza 4: '+f4:''}${f3>0?' · Fáza 3: '+f3:''}</span></div>
<table><thead><tr><th>#ID</th><th>Vozidlo</th><th>Dni</th><th>Cena vozidla</th><th>Odp. cena</th><th>% rozdiel</th><th>Cena OK</th><th>Rok / km / Palivo</th><th>Fáza</th></tr></thead><tbody>`;
      for (const d of sorted) {
        const eff=effPhase(d), cenaOk=d[CENA_KEY]==100;
        html += `<tr class="r${eff}">
<td class="mono"><a href="https://autorro.pipedrive.com/deal/${d.id}" style="color:#9ca3af">#${d.id}</a></td>
<td style="font-weight:500">${(d.title||'—').substring(0,45)}${d.title&&d.title.length>45?'…':''}</td>
<td>${fmtDays(d.add_time)}</td>
<td style="font-weight:500">${fmtM(d[CENA_VOZIDLA],d.currency)}</td>
<td>${fmtM(d[ODP_AUTORRO],d.currency)}</td>
<td>${diffBadge(d[CENA_VOZIDLA],d[ODP_AUTORRO])}</td>
<td>${cenaOk?'<span style="color:#16a34a;font-weight:700">✓ Áno</span>':'<span style="color:#dc2626;font-weight:700">✗ Nie</span>'}</td>
<td style="color:#6b7280">${[fmtYear(d._rok),fmtKm(d._km),d._palivo].filter(Boolean).join(' · ')||'—'}</td>
<td>${phaseBadge(d)}</td></tr>`;
      }
      html += `</tbody></table></div>`;
    }
    html += `</body></html>`;
    return html;
  }

  function handlePrint() {
    const html = generateReportHtml();
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
    setShowPdfModal(false);
  }

  async function handleDownload() {
    setShowPdfModal(false);

    const html = generateReportHtml();

    // Extrahuj <style> a <body> zo vygenerovaného HTML
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    const bodyMatch  = html.match(/<body>([\s\S]*)<\/body>/);

    // Kontajner musí byť na obrazovke (nie off-screen) aby ho html2canvas videl
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:1123px;background:white;opacity:0;pointer-events:none;z-index:99999;overflow:visible';

    if (styleMatch) {
      const style = document.createElement('style');
      style.textContent = styleMatch[1];
      container.appendChild(style);
    }

    const content = document.createElement('div');
    content.style.cssText = 'width:1123px;background:white';
    content.innerHTML = bodyMatch ? bodyMatch[1] : html;
    container.appendChild(content);

    document.body.appendChild(container);

    // Počkaj na render DOM
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    try {
      const { default: html2pdf } = await import('html2pdf.js');
      await html2pdf()
        .set({
          margin:      [8, 6, 8, 6],
          filename:    `zdravie-ponuky-${new Date().toISOString().split('T')[0]}.pdf`,
          image:       { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 1.5, useCORS: true, logging: false, scrollX: 0, scrollY: 0, windowWidth: 1123 },
          jsPDF:       { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak:   { mode: ['avoid-all', 'css'] },
        })
        .from(content)
        .save();
    } finally {
      document.body.removeChild(container);
    }
  }

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
    .map(([name, s]) => ({
      name, ...s,
      pct:   s.total > 0 ? Math.round((s.ok / s.total) * 100) : 0,
      faza3: s.deals.filter(d => getInzerciaFaza(getInzerciaDays(d)).num === 3).length,
      faza4: s.deals.filter(d => getInzerciaFaza(getInzerciaDays(d)).num === 3 && d[CENA_KEY] != 100).length,
    }))
    .sort((a, b) => {
      if (brokerSort === 'faza3desc') return b.faza3 - a.faza3;
      if (brokerSort === 'faza3asc')  return a.faza3 - b.faza3;
      if (brokerSort === 'faza4desc') return b.faza4 - a.faza4;
      if (brokerSort === 'faza4asc')  return a.faza4 - b.faza4;
      return b.pct - a.pct;
    });

  const totalFaza3 = brokerList.reduce((sum, b) => sum + b.faza3, 0);
  const totalFaza4 = brokerList.reduce((sum, b) => sum + b.faza4, 0);

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

  // ── Výpočet trendu (memoizovaný – prepočíta sa iba pri zmene trendSnapshots alebo office) ──
  const trendResult = useMemo(() => {
    if (!trendSnapshots || trendSnapshots.length === 0) return null;
    const officeNamesForTrend = office === "Všetky" ? null : (OFFICES[office] || []);
    const byDate = {};
    trendSnapshots.forEach(r => {
      if (!byDate[r.snapshot_date]) byDate[r.snapshot_date] = [];
      byDate[r.snapshot_date].push(r);
    });
    const dates = Object.keys(byDate).sort();
    if (dates.length < 2) return { singleDate: dates[0] || null };
    const startDate = dates[0];
    const endDate   = dates[dates.length - 1];
    const agg = rows => {
      const f = officeNamesForTrend
        ? rows.filter(r => nameMatchesOffice(r.owner_name, officeNamesForTrend))
        : rows;
      const t = f.reduce((s, r) => s + r.total, 0);
      const k = f.reduce((s, r) => s + r.cena_ok, 0);
      return { total: t, ok: k, pct: t > 0 ? Math.round((k / t) * 100) : 0 };
    };
    const startAgg = agg(byDate[startDate]);
    const endAgg   = agg(byDate[endDate]);
    const delta    = endAgg.pct - startAgg.pct;
    const allNames = [...new Set(trendSnapshots.map(r => r.owner_name))]
      .filter(n => !officeNamesForTrend || nameMatchesOffice(n, officeNamesForTrend));
    const trendBrokers = allNames.map(name => {
      const s = byDate[startDate]?.find(r => r.owner_name === name);
      const e = byDate[endDate]?.find(r => r.owner_name === name);
      const d = (s && e) ? Math.round((e.health_pct - s.health_pct) * 10) / 10 : null;
      return { name, startPct: s?.health_pct ?? null, endPct: e?.health_pct ?? null, delta: d };
    }).filter(b => b.endPct !== null).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
    const sparkline = dates.map(date => {
      const a = agg(byDate[date]);
      return { date, pct: a.pct };
    });
    // ── Per-office agregácia ──────────────────────────────────
    const aggO = rows => {
      const t = rows.reduce((s, r) => s + r.total, 0);
      const k = rows.reduce((s, r) => s + r.cena_ok, 0);
      return t > 0 ? Math.round((k / t) * 100) : null;
    };
    const officeResults = Object.entries(OFFICES)
      .filter(([o]) => o !== 'Všetky')
      .map(([officeName, officeMembers]) => {
        const sr = byDate[startDate]?.filter(r => nameMatchesOffice(r.owner_name, officeMembers)) || [];
        const er = byDate[endDate]  ?.filter(r => nameMatchesOffice(r.owner_name, officeMembers)) || [];
        const sp = aggO(sr);
        const ep = aggO(er);
        const d  = sp !== null && ep !== null ? Math.round((ep - sp) * 10) / 10 : null;
        return { office: officeName, startPct: sp, endPct: ep, delta: d };
      })
      .filter(o => o.endPct !== null)
      .sort((a, b) => (b.delta ?? -999) - (a.delta ?? -999));

    return { startDate, endDate, startAgg, endAgg, delta, trendBrokers, dates, sparkline, officeResults };
  }, [trendSnapshots, office]);

  return (
    <div className={"min-h-screen " + bg} style={bgStyle}>
      {showFireworks && <Fireworks />}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
          <h1 className="text-3xl font-bold">Autorro Dashboard</h1>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={() => {
                if (!partyMode) {
                  baselineRef.current = null;
                  baselinePricesRef.current = null;
                  setHistory([]);
                  setPartyResults(null);
                  setPartyMode(true);
                  setShowFireworks(true);
                  setTimeout(() => setShowFireworks(false), 3500);
                  // Ihneď načítaj čerstvé dáta — leaderboard sa zobrazí okamžite
                  setTimeout(() => loadDeals(true), 50);
                } else {
                  // Ulož výsledky pred vypnutím — zostanú viditeľné
                  setPartyResults({
                    history: history,
                    baseline: baselineRef.current,
                    baselinePrices: baselinePricesRef.current,
                  });
                  setPartyMode(false);
                }
              }}
              className={"px-4 py-2 rounded-full text-sm font-bold transition-all " + (partyMode ? "text-white animate-pulse" : btnBase)}
              style={partyMode ? { backgroundColor: "#FF501C" } : {}}>
              {partyMode ? "🎉 LIVE" : "🎉 Party Mode"}
            </button>
            <button
              onClick={() => {
                const next = view === 'zdravie' ? 'trend' : 'zdravie';
                setView(next);
                if (next === 'trend' && trendSnapshots === null) loadTrend(trendPeriod);
              }}
              className={"px-4 py-2 rounded-full text-sm font-medium transition-all " + (view === 'trend' ? "text-white" : btnBase)}
              style={view === 'trend' ? { backgroundColor: "#FF501C" } : {}}>
              📈 Trend
            </button>
            <button onClick={() => setShowPdfModal(true)} className={"px-4 py-2 rounded-full text-sm font-medium " + btnBase}>
              📄 PDF
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

        {loadError && !loading && (
          <div className={"rounded-xl p-4 mb-6 text-sm border " + (dark ? "bg-red-950 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-700")}>
            ⚠️ Nepodarilo sa načítať dáta z Pipedrive. Skúste obnoviť stránku.
          </div>
        )}

        {(partyMode ? history.length > 0 : !!partyResults) && !loading && (() => {
          const activeHistory      = partyMode ? history        : partyResults.history;
          const activeBaseline     = partyMode ? baselineRef.current     : partyResults.baseline;
          const activeBasePrices   = partyMode ? baselinePricesRef.current : partyResults.baselinePrices;
          const snap          = activeHistory[activeHistory.length - 1];
          const latest        = snap.health;
          const latestPrices  = snap.prices || {};
          const baseline      = activeBaseline || latest;
          const baselinePrices = activeBasePrices || latestPrices;
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
              const hist         = activeHistory.map(h => h.health[name] ?? base);
              const priceReduced = reductionByBroker[norm(name)] || 0;
              return { name, pct, base, delta, hist, priceReduced };
            })
            .sort((a, b) => b.delta !== a.delta ? b.delta - a.delta : b.pct - a.pct);

          const medals = ["🥇", "🥈", "🥉"];
          return (
            <>
              {/* Celkový banner so znížením */}
              {totalReduction > 0 && (
                <div className="rounded-xl px-5 py-4 mb-3 flex flex-wrap items-center justify-between gap-3"
                  style={{ background: "linear-gradient(135deg, #052e16 0%, #14532d 100%)", border: "2px solid #22c55e" }}>
                  <div>
                    <p className="text-green-300 text-xs font-semibold uppercase tracking-wider mb-0.5">💰 Celkové zníženie cien od startu</p>
                    <p className="text-white text-3xl font-extrabold">−{fmtMoney(totalReduction, "EUR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-sm">{reducedDeals.length} vozidiel znížených</p>
                    {office !== "Všetky" && <p className="text-green-300 text-xs">📍 kancelária {office}</p>}
                  </div>
                </div>
              )}

              {/* Leaderboard */}
              <div className={"rounded-xl p-4 mb-4 " + cardCls} style={{ ...(dark ? { backgroundColor: "#3d0e2a" } : { backgroundColor: "#fff7f5" }), border: "2px solid #FF501C" }}>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    {partyMode ? "🏆 Live leaderboard" : "🏆 Výsledky party"}
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FF501C", color: "white" }}>
                      {activeHistory.length} snapshots
                    </span>
                    {office !== "Všetky" && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                        📍 {office}
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className={"text-xs " + (dark ? "text-gray-400" : "text-gray-500")}>Zoradené podľa zlepšenia</span>
                    {!partyMode && (
                      <button onClick={() => setPartyResults(null)}
                        className="ml-2 text-xs px-3 py-1 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 font-medium">
                        ✕ Zavrieť
                      </button>
                    )}
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
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
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
            <div className={"rounded-xl p-4 " + cardCls}>
              <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Fáza 3 (180+ dní)</p>
              <p className={"text-2xl font-bold " + (totalFaza3 > 0 ? "text-red-500" : "text-green-400")}>{totalFaza3}</p>
            </div>
            <div className={"rounded-xl p-4 " + cardCls}>
              <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Fáza 4 (180d + cena ✗)</p>
              <p className={"text-2xl font-bold " + (totalFaza4 > 0 ? "text-purple-600" : "text-green-400")}>{totalFaza4}</p>
            </div>
          </div>

          {/* ── Trend zdravia ponuky ─────────────────────────────── */}
          {view === 'trend' && (
          <div className={"rounded-xl p-4 mb-6 " + cardCls} style={cardStyle}>
            <h2 className="font-semibold mb-3">📈 Trend zdravia ponuky</h2>

            {/* Period selector */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: 'week',   label: 'Posledný týždeň' },
                { key: 'month',  label: 'Posledný mesiac' },
                { key: 'year',   label: 'Tento rok' },
                { key: 'custom', label: '📅 Vlastné obdobie' },
              ].map(p => (
                <button key={p.key} onClick={() => setTrendPeriod(p.key)}
                  className={"px-3 py-1.5 rounded-full text-sm font-medium transition-all " + (trendPeriod === p.key ? "text-white" : btnBase)}
                  style={trendPeriod === p.key ? { backgroundColor: "#FF501C" } : {}}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date range */}
            {trendPeriod === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <input type="date" value={trendCustomFrom}
                  onChange={e => setTrendCustomFrom(e.target.value)}
                  className={"rounded-lg border px-3 py-1.5 text-sm " + (dark ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900")} />
                <span className={dark ? "text-gray-400" : "text-gray-500"}>—</span>
                <input type="date" value={trendCustomTo}
                  onChange={e => setTrendCustomTo(e.target.value)}
                  className={"rounded-lg border px-3 py-1.5 text-sm " + (dark ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900")} />
                <button
                  onClick={() => loadTrend('custom', trendCustomFrom, trendCustomTo)}
                  disabled={!trendCustomFrom}
                  className="px-4 py-1.5 rounded-full text-sm font-medium text-white disabled:opacity-40"
                  style={{ backgroundColor: "#FF501C" }}>
                  Zobraz
                </button>
              </div>
            )}

            {/* Loading state */}
            {trendLoading && (
              <div className="flex items-center gap-2 py-4 text-sm" style={{ color: "#FF501C" }}>
                <span className="animate-spin">⟳</span> Načítavam dáta…
              </div>
            )}

            {/* Chyba pri načítaní */}
            {!trendLoading && trendError && (
              <div className={"rounded-lg p-4 text-sm text-center " + (dark ? "bg-red-950 border border-red-800 text-red-300" : "bg-red-50 border border-red-200 text-red-700")}>
                <p className="text-2xl mb-2">⚠️</p>
                <p className="font-medium">Nepodarilo sa načítať historické dáta</p>
              </div>
            )}

            {/* No data yet */}
            {!trendLoading && trendSnapshots !== null && trendSnapshots.length === 0 && (
              <div className={"rounded-lg p-4 text-sm text-center " + (dark ? "bg-gray-800 text-gray-400" : "bg-gray-50 text-gray-500")}>
                <p className="text-2xl mb-2">📭</p>
                <p className="font-medium mb-1">Zatiaľ žiadne historické dáta</p>
                <p>Snapshotový cron beží každý deň o 22:00 UTC.<br />Trend bude dostupný od zajtra.</p>
              </div>
            )}

            {/* Not enough data (only 1 snapshot) */}
            {!trendLoading && trendSnapshots !== null && trendResult?.singleDate && (
              <div className={"rounded-lg p-4 text-sm text-center " + (dark ? "bg-gray-800 text-gray-400" : "bg-gray-50 text-gray-500")}>
                <p className="text-2xl mb-2">📊</p>
                <p className="font-medium mb-1">Nedostatok dát na porovnanie</p>
                <p>Máme snapshot z <strong>{trendResult.singleDate}</strong>.<br />Potrebujeme aspoň 2 snapshotové dni pre zobrazenie trendu.</p>
              </div>
            )}

            {/* Trend result */}
            {!trendLoading && trendResult && !trendResult.singleDate && (() => {
              const { startDate, endDate, startAgg, endAgg, delta, trendBrokers, sparkline, officeResults } = trendResult;
              const deltaColor  = delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : (dark ? "text-gray-300" : "text-gray-600");
              const deltaArrow  = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
              const deltaBg     = delta > 0 ? (dark ? "bg-green-900" : "bg-green-50 border border-green-200")
                                : delta < 0 ? (dark ? "bg-red-900"   : "bg-red-50 border border-red-200")
                                :              (dark ? "bg-gray-700"  : "bg-gray-50 border border-gray-200");
              const maxPct      = Math.max(...sparkline.map(p => p.pct), 1);

              return (
                <>
                  {/* Overall delta banner */}
                  <div className={"rounded-xl p-4 mb-4 flex flex-wrap items-center justify-between gap-4 " + deltaBg}>
                    <div>
                      <p className={"text-xs font-semibold uppercase tracking-wider mb-0.5 " + (dark ? "text-gray-400" : "text-gray-500")}>
                        Zmena zdravia ponuky
                      </p>
                      <p className={"text-4xl font-extrabold " + deltaColor}>
                        {delta > 0 ? "+" : ""}{delta}% {deltaArrow}
                      </p>
                      <p className={"text-xs mt-1 " + (dark ? "text-gray-400" : "text-gray-500")}>
                        {startDate} → {endDate}
                        {office !== "Všetky" && <span className="ml-2 font-semibold">📍 {office}</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={"text-sm font-bold " + deltaColor}>{endAgg.pct}% teraz</p>
                      <p className={"text-xs " + (dark ? "text-gray-400" : "text-gray-500")}>bolo {startAgg.pct}%</p>
                      <p className={"text-xs " + (dark ? "text-gray-400" : "text-gray-500")}>{endAgg.ok} / {endAgg.total} dealov</p>
                    </div>
                  </div>

                  {/* ── Graf kancelárií ───────────────────────────── */}
                  {officeResults.length > 0 && (
                    <div className={"rounded-xl p-4 mb-4 " + (dark ? "bg-[#3d0e2a]" : "bg-gray-50 border border-gray-100")}>
                      {/* Hlavička grafu */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <p className={"text-sm font-semibold " + (dark ? "text-gray-200" : "text-gray-700")}>
                          📊 Zdravie kancelárií
                        </p>
                        <p className={"text-xs font-medium px-2.5 py-1 rounded-full " + (dark ? "bg-gray-700 text-gray-300" : "bg-white border border-gray-200 text-gray-500")}>
                          {startDate} → {endDate}
                        </p>
                      </div>

                      {/* Legenda */}
                      <div className={"flex gap-4 mb-3 text-xs " + (dark ? "text-gray-400" : "text-gray-500")}>
                        <span className="flex items-center gap-1.5">
                          <svg width="20" height="10">
                            <circle cx="5" cy="5" r="4" fill="none" stroke={dark ? '#6b7280' : '#9ca3af'} strokeWidth="1.5" />
                            <line x1="8" y1="5" x2="18" y2="5" stroke="#6b7280" strokeWidth="1.5" />
                            <circle cx="18" cy="5" r="4" fill="#6b7280" />
                          </svg>
                          Začiatok obdobia → Teraz
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Rast
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Pokles
                        </span>
                      </div>

                      <OfficeTrendChart officeResults={officeResults} dark={dark} />
                    </div>
                  )}

                  {/* Sparkline */}
                  {sparkline.length > 2 && (
                    <div className="mb-4">
                      <p className={"text-xs font-medium mb-1 " + (dark ? "text-gray-400" : "text-gray-500")}>
                        Vývoj zdravia v období ({sparkline.length} dní so snapshotom)
                      </p>
                      <div className="flex items-end gap-0.5 h-12 w-full">
                        {sparkline.map((p, i) => {
                          const barH = Math.max(4, Math.round((p.pct / maxPct) * 48));
                          const col  = p.pct >= 50 ? "#22c55e" : p.pct >= 35 ? "#eab308" : "#ef4444";
                          return (
                            <div key={i} title={`${p.date}: ${p.pct}%`}
                              className="flex-1 rounded-sm transition-all cursor-default"
                              style={{ height: barH + "px", backgroundColor: col, opacity: 0.7 + (i / sparkline.length) * 0.3 }} />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Per-broker table */}
                  {trendBrokers.length > 0 && (
                    <div>
                      <p className={"text-xs font-medium mb-2 " + (dark ? "text-gray-400" : "text-gray-500")}>
                        Zmena zdravia podľa makléra
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className={"text-xs font-semibold uppercase tracking-wider " + (dark ? "text-gray-400" : "text-gray-500")}
                              style={theadStyle}>
                              <th className="p-2 text-left">Maklér</th>
                              <th className="p-2 text-right hidden md:table-cell">Začiatok</th>
                              <th className="p-2 text-right">Teraz</th>
                              <th className="p-2 text-right">Zmena</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trendBrokers.map(b => {
                              const dc = b.delta === null ? (dark ? "text-gray-500" : "text-gray-400")
                                       : b.delta > 0  ? "text-green-400"
                                       : b.delta < 0  ? "text-red-400"
                                       :                (dark ? "text-gray-300" : "text-gray-600");
                              const da = b.delta === null ? "—"
                                       : b.delta > 0  ? `+${b.delta}% ↑`
                                       : b.delta < 0  ? `${b.delta}% ↓`
                                       :                "0% →";
                              const endH  = getHealth(b.endPct);
                              return (
                                <tr key={b.name} className={"border-t " + rowCls}>
                                  <td className="p-2 font-medium">{b.name}</td>
                                  <td className={"p-2 text-right hidden md:table-cell " + (dark ? "text-gray-400" : "text-gray-500")}>
                                    {b.startPct !== null ? b.startPct + "%" : "—"}
                                  </td>
                                  <td className={"p-2 text-right font-semibold " + endH.color}>
                                    {b.endPct !== null ? b.endPct + "%" : "—"}
                                  </td>
                                  <td className={"p-2 text-right font-bold " + dc}>{da}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          )}

          {/* ── Zdravie ponuky obsah ─────────────────────────────── */}
          {view === 'zdravie' && <>
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
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-xl font-semibold">
              {office === "Všetky" ? "Všetci makléri" : "Makléri – " + office}
            </h2>
            <div className="flex items-center gap-2 text-sm">
              {urlCheckState === 'checking' && (
                <span className={dark ? "text-gray-400" : "text-gray-500"}>
                  🔄 Kontrolujem URL… {urlCheckCount.done}/{urlCheckCount.total}
                </span>
              )}
              {urlCheckState === 'done' && (
                <span className="text-green-600 text-xs">
                  ✓ URL skontrolované ({Object.values(urlStatuses).filter(v => v === 'active').length} aktívnych, {Object.values(urlStatuses).filter(v => v === 'inactive').length} neaktívnych)
                </span>
              )}
              {urlCheckState === 'error' && (
                <span className="text-orange-500 text-xs">⚠ Niektoré URL sa nepodarilo skontrolovať</span>
              )}
              <button
                onClick={() => { setUrlStatuses({}); setUrlCheckState('idle'); setTimeout(checkListingUrls, 50); }}
                disabled={urlCheckState === 'checking'}
                className={"px-3 py-1 rounded text-xs font-medium transition-colors " + (urlCheckState === 'checking' ? "opacity-40 cursor-not-allowed " : "") + (dark ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}
              >
                🔄 Skontrolovať URL
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
              <thead className={theadCls} style={theadStyle}>
                <tr>
                  <th className="p-3 text-left w-8"></th>
                  <th className="p-3 text-left hidden md:table-cell">#</th>
                  <th className="p-3 text-left">Maklér</th>
                  <th className="p-3 text-left">Celkom</th>
                  <th className="p-3 text-left hidden md:table-cell">Áno</th>
                  <th className="p-3 text-left hidden md:table-cell">Nie</th>
                  <th className="p-3 text-left hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <span>Fáza 3</span>
                      <button onClick={() => setBrokerSort(s => s === 'faza3desc' ? 'faza3asc' : 'faza3desc')}
                        className="text-gray-400 hover:text-gray-700 leading-none"
                        title="Zoradiť podľa Fázy 3">
                        {brokerSort === 'faza3desc' ? '↓' : brokerSort === 'faza3asc' ? '↑' : '↕'}
                      </button>
                    </div>
                  </th>
                  <th className="p-3 text-left hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <span className="text-purple-700">Fáza 4</span>
                      <button onClick={() => setBrokerSort(s => s === 'faza4desc' ? 'faza4asc' : 'faza4desc')}
                        className="text-purple-300 hover:text-purple-700 leading-none"
                        title="Zoradiť podľa Fázy 4">
                        {brokerSort === 'faza4desc' ? '↓' : brokerSort === 'faza4asc' ? '↑' : '↕'}
                      </button>
                    </div>
                  </th>
                  <th className="p-3 text-left">
                    <button onClick={() => setBrokerSort('health')}
                      className={"font-semibold " + (brokerSort === 'health' ? "underline" : "text-gray-500 hover:text-gray-700")}
                      title="Zoradiť podľa zdravia">
                      Zdravie
                    </button>
                  </th>
                  <th className="p-3 text-left w-32 hidden md:table-cell">Graf</th>
                </tr>
              </thead>
              <tbody>
                {brokerList.map((b, i) => {
                  const h      = getHealth(b.pct);
                  const isOpen = !!expanded[b.name];
                  const sortedDeals = [...b.deals].sort((a, z) => {
                    if (detailSort === 'cena') {
                      return (z[CENA_VOZIDLA] || 0) - (a[CENA_VOZIDLA] || 0);
                    }
                    if (detailSort === 'faza') {
                      const aD = getInzerciaDays(a); const zD = getInzerciaDays(z);
                      const aF = getInzerciaFaza(aD).num;  const zF = getInzerciaFaza(zD).num;
                      const aEff = (aF === 3 && a[CENA_KEY] != 100) ? 4 : aF;
                      const zEff = (zF === 3 && z[CENA_KEY] != 100) ? 4 : zF;
                      if (zEff !== aEff) return zEff - aEff;
                      return zD - aD;
                    }
                    // default: 'diff' — nie OK prvé, potom podľa % rozdielu
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
                        <td className="p-3 hidden md:table-cell">
                          {b.faza3 > 0
                            ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{b.faza3}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          {b.faza4 > 0
                            ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">{b.faza4}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className={"p-3 font-bold " + h.color}>{b.pct}%</td>
                        <td className="p-3 hidden md:table-cell"><HealthBar pct={b.pct} dark={dark} /></td>
                      </tr>

                      {isOpen && (
                        <tr key={b.name + "_detail"} className={"border-t " + rowCls}>
                          <td colSpan={10} className="p-2">
                            <div className="border-l-4 rounded-lg overflow-hidden" style={{ borderColor: "#FF501C" }}>
                              {/* Sort controls */}
                              <div className={"flex items-center gap-1.5 px-3 py-2 border-b " + (dark ? "border-gray-700 bg-[#3d0e2a]" : "border-gray-100 bg-gray-50")}>
                                <span className={"text-xs font-medium mr-0.5 " + (dark ? "text-gray-400" : "text-gray-500")}>Zoradiť:</span>
                                {[
                                  { key: 'diff',  label: '% rozdiel' },
                                  { key: 'cena',  label: 'Cena vozidla' },
                                  { key: 'faza',  label: 'Fáza' },
                                ].map(opt => (
                                  <button key={opt.key}
                                    onClick={e => { e.stopPropagation(); setDetailSort(opt.key); }}
                                    className={"px-2 py-0.5 rounded text-xs font-medium transition-colors " + (detailSort === opt.key
                                      ? "text-white"
                                      : (dark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"))}
                                    style={detailSort === opt.key ? { backgroundColor: '#FF501C' } : {}}>
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
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
                                        <a href={`https://autorro.pipedrive.com/deal/${d.id}`}
                                          target="_blank" rel="noopener noreferrer"
                                          className="text-gray-400 hover:underline font-mono"
                                          onClick={e => e.stopPropagation()}>#{d.id}</a>
                                        <span><DaysBadge addTime={d.add_time} /></span>
                                        <span>Cena: <span className="font-medium text-gray-800">{fmtMoney(cenaVoz, d.currency)}</span></span>
                                        <span>Odp: <span className="font-medium text-gray-800">{fmtMoney(odAut, d.currency)}</span></span>
                                      </div>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {diff !== null && <PriceDiffBadge diff={diff} />}
                                        <RokBadge rokRaw={d._rok} />
                                        <KmBadge km={d._km} />
                                        {d._palivo && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600">{d._palivo}</span>}
                                      </div>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        <InzerciaFazaBadge deal={d} />
                                        <ListingUrlBadge url={d[AUTOBAZAR_URL_KEY]} urlStatuses={urlStatuses} label="AB" />
                                        <ListingUrlBadge url={d[AUTORRO_URL_KEY]}   urlStatuses={urlStatuses} label="Auto" />
                                      </div>
                                      <RecommendationRow deal={d} dark={dark} />
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
                                    <th className="px-3 py-2 text-left">Dni</th>
                                    <th className="px-3 py-2 text-left">Cena vozidla</th>
                                    <th className="px-3 py-2 text-left">Odp. cena Autorro</th>
                                    <th className="px-3 py-2 text-left">% rozdiel</th>
                                    <th className="px-3 py-2 text-left">Cena OK</th>
                                    <th className="px-3 py-2 text-left">Predajnosť</th>
                                    <th className="px-3 py-2 text-left">Inzercia</th>
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
                                    const rec     = getRecommendation(d);
                                    const showRec = !(rec.level === "ok" && rec.text === "V poriadku");
                                    const rs      = REC_STYLE[rec.level] || REC_STYLE.ok;
                                    return (
                                      <React.Fragment key={d.id}>
                                        <tr className={"border-t " + subRowCls + " " + rowBg}>
                                          <td className="px-3 py-2 font-mono">
                                            <a href={`https://autorro.pipedrive.com/deal/${d.id}`}
                                              target="_blank" rel="noopener noreferrer"
                                              className="text-gray-400 hover:underline"
                                              onClick={e => e.stopPropagation()}>
                                              #{d.id}
                                            </a>
                                          </td>
                                          <td className="px-3 py-2 font-medium max-w-[200px] truncate" title={d.title}>
                                            <a href={`https://autorro.pipedrive.com/deal/${d.id}`}
                                              target="_blank" rel="noopener noreferrer"
                                              className="hover:underline" style={{ color: "#FF501C" }}
                                              onClick={e => e.stopPropagation()}>
                                              {d.title || "—"}
                                            </a>
                                          </td>
                                          <td className="px-3 py-2"><DaysBadge addTime={d.add_time} /></td>
                                          <td className="px-3 py-2 font-medium">{fmtMoney(cenaVoz, d.currency)}</td>
                                          <td className="px-3 py-2">{fmtMoney(odAut, d.currency)}</td>
                                          <td className="px-3 py-2"><PriceDiffBadge diff={diff} /></td>
                                          <td className="px-3 py-2">
                                            {cenaOk
                                              ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Áno</span>
                                              : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">✗ Nie</span>}
                                          </td>
                                          <td className="px-3 py-2">
                                            <div className="flex flex-wrap gap-1">
                                              <RokBadge rokRaw={d._rok} />
                                              <KmBadge km={d._km} />
                                              {d._palivo && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600">{d._palivo}</span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2">
                                            <div className="flex flex-col gap-1">
                                              <InzerciaFazaBadge deal={d} />
                                              <div className="flex flex-wrap gap-1 mt-0.5">
                                                <ListingUrlBadge url={d[AUTOBAZAR_URL_KEY]} urlStatuses={urlStatuses} label="AB" />
                                                <ListingUrlBadge url={d[AUTORRO_URL_KEY]}   urlStatuses={urlStatuses} label="Auto" />
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                        {showRec && (
                                          <tr className={"border-b " + (dark ? "border-gray-700" : "border-gray-100")}>
                                            <td colSpan={9} className={"px-3 pb-2 " + (dark ? "bg-gray-900" : "bg-gray-50")}>
                                              <span className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold " + rs.bg + " " + rs.border + " " + rs.text}>
                                                {rec.icon} {rec.text}
                                              </span>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
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
        </>}
      </div>

      {/* PDF export modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowPdfModal(false)}>
          <div className={"rounded-2xl shadow-2xl p-6 w-80 " + (dark ? "bg-[#3d0e2a] text-white" : "bg-white text-gray-900")}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Export do PDF</h3>
            <p className={"text-xs mb-4 " + (dark ? "text-gray-400" : "text-gray-500")}>
              Vyber fázy, ktoré chceš zahrnúť do exportu.
            </p>
            <div className="flex flex-col gap-2 mb-5">
              {[
                { num: 1, label: 'Fáza 1', color: 'bg-green-100 text-green-700' },
                { num: 2, label: 'Fáza 2', color: 'bg-orange-100 text-orange-700' },
                { num: 3, label: 'Fáza 3', color: 'bg-red-100 text-red-700' },
                { num: 4, label: 'Fáza 4', color: 'bg-purple-100 text-purple-800' },
              ].map(({ num, label, color }) => {
                const count = officeDeals.filter(d => {
                  const f = getInzerciaFaza(getInzerciaDays(d)).num;
                  return ((f === 3 && d[CENA_KEY] != 100) ? 4 : f) === num;
                }).length;
                return (
                  <label key={num} className="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" checked={!!pdfPhases[num]}
                      onChange={e => setPdfPhases(p => ({ ...p, [num]: e.target.checked }))}
                      className="w-4 h-4 accent-[#FF501C]" />
                    <span className={"px-2 py-0.5 rounded-full text-xs font-semibold " + color}>{label}</span>
                    <span className={"text-xs " + (dark ? "text-gray-400" : "text-gray-500")}>{count} dealov</span>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-2 flex-col">
              <div className="flex gap-2">
                <button onClick={handlePrint}
                  disabled={!Object.values(pdfPhases).some(Boolean)}
                  className="flex-1 py-2 rounded-lg text-sm font-bold text-white transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: '#FF501C' }}>
                  🖨️ Tlačiť / PDF
                </button>
                <button onClick={handleDownload}
                  disabled={!Object.values(pdfPhases).some(Boolean)}
                  className={"flex-1 py-2 rounded-lg text-sm font-bold transition-opacity disabled:opacity-40 " + (dark ? "bg-gray-700 text-white" : "bg-gray-800 text-white")}>
                  💾 Stiahnuť
                </button>
              </div>
              <button onClick={() => setShowPdfModal(false)}
                className={"py-2 px-4 rounded-lg text-sm font-medium text-center " + (dark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700")}>
                Zrušiť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
