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
  "KE": ["Ján Tej", "Adrián Šomšág", "Viliam Baran", "Jaroslav Hažlinský", "Martin Živčák", "Ján Slivka"]
};

const EXCLUDE       = ["Development", "Tomáš Martiš", "Miroslav Hrehor", "Peter Hudec", "Jaroslav Kováč"];
const CENA_KEY      = "880011fdbacbc3eee50103ec49001ac8abd56ae1"; // Cena je OK (enum, 100 = áno)
const ODP_AUTORRO   = "b4d54b0e06789b713abe1062178c19490259e00a"; // Odporúčaná cena - AUTORRO
const CENA_VOZIDLA  = "7bc01b48cc10642c58f19ce14bb33fe8abb7bb97"; // Cena vozidla

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

export default function DashboardClient() {
  const [deals, setDeals]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [office, setOffice]   = useState("Všetky");
  const [dark, setDark]       = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    fetch("/api/zdravie-ponuky")
      .then(r => r.json())
      .then(data => { setDeals(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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
  const officeDeals = office === "Všetky" ? cleanDeals : cleanDeals.filter(d => {
    const names = OFFICES[office] || [];
    return names.some(n => d.owner_name && d.owner_name.trim().toLowerCase() === n.trim().toLowerCase());
  });

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
    const od    = cleanDeals.filter(d => names.some(n => d.owner_name && d.owner_name.trim().toLowerCase() === n.trim().toLowerCase()));
    const ok    = od.filter(d => d[CENA_KEY] == 100).length;
    const pct   = od.length > 0 ? Math.round((ok / od.length) * 100) : 0;
    return { name: o, total: od.length, ok, pct };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <div className={"min-h-screen " + bg} style={bgStyle}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-3xl font-bold">Autorro Dashboard</h1>
          <button onClick={() => setDark(!dark)} className={"px-4 py-2 rounded-full text-sm font-medium " + btnBase}>
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
        <p className={"mb-6 " + (dark ? "text-gray-400" : "text-gray-500")}>
          Zdravie ponuky – Stage: Inzerované · klikni na makléra pre detail dealov
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[650px]">
              <thead className={theadCls} style={theadStyle}>
                <tr>
                  <th className="p-3 text-left w-8"></th>
                  <th className="p-3 text-left">#</th>
                  <th className="p-3 text-left">Maklér</th>
                  <th className="p-3 text-left">Celkom</th>
                  <th className="p-3 text-left">Áno</th>
                  <th className="p-3 text-left">Nie</th>
                  <th className="p-3 text-left">Zdravie</th>
                  <th className="p-3 text-left w-40">Graf</th>
                </tr>
              </thead>
              <tbody>
                {brokerList.map((b, i) => {
                  const h      = getHealth(b.pct);
                  const isOpen = !!expanded[b.name];
                  // Sort deals: nie OK first, then by price diff descending
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
                      {/* Broker summary row */}
                      <tr key={b.name}
                        className={"border-t cursor-pointer hover:opacity-80 " + rowCls}
                        onClick={() => toggleExpand(b.name)}>
                        <td className="p-3 text-center text-gray-400 select-none text-base">
                          {isOpen ? "▾" : "▸"}
                        </td>
                        <td className="p-3 text-gray-500">{i + 1}</td>
                        <td className="p-3 font-medium">{b.name}</td>
                        <td className="p-3">{b.total}</td>
                        <td className="p-3 text-green-400">{b.ok}</td>
                        <td className="p-3 text-red-400">{b.nie}</td>
                        <td className={"p-3 font-bold " + h.color}>{b.pct}%</td>
                        <td className="p-3"><HealthBar pct={b.pct} dark={dark} /></td>
                      </tr>

                      {/* Expanded deal detail */}
                      {isOpen && (
                        <tr key={b.name + "_detail"} className={"border-t " + rowCls}>
                          <td colSpan={8} className="p-0">
                            <div className="border-l-4 mx-2 mb-2 rounded-lg overflow-hidden" style={{ borderColor: "#FF501C" }}>
                              <table className="w-full text-xs min-w-[750px]">
                                <thead style={subHeadStyle}>
                                  <tr className={theadCls}>
                                    <th className="px-3 py-2 text-left">ID</th>
                                    <th className="px-3 py-2 text-left">Názov dealu</th>
                                    <th className="px-3 py-2 text-left">Otvorený</th>
                                    <th className="px-3 py-2 text-left">Cena vozidla</th>
                                    <th className="px-3 py-2 text-left">Odp. cena Autorro</th>
                                    <th className="px-3 py-2 text-left">% rozdiel vs Autorro</th>
                                    <th className="px-3 py-2 text-left">Cena OK</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sortedDeals.map(d => {
                                    const cenaOk   = d[CENA_KEY] == 100;
                                    const cenaVoz  = d[CENA_VOZIDLA];
                                    const odAut    = d[ODP_AUTORRO];
                                    const diff     = getPriceDiff(cenaVoz, odAut);
                                    const rowBg    = !cenaOk && diff > 10
                                      ? (dark ? "bg-red-950" : "bg-red-50")
                                      : !cenaOk
                                      ? (dark ? "bg-yellow-950" : "bg-yellow-50")
                                      : "";
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
                                            : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">✗ Nie</span>
                                          }
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
          </div>
        </>}
      </div>
    </div>
  );
}
