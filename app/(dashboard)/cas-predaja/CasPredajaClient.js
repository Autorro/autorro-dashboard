"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { OFFICES_WITH_ALL as OFFICES, EXCLUDE } from "@/lib/constants";

function getSpeed(avg) {
  if (avg === null || avg === undefined) return { label: "Bez dát", color: "text-gray-400", barColor: "bg-gray-400" };
  if (avg <= 30) return { label: "Rýchly", color: "text-green-400", barColor: "bg-green-500" };
  if (avg <= 60) return { label: "Priemerný", color: "text-yellow-400", barColor: "bg-yellow-500" };
  return { label: "Pomalý", color: "text-red-400", barColor: "bg-red-500" };
}

function SpeedBar({ avg, dark }) {
  const max = 90;
  const pct = avg != null ? Math.min((avg / max) * 100, 100) : 0;
  const { barColor } = getSpeed(avg);
  const track = dark ? "bg-gray-700" : "bg-gray-300";
  return (
    <div className={"w-full rounded-full h-2 mt-1 " + track}>
      <div className={barColor + " h-2 rounded-full"} style={{ width: pct + "%" }} />
    </div>
  );
}

function fmt(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleDateString("sk-SK", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtMoney(val, currency) {
  if (val == null) return "—";
  return new Intl.NumberFormat("sk-SK", { style: "currency", currency: currency || "EUR", maximumFractionDigits: 0 }).format(val);
}

function statusBadge(status) {
  if (status === "won")  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Predaný</span>;
  if (status === "lost") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Stratený</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Aktívny</span>;
}

function getOfficeNames(office) {
  if (office === "Všetky") {
    return Object.entries(OFFICES)
      .filter(([o]) => o !== "Všetky")
      .flatMap(([, names]) => names);
  }
  return OFFICES[office] || [];
}

export default function CasPredajaClient() {
  const [office, setOffice]       = useState("Všetky");
  const [dark, setDark]           = useState(false);
  const [expanded, setExpanded]   = useState({}); // { brokerName: true/false }

  const { data, error: swrError, isLoading } = useSWR("/api/cas-predaja");
  const loading = isLoading && !data;
  const error   = swrError ? "Nepodarilo sa načítať dáta." : null;

  const statsMap = useMemo(() => {
    const map = {};
    if (!Array.isArray(data)) return map;
    for (const row of data) {
      if (!row.owner_name) continue;
      map[row.owner_name.trim().toLowerCase()] = row;
    }
    return map;
  }, [data]);

  function getStats(name) { return statsMap[name.trim().toLowerCase()] || null; }
  function toggleExpand(name) { setExpanded(e => ({ ...e, [name]: !e[name] })); }

  const bg        = dark ? "text-white" : "text-gray-900";
  const bgStyle   = dark ? { backgroundColor: "#481132" } : { backgroundColor: "#FFFFFF" };
  const cardCls   = dark ? "shadow" : "bg-white shadow";
  const cardStyle = dark ? { backgroundColor: "#5c1a42" } : {};
  const rowCls    = dark ? "border-gray-700" : "border-gray-100";
  const subRowCls = dark ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-100";
  const theadCls  = dark ? "text-gray-300" : "text-gray-700";
  const theadStyle= dark ? { backgroundColor: "#3d0e2a" } : { backgroundColor: "#F7F6F4" };
  const subHeadStyle = dark ? { backgroundColor: "#2d0820" } : { backgroundColor: "#EFEFEF" };
  const btnBase   = dark ? "text-gray-300 hover:opacity-80" : "bg-gray-100 text-gray-700 hover:bg-gray-200";

  const names = getOfficeNames(office).filter(n => !EXCLUDE.includes(n));

  const brokerList = names
    .map(name => {
      const s = getStats(name);
      return { name, count: s?.count ?? 0, avg: s?.avg ?? null, min: s?.min ?? null, max: s?.max ?? null, deals: s?.deals ?? [] };
    })
    .sort((a, b) => {
      if (a.avg === null && b.avg === null) return 0;
      if (a.avg === null) return 1;
      if (b.avg === null) return -1;
      return a.avg - b.avg;
    });

  const officeSummary = Object.keys(OFFICES).filter(o => o !== "Všetky").map(o => {
    const onames   = (OFFICES[o] || []).filter(n => !EXCLUDE.includes(n));
    const withData = onames.filter(n => getStats(n));
    if (withData.length === 0) return { name: o, avg: null, count: 0 };
    const totalCount  = withData.reduce((a, n) => a + getStats(n).count, 0);
    const weightedAvg = withData.reduce((a, n) => a + getStats(n).avg * getStats(n).count, 0) / totalCount;
    return { name: o, avg: Math.round(weightedAvg * 10) / 10, count: totalCount };
  }).sort((a, b) => {
    if (a.avg === null && b.avg === null) return 0;
    if (a.avg === null) return 1;
    if (b.avg === null) return -1;
    return a.avg - b.avg;
  });

  const withData   = names.filter(n => getStats(n));
  const totalCount = withData.reduce((a, n) => a + getStats(n).count, 0);
  const overallAvg = totalCount > 0
    ? Math.round(withData.reduce((a, n) => a + getStats(n).avg * getStats(n).count, 0) / totalCount * 10) / 10
    : null;
  const overallSpeed = getSpeed(overallAvg);

  return (
    <div className={"min-h-screen " + bg} style={bgStyle}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-3xl font-bold">Čas predaja</h1>
          <button onClick={() => setDark(!dark)} className={"px-4 py-2 rounded-full text-sm font-medium " + btnBase}>
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
        <p className={"mb-6 " + (dark ? "text-gray-400" : "text-gray-500")}>
          Priemerný počet dní v stave Inzerované – čím menej, tým lepšie · klikni na makléra pre detail
        </p>

        {loading && (
          <div className="animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={"rounded-xl p-4 h-20 " + (dark ? "bg-[#5c1a42]" : "bg-gray-100")} />
              ))}
            </div>
            <div className="flex gap-2 mb-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className={"rounded-full h-9 w-16 " + (dark ? "bg-[#5c1a42]" : "bg-gray-100")} />
              ))}
            </div>
            <div className={"rounded-xl h-64 " + (dark ? "bg-[#5c1a42]" : "bg-gray-100")} />
          </div>
        )}
        {error && <div className="rounded-lg bg-red-100 border border-red-300 px-4 py-3 text-red-700 mb-6">{error}</div>}

        {!loading && !error && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
              <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
                <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Celkom maklérov</p>
                <p className="text-2xl font-bold">{names.length}</p>
              </div>
              <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
                <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Priem. čas (dni)</p>
                <p className={"text-2xl font-bold " + overallSpeed.color}>{overallAvg ?? "—"}</p>
              </div>
              <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
                <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Rýchlych (≤30d)</p>
                <p className="text-2xl font-bold text-green-400">{withData.filter(n => getStats(n).avg <= 30).length}</p>
              </div>
              <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
                <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Pomalých (&gt;60d)</p>
                <p className="text-2xl font-bold text-red-400">{withData.filter(n => getStats(n).avg > 60).length}</p>
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
                    const s = getSpeed(o.avg);
                    return (
                      <div key={o.name} onClick={() => setOffice(o.name)}
                        className={"rounded-xl p-4 cursor-pointer hover:opacity-80 " + cardCls} style={cardStyle}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-lg">{o.name}</span>
                          <span className={"font-bold " + s.color}>{o.avg !== null ? o.avg + "d" : "—"}</span>
                        </div>
                        <SpeedBar avg={o.avg} dark={dark} />
                        <p className={"text-xs mt-2 " + (dark ? "text-gray-400" : "text-gray-500")}>{o.count} dealov</p>
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
          <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full text-sm">
              <thead className={theadCls} style={theadStyle}>
                <tr>
                  <th className="p-3 text-left w-8"></th>
                  <th className="p-3 text-left hidden md:table-cell">#</th>
                  <th className="p-3 text-left">Maklér</th>
                  <th className="p-3 text-left hidden md:table-cell">Dealov</th>
                  <th className="p-3 text-left">Priem.</th>
                  <th className="p-3 text-left hidden md:table-cell">Min</th>
                  <th className="p-3 text-left hidden md:table-cell">Max</th>
                  <th className="p-3 text-left">Rýchlosť</th>
                  <th className="p-3 text-left w-32 hidden md:table-cell">Graf</th>
                </tr>
              </thead>
              <tbody>
                {brokerList.map((b, i) => {
                  const s = getSpeed(b.avg);
                  const isOpen = !!expanded[b.name];
                  return (
                    <>
                      <tr key={b.name}
                        className={"border-t cursor-pointer hover:opacity-80 " + rowCls}
                        onClick={() => b.deals.length > 0 && toggleExpand(b.name)}>
                        <td className="p-3 text-center text-gray-400 select-none">
                          {b.deals.length > 0 ? (isOpen ? "▾" : "▸") : ""}
                        </td>
                        <td className="p-3 text-gray-500 hidden md:table-cell">{i + 1}</td>
                        <td className="p-3 font-medium">{b.name}</td>
                        <td className="p-3 hidden md:table-cell">{b.count || "—"}</td>
                        <td className={"p-3 font-bold " + s.color}>{b.avg !== null ? b.avg + "d" : "—"}</td>
                        <td className="p-3 text-green-400 hidden md:table-cell">{b.min !== null ? b.min + "d" : "—"}</td>
                        <td className="p-3 text-red-400 hidden md:table-cell">{b.max !== null ? b.max + "d" : "—"}</td>
                        <td className={"p-3 " + s.color}>{s.label}</td>
                        <td className="p-3 hidden md:table-cell"><SpeedBar avg={b.avg} dark={dark} /></td>
                      </tr>

                      {isOpen && b.deals.length > 0 && (
                        <tr key={b.name + "_detail"} className={"border-t " + rowCls}>
                          <td colSpan={9} className="p-2">
                            <div className="border-l-4 rounded-lg overflow-hidden" style={{ borderColor: "#FF501C" }}>
                              {/* Mobile: cards */}
                              <div className="md:hidden flex flex-col gap-2 p-2">
                                {b.deals.map(d => {
                                  const ds = getSpeed(d.days);
                                  return (
                                    <div key={d.deal_id} className={"rounded-lg p-3 text-xs " + (dark ? "bg-gray-800" : "bg-white border border-gray-100")}>
                                      <div className="flex justify-between items-start mb-2">
                                        <a href={`https://autorro.pipedrive.com/deal/${d.deal_id}`}
                                          target="_blank" rel="noopener noreferrer"
                                          className="font-semibold hover:underline leading-tight" style={{ color: "#FF501C" }}
                                          onClick={e => e.stopPropagation()}>
                                          {d.deal_title || "—"}
                                        </a>
                                        {statusBadge(d.status)}
                                      </div>
                                      <div className="grid grid-cols-2 gap-1 text-gray-500">
                                        <span>#{d.pd_id || d.deal_id}</span>
                                        <span className={"font-bold " + ds.color}>{d.days}d v inzerovaní</span>
                                        <span>Otv: {fmt(d.add_time)}</span>
                                        <span>Uza: {fmt(d.close_time)}</span>
                                        <span>Hodnota: <span className="font-medium text-gray-800">{fmtMoney(d.value, d.currency)}</span></span>
                                      </div>
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
                                    <th className="px-3 py-2 text-left">Uzatvorený</th>
                                    <th className="px-3 py-2 text-left">Dni v inzerovaní</th>
                                    <th className="px-3 py-2 text-left">Hodnota dealu</th>
                                    <th className="px-3 py-2 text-left">Stav</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {b.deals.map(d => {
                                    const ds = getSpeed(d.days);
                                    return (
                                      <tr key={d.deal_id} className={"border-t " + subRowCls}>
                                        <td className="px-3 py-2 text-gray-500 font-mono">#{d.pd_id || d.deal_id}</td>
                                        <td className="px-3 py-2 font-medium max-w-[220px] truncate" title={d.deal_title}>
                                          <a href={`https://autorro.pipedrive.com/deal/${d.deal_id}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="hover:underline" style={{ color: "#FF501C" }}
                                            onClick={e => e.stopPropagation()}>
                                            {d.deal_title || "—"}
                                          </a>
                                        </td>
                                        <td className="px-3 py-2">{fmt(d.add_time)}</td>
                                        <td className="px-3 py-2">{fmt(d.close_time)}</td>
                                        <td className={"px-3 py-2 font-bold " + ds.color}>{d.days}d</td>
                                        <td className="px-3 py-2">{fmtMoney(d.value, d.currency)}</td>
                                        <td className="px-3 py-2">{statusBadge(d.status)}</td>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
