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

// Build canonical name map (first alias = display name)
const CANONICAL = {};
for (const names of Object.values(OFFICES)) {
  if (!names) continue;
  const display = names[0];
  for (const n of names) {
    CANONICAL[n.trim().toLowerCase()] = display;
  }
}

function canonicalize(name) {
  if (!name) return null;
  return CANONICAL[name.trim().toLowerCase()] || name;
}

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

// Get unique canonical broker names for an office (preserving OFFICES order)
function getBrokerNames(office) {
  const names = OFFICES[office];
  if (!names) return [];
  const seen = new Set();
  const result = [];
  for (const n of names) {
    const c = CANONICAL[n.trim().toLowerCase()] || n;
    if (!seen.has(c)) { seen.add(c); result.push(c); }
  }
  return result;
}

export default function CasPredajaClient() {
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [office, setOffice] = useState("Všetky");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    fetch("/api/cas-predaja")
      .then(r => r.json())
      .then(data => {
        // Merge by canonical name, keep row with most deals
        const map = {};
        for (const row of data) {
          const c = canonicalize(row.owner_name);
          if (!c || EXCLUDE.includes(c)) continue;
          if (!map[c] || row.count > map[c].count) map[c] = row;
        }
        setStatsMap(map);
        setLoading(false);
      })
      .catch(() => { setError("Nepodarilo sa načítať dáta."); setLoading(false); });
  }, []);

  const bg = dark ? "text-white" : "text-gray-900";
  const bgStyle = dark ? { backgroundColor: "#481132" } : { backgroundColor: "#FFFFFF" };
  const cardCls = dark ? "shadow" : "bg-white shadow";
  const cardStyle = dark ? { backgroundColor: "#5c1a42" } : {};
  const rowCls = dark ? "border-gray-700" : "border-gray-100 hover:bg-gray-50";
  const theadCls = dark ? "text-gray-300" : "text-gray-700";
  const theadStyle = dark ? { backgroundColor: "#3d0e2a" } : { backgroundColor: "#F7F6F4" };
  const btnBase = dark ? "text-gray-300 hover:opacity-80" : "bg-gray-100 text-gray-700 hover:bg-gray-200";

  // Broker names for selected office
  const brokerNames = office === "Všetky"
    ? Object.keys(OFFICES).filter(o => o !== "Všetky").flatMap(getBrokerNames).filter((n, i, a) => a.indexOf(n) === i)
    : getBrokerNames(office);

  const brokerList = brokerNames
    .filter(n => !EXCLUDE.includes(n))
    .map(name => {
      const s = statsMap[name] || null;
      return { name, count: s ? s.count : 0, avg: s ? s.avg : null, min: s ? s.min : null, max: s ? s.max : null };
    })
    .sort((a, b) => {
      if (a.avg === null && b.avg === null) return 0;
      if (a.avg === null) return 1;
      if (b.avg === null) return -1;
      return a.avg - b.avg;
    });

  // Office summary cards
  const officeSummary = Object.keys(OFFICES).filter(o => o !== "Všetky").map(o => {
    const names = getBrokerNames(o).filter(n => !EXCLUDE.includes(n));
    const withData = names.filter(n => statsMap[n]);
    if (withData.length === 0) return { name: o, avg: null, count: 0 };
    const totalAvg = withData.reduce((a, n) => a + statsMap[n].avg, 0) / withData.length;
    const totalCount = withData.reduce((a, n) => a + statsMap[n].count, 0);
    return { name: o, avg: Math.round(totalAvg * 10) / 10, count: totalCount };
  }).sort((a, b) => {
    if (a.avg === null && b.avg === null) return 0;
    if (a.avg === null) return 1;
    if (b.avg === null) return -1;
    return a.avg - b.avg;
  });

  const withData = brokerNames.filter(n => !EXCLUDE.includes(n) && statsMap[n]);
  const overallAvg = withData.length > 0
    ? Math.round(withData.reduce((a, n) => a + statsMap[n].avg, 0) / withData.length * 10) / 10
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
          Priemerný počet dní v stave Inzerované – čím menej, tým lepšie
        </p>

        {loading && (
          <div className="flex items-center gap-3 text-gray-400 py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-orange-500" />
            Načítavam dáta...
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-red-100 border border-red-300 px-4 py-3 text-red-700 mb-6">{error}</div>
        )}

        {!loading && !error && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
              <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
                <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Celkom maklérov</p>
                <p className="text-2xl font-bold">{brokerNames.filter(n => !EXCLUDE.includes(n)).length}</p>
              </div>
              <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
                <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Priem. čas (dni)</p>
                <p className={"text-2xl font-bold " + overallSpeed.color}>{overallAvg ?? "—"}</p>
              </div>
              <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
                <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Rýchlych (≤30d)</p>
                <p className="text-2xl font-bold text-green-400">{withData.filter(n => statsMap[n].avg <= 30).length}</p>
              </div>
              <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
                <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Pomalých (&gt;60d)</p>
                <p className="text-2xl font-bold text-red-400">{withData.filter(n => statsMap[n].avg > 60).length}</p>
              </div>
            </div>

            {/* Office filter buttons */}
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
              <table className="w-full text-sm min-w-[600px]">
                <thead className={theadCls} style={theadStyle}>
                  <tr>
                    <th className="p-3 text-left">#</th>
                    <th className="p-3 text-left">Maklér</th>
                    <th className="p-3 text-left">Dealov</th>
                    <th className="p-3 text-left">Priem. čas</th>
                    <th className="p-3 text-left">Min</th>
                    <th className="p-3 text-left">Max</th>
                    <th className="p-3 text-left">Rýchlosť</th>
                    <th className="p-3 text-left w-40">Graf</th>
                  </tr>
                </thead>
                <tbody>
                  {brokerList.map((b, i) => {
                    const s = getSpeed(b.avg);
                    return (
                      <tr key={b.name} className={"border-t " + rowCls}>
                        <td className="p-3 text-gray-500">{i + 1}</td>
                        <td className="p-3 font-medium">{b.name}</td>
                        <td className="p-3">{b.count || "—"}</td>
                        <td className={"p-3 font-bold " + s.color}>{b.avg !== null ? b.avg + "d" : "—"}</td>
                        <td className="p-3 text-green-400">{b.min !== null ? b.min + "d" : "—"}</td>
                        <td className="p-3 text-red-400">{b.max !== null ? b.max + "d" : "—"}</td>
                        <td className={"p-3 " + s.color}>{s.label}</td>
                        <td className="p-3"><SpeedBar avg={b.avg} dark={dark} /></td>
                      </tr>
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
