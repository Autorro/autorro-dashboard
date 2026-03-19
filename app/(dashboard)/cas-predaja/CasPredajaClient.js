"use client";

import { useEffect, useState } from "react";

const OFFICES = {
  "Všetky": null,
  "BB": ["Dominika Kompaniková", "Dominka Kompaníková", "Milan Kováč", "Andrej Čík", "Tomáš Urbán", "Tomás Urban", "Dávid Juhaniak", "David Juhaniak"],
  "TT": ["Bálint Forró", "Bálint Forro", "Tomáš Opálek", "Karolína Lisická", "Martin Blažek", "Lukáš Krommel"],
  "NR": ["Martin Petráš", "Dávid Kalužák", "David Kalužák", "Daniel Kádek", "Gabriela Šodorová", "Dávid Čintala"],
  "BA": ["Milan Švorc", "Ján Mikuš", "Richard Kiss", "Karin Harvan", "Matej Hromada", "Milan Pulc", "Martin Bošeľa", "Peter Maťo", "Jonathán Pavelka", "Matej Klačko", "Dominik Ďurčo"],
  "TN": ["Libor Koníček", "Tomáš Otrubný", "Peter Mjartan", "Martin Mečiar", "Ján Skovajsa", "Tomáš Kučerka", "Patrik Frič"],
  "ZA": ["Tomáš Smieško", "Daniel Jašek", "Vladko Hess", "Wlodzimierz Hess", "Irena Varadová", "Matej Gažo", "Veronika Maťková", "Tomáš Ďurana"],
  "PP": ["Sebastián Čuban", "Tomáš Matta"],
  "KE": ["Ján Tej", "Adrián Šomšág", "Viliam Baran", "Jaroslav Hažlinský", "Martin Živčák", "Ján Slivka"],
};

const EXCLUDE = ["Development", "Tomáš Martiš", "Miroslav Hrehor", "Peter Hudec", "Jaroslav Kováč"];

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
  const [statsMap, setStatsMap]   = useState({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [office, setOffice]       = useState("Všetky");
  const [dark, setDark]           = useState(false);
  const [expanded, setExpanded]   = useState({}); // { brokerName: true/false }

  useEffect(() => {
    fetch("/api/cas-predaja")
      .then(r => r.json())
      .then(data => {
        const map = {};
        for (const row of data) {
          if (!row.owner_name) continue;
          map[row.owner_name.trim().toLowerCase()] = row;
        }
        setStatsMap(map);
        setLoading(false);
      })
      .catch(() => { setError("Nepodarilo sa načítať dáta."); setLoading(false); });
  }, []);

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
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className={theadCls} style={theadStyle}>
                  <tr>
                    <th className="p-3 text-left w-8"></th>
                    <th className="p-3 text-left">#</th>
                    <th className="p-3 text-left">Maklér</th>
                    <th className="p-3 text-left">Dealov</th>
                    <th className="p-3 text-left">Priem. čas</th>
                    <th className="p-3 text-left">Min</th>
                    <th className="p-3 text-left">Max</th>
                    <th className="p-3 text-left">Rýchlosť</th>
                    <th className="p-3 text-left w-36">Graf</th>
                  </tr>
                </thead>
                <tbody>
                  {brokerList.map((b, i) => {
                    const s = getSpeed(b.avg);
                    const isOpen = !!expanded[b.name];
                    return (
                      <>
                        {/* Broker summary row */}
                        <tr key={b.name}
                          className={"border-t cursor-pointer hover:opacity-80 " + rowCls}
                          onClick={() => b.deals.length > 0 && toggleExpand(b.name)}>
                          <td className="p-3 text-center text-gray-400 select-none">
                            {b.deals.length > 0 ? (isOpen ? "▾" : "▸") : ""}
                          </td>
                          <td className="p-3 text-gray-500">{i + 1}</td>
                          <td className="p-3 font-medium">{b.name}</td>
                          <td className="p-3">{b.count || "—"}</td>
                          <td className={"p-3 font-bold " + s.color}>{b.avg !== null ? b.avg + "d" : "—"}</td>
                          <td className="p-3 text-green-400">{b.min !== null ? b.min + "d" : "—"}</td>
                          <td className="p-3 text-red-400">{b.max !== null ? b.max + "d" : "—"}</td>
                          <td className={"p-3 " + s.color}>{s.label}</td>
                          <td className="p-3"><SpeedBar avg={b.avg} dark={dark} /></td>
                        </tr>

                        {/* Expanded deal detail rows */}
                        {isOpen && b.deals.length > 0 && (
                          <tr key={b.name + "_detail"} className={"border-t " + rowCls}>
                            <td colSpan={9} className="p-0">
                              <div className={"border-l-4 mx-2 mb-2 rounded-lg overflow-hidden"} style={{ borderColor: "#FF501C" }}>
                                <table className="w-full text-xs min-w-[700px]">
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
