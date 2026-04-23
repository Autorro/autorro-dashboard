"use client";

import { useState } from "react";
import useSWR from "swr";
import { OFFICES_WITH_ALL as OFFICES, INZEROVANE_STAGES } from "@/lib/constants";

const INZEROVANE = new Set(INZEROVANE_STAGES);

const TIME_OPTIONS = [
  { key: "dnes",          label: "Dnes" },
  { key: "tento_tyzden", label: "Tento týždeň" },
  { key: "tento_mesiac", label: "Tento mesiac" },
  { key: "minuly_mesiac",label: "Minulý mesiac" },
  { key: "tento_rok",    label: "Tento rok" },
  { key: "vsetky",       label: "Všetko" },
  { key: "vlastne",      label: "Vlastné" },
];

function getDateRange(key) {
  const now = new Date();
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  switch (key) {
    case "dnes":
      return { from: startOf(now), to: now };
    case "tento_tyzden": {
      const day = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0
      const mon = new Date(now); mon.setDate(now.getDate() - day);
      return { from: startOf(mon), to: now };
    }
    case "tento_mesiac":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "minuly_mesiac": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { from, to };
    }
    case "tento_rok":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    default:
      return null; // všetky / vlastné
  }
}

function reachedInzerovane(d) {
  if (d.status === "won") return true;
  if (INZEROVANE.has(d.stage_id)) return true;
  return false;
}

function aggregate(deals) {
  const ownerMap = {};
  for (const d of deals) {
    const name = d.owner_name;
    if (!ownerMap[name]) ownerMap[name] = { total: 0, inzerovane: 0, won: 0, lost: 0 };
    ownerMap[name].total++;
    if (reachedInzerovane(d)) ownerMap[name].inzerovane++;
    if (d.status === "won")  ownerMap[name].won++;
    if (d.status === "lost") ownerMap[name].lost++;
  }
  return Object.entries(ownerMap).map(([name, s]) => ({
    name, ...s,
    pct: s.total > 0 ? Math.round((s.inzerovane / s.total) * 100) : 0,
  })).sort((a, b) => b.pct - a.pct);
}

export default function KonverziaClient() {
  const [office, setOffice]     = useState("Všetky");
  const [dark, setDark]         = useState(false);
  const [timeKey, setTimeKey]   = useState("vsetky");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");

  const { data, isLoading } = useSWR("/api/wasitlead-conversion");
  const allDeals = data?.deals || [];
  const loading  = isLoading && !data;

  // --- styling ---
  const bg       = dark ? "text-white" : "text-gray-900";
  const bgStyle  = dark ? { backgroundColor: "#481132" } : { backgroundColor: "#FFFFFF" };
  const cardCls  = dark ? "shadow" : "bg-white shadow";
  const cardStyle= dark ? { backgroundColor: "#5c1a42" } : {};
  const rowCls   = dark ? "border-gray-700" : "border-gray-100 hover:bg-gray-50";
  const theadCls = dark ? "text-gray-300" : "text-gray-700";
  const theadStyle=dark ? { backgroundColor: "#3d0e2a" } : { backgroundColor: "#F7F6F4" };
  const btnBase  = dark ? "text-gray-300 hover:opacity-80" : "bg-gray-100 text-gray-700 hover:bg-gray-200";
  const inputCls = dark
    ? "border border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-transparent text-white"
    : "border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900";

  // --- time filtering ---
  const range = timeKey === "vlastne"
    ? { from: customFrom ? new Date(customFrom) : null, to: customTo ? new Date(customTo + "T23:59:59") : null }
    : getDateRange(timeKey);

  const timeFiltered = allDeals.filter(d => {
    if (!range) return true;
    const t = new Date(d.add_time);
    if (range.from && t < range.from) return false;
    if (range.to   && t > range.to)   return false;
    return true;
  });

  // --- office filtering ---
  const officeNames = office === "Všetky" ? null : (OFFICES[office] || []);
  const filtered = officeNames
    ? timeFiltered.filter(d => officeNames.some(n => n.trim().toLowerCase() === d.owner_name.trim().toLowerCase()))
    : timeFiltered;

  const byBroker = aggregate(filtered);

  const filtTotal = filtered.length;
  const filtInz   = filtered.filter(d => reachedInzerovane(d)).length;
  const filtWon   = filtered.filter(d => d.status === "won").length;
  const filtLost  = filtered.filter(d => d.status === "lost").length;
  const filtPct   = filtTotal > 0 ? Math.round((filtInz / filtTotal) * 100) : 0;
  const pctColor  = filtPct >= 50 ? "text-green-400" : filtPct >= 30 ? "text-yellow-400" : "text-red-400";
  const barColor  = filtPct >= 50 ? "#22c55e"        : filtPct >= 30 ? "#eab308"         : "#ef4444";

  // --- office summary cards ---
  const officeSummary = Object.keys(OFFICES).filter(o => o !== "Všetky").map(o => {
    const names = OFFICES[o];
    const rows  = timeFiltered.filter(d => names.some(n => n.trim().toLowerCase() === d.owner_name.trim().toLowerCase()));
    const inz   = rows.filter(d => reachedInzerovane(d)).length;
    const pct   = rows.length > 0 ? Math.round((inz / rows.length) * 100) : 0;
    return { name: o, total: rows.length, inz, pct };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <div className={"min-h-screen " + bg} style={bgStyle}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-3xl font-bold">Konverzia leadov</h1>
          <button onClick={() => setDark(!dark)} className={"px-4 py-2 rounded-full text-sm font-medium " + btnBase}>
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
        <p className={"mb-6 " + (dark ? "text-gray-400" : "text-gray-500")}>
          Úspešnosť maklérov: Lead od callcentra → Inzerované
        </p>

        {loading && (
          <div className="flex items-center gap-3 text-gray-400 py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-orange-500" />
            Načítavam dáta...
          </div>
        )}

        {!loading && <>

          {/* ── Časový filter ── */}
          <div className={"rounded-xl p-4 mb-6 " + cardCls} style={cardStyle}>
            <p className={"text-xs font-semibold uppercase tracking-wide mb-3 " + (dark ? "text-gray-400" : "text-gray-500")}>
              Časové obdobie
            </p>
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map(opt => (
                <button key={opt.key} onClick={() => setTimeKey(opt.key)}
                  className={"px-4 py-2 rounded-full text-sm font-medium " + (timeKey === opt.key ? "text-white" : btnBase)}
                  style={timeKey === opt.key ? { backgroundColor: "#FF501C" } : {}}>
                  {opt.label}
                </button>
              ))}
            </div>
            {timeKey === "vlastne" && (
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <div className="flex items-center gap-2">
                  <label className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Od:</label>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={inputCls} />
                </div>
                <div className="flex items-center gap-2">
                  <label className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Do:</label>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className={inputCls} />
                </div>
              </div>
            )}
          </div>

          {/* Summary karty */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
              <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Leadov od CC</p>
              <p className="text-2xl font-bold">{filtTotal}</p>
            </div>
            <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
              <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Dostalo sa do ponuky</p>
              <p className={"text-2xl font-bold " + pctColor}>{filtInz} <span className="text-base font-normal">({filtPct}%)</span></p>
            </div>
            <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
              <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Predaných (won)</p>
              <p className="text-2xl font-bold text-green-400">{filtWon}</p>
            </div>
            <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
              <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Stratených (lost)</p>
              <p className="text-2xl font-bold text-red-400">{filtLost}</p>
            </div>
          </div>

          {/* Celkový progress bar */}
          <div className={"rounded-xl p-4 mb-6 " + cardCls} style={cardStyle}>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Celková konverzia</span>
              <span className={"font-bold " + pctColor}>{filtPct}%</span>
            </div>
            <div className={"w-full rounded-full h-3 " + (dark ? "bg-gray-700" : "bg-gray-200")}>
              <div className="h-3 rounded-full transition-all duration-500" style={{ width: filtPct + "%", backgroundColor: barColor }} />
            </div>
          </div>

          {/* Office filter */}
          <div className="flex flex-wrap gap-2 mb-4 md:mb-8">
            {Object.keys(OFFICES).map(o => (
              <button key={o} onClick={() => setOffice(o)}
                className={"px-4 py-2 rounded-full text-sm font-medium " + (office === o ? "text-white" : btnBase)}
                style={office === o ? { backgroundColor: "#FF501C" } : {}}>
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
                  const c  = o.pct >= 50 ? "text-green-400" : o.pct >= 30 ? "text-yellow-400" : "text-red-400";
                  const bc = o.pct >= 50 ? "#22c55e"        : o.pct >= 30 ? "#eab308"         : "#ef4444";
                  return (
                    <div key={o.name} onClick={() => setOffice(o.name)}
                      className={"rounded-xl p-4 cursor-pointer hover:opacity-80 " + cardCls} style={cardStyle}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-lg">{o.name}</span>
                        <span className={"font-bold " + c}>{o.pct}%</span>
                      </div>
                      <div className={"w-full rounded-full h-2 mt-1 " + (dark ? "bg-gray-700" : "bg-gray-300")}>
                        <div className="h-2 rounded-full" style={{ width: o.pct + "%", backgroundColor: bc }} />
                      </div>
                      <p className={"text-xs mt-2 " + (dark ? "text-gray-400" : "text-gray-500")}>{o.inz} / {o.total} leadov</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Broker table */}
          <h2 className="text-xl font-semibold mb-4">
            {office === "Všetky" ? "Všetci makléri" : "Makléri – " + office}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className={theadCls} style={theadStyle}>
                <tr>
                  <th className="p-3 text-left">#</th>
                  <th className="p-3 text-left">Maklér</th>
                  <th className="p-3 text-left">Leadov</th>
                  <th className="p-3 text-left">Do ponuky</th>
                  <th className="p-3 text-left">Won</th>
                  <th className="p-3 text-left">Lost</th>
                  <th className="p-3 text-left">Úspešnosť</th>
                  <th className="p-3 text-left w-40">Graf</th>
                </tr>
              </thead>
              <tbody>
                {byBroker.map((b, i) => {
                  const c  = b.pct >= 50 ? "text-green-400" : b.pct >= 30 ? "text-yellow-400" : "text-red-400";
                  const bc = b.pct >= 50 ? "#22c55e"        : b.pct >= 30 ? "#eab308"         : "#ef4444";
                  return (
                    <tr key={b.name} className={"border-t " + rowCls}>
                      <td className="p-3 text-gray-500">{i + 1}</td>
                      <td className="p-3 font-medium">{b.name}</td>
                      <td className="p-3">{b.total}</td>
                      <td className={"p-3 font-bold " + c}>{b.inzerovane}</td>
                      <td className="p-3 text-green-400">{b.won}</td>
                      <td className="p-3 text-red-400">{b.lost}</td>
                      <td className={"p-3 font-bold " + c}>{b.pct}%</td>
                      <td className="p-3">
                        <div className={"w-full rounded-full h-2 " + (dark ? "bg-gray-700" : "bg-gray-300")}>
                          <div className="h-2 rounded-full" style={{ width: b.pct + "%", backgroundColor: bc }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {byBroker.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-gray-400">Žiadne dáta pre zvolené obdobie</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>}
      </div>
    </div>
  );
}
