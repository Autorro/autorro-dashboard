"use client";

import { useEffect, useState } from "react";

// Each broker is { display, aliases } — aliases are all name variants in Pipedrive
const BROKER_GROUPS = {
  "BB": [
    { display: "Dominika Kompaniková", aliases: ["Dominika Kompaniková", "Dominka Kompaníková"] },
    { display: "Milan Kováč", aliases: ["Milan Kováč"] },
    { display: "Andrej Čík", aliases: ["Andrej Čík"] },
    { display: "Tomáš Urbán", aliases: ["Tomáš Urbán", "Tomás Urban"] },
    { display: "Dávid Juhaniak", aliases: ["Dávid Juhaniak", "David Juhaniak"] },
  ],
  "TT": [
    { display: "Bálint Forró", aliases: ["Bálint Forró", "Bálint Forro"] },
    { display: "Tomáš Opálek", aliases: ["Tomáš Opálek"] },
    { display: "Karolína Lisická", aliases: ["Karolína Lisická"] },
    { display: "Martin Blažek", aliases: ["Martin Blažek"] },
    { display: "Lukáš Krommel", aliases: ["Lukáš Krommel"] },
  ],
  "NR": [
    { display: "Martin Petráš", aliases: ["Martin Petráš"] },
    { display: "Dávid Kalužák", aliases: ["Dávid Kalužák", "David Kalužák"] },
    { display: "Daniel Kádek", aliases: ["Daniel Kádek"] },
    { display: "Gabriela Šodorová", aliases: ["Gabriela Šodorová"] },
    { display: "Dávid Čintala", aliases: ["Dávid Čintala"] },
  ],
  "BA": [
    { display: "Milan Švorc", aliases: ["Milan Švorc"] },
    { display: "Ján Mikuš", aliases: ["Ján Mikuš"] },
    { display: "Richard Kiss", aliases: ["Richard Kiss"] },
    { display: "Karin Harvan", aliases: ["Karin Harvan"] },
    { display: "Matej Hromada", aliases: ["Matej Hromada"] },
    { display: "Milan Pulc", aliases: ["Milan Pulc"] },
    { display: "Martin Bošeľa", aliases: ["Martin Bošeľa"] },
    { display: "Peter Maťo", aliases: ["Peter Maťo"] },
    { display: "Jonathán Pavelka", aliases: ["Jonathán Pavelka"] },
    { display: "Matej Klačko", aliases: ["Matej Klačko"] },
    { display: "Dominik Ďurčo", aliases: ["Dominik Ďurčo"] },
  ],
  "TN": [
    { display: "Libor Koníček", aliases: ["Libor Koníček"] },
    { display: "Tomáš Otrubný", aliases: ["Tomáš Otrubný"] },
    { display: "Peter Mjartan", aliases: ["Peter Mjartan"] },
    { display: "Martin Mečiar", aliases: ["Martin Mečiar"] },
    { display: "Ján Skovajsa", aliases: ["Ján Skovajsa"] },
    { display: "Tomáš Kučerka", aliases: ["Tomáš Kučerka"] },
    { display: "Patrik Frič", aliases: ["Patrik Frič"] },
  ],
  "ZA": [
    { display: "Tomáš Smieško", aliases: ["Tomáš Smieško"] },
    { display: "Daniel Jašek", aliases: ["Daniel Jašek"] },
    { display: "Vladko Hess", aliases: ["Vladko Hess", "Wlodzimierz Hess"] },
    { display: "Irena Varadová", aliases: ["Irena Varadová"] },
    { display: "Matej Gažo", aliases: ["Matej Gažo"] },
    { display: "Veronika Maťková", aliases: ["Veronika Maťková"] },
    { display: "Tomáš Ďurana", aliases: ["Tomáš Ďurana"] },
  ],
  "PP": [
    { display: "Sebastián Čuban", aliases: ["Sebastián Čuban"] },
    { display: "Tomáš Matta", aliases: ["Tomáš Matta"] },
  ],
  "KE": [
    { display: "Ján Tej", aliases: ["Ján Tej"] },
    { display: "Adrián Šomšág", aliases: ["Adrián Šomšág"] },
    { display: "Viliam Baran", aliases: ["Viliam Baran"] },
    { display: "Jaroslav Hažlinský", aliases: ["Jaroslav Hažlinský"] },
    { display: "Martin Živčák", aliases: ["Martin Živčák"] },
    { display: "Ján Slivka", aliases: ["Ján Slivka"] },
  ],
};

const EXCLUDE = ["Development", "Tomáš Martiš", "Miroslav Hrehor", "Peter Hudec", "Jaroslav Kováč"];

// Build alias → display lookup
const ALIAS_TO_DISPLAY = {};
for (const brokers of Object.values(BROKER_GROUPS)) {
  for (const { display, aliases } of brokers) {
    for (const a of aliases) {
      ALIAS_TO_DISPLAY[a.trim().toLowerCase()] = display;
    }
  }
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

function getBrokers(office) {
  if (office === "Všetky") {
    const seen = new Set();
    return Object.values(BROKER_GROUPS).flatMap(list =>
      list.filter(b => { if (seen.has(b.display)) return false; seen.add(b.display); return true; })
    );
  }
  return BROKER_GROUPS[office] || [];
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
        // Aggregate by display name (merge aliases)
        const raw = {};
        for (const row of data) {
          const display = ALIAS_TO_DISPLAY[row.owner_name?.trim().toLowerCase()] || row.owner_name;
          if (!display || EXCLUDE.includes(display)) continue;
          if (!raw[display]) raw[display] = [];
          // Push individual deal days if available, else use avg as proxy
          raw[display].push({ avg: row.avg, count: row.count, min: row.min, max: row.max });
        }
        // Combine entries per display name
        const map = {};
        for (const [display, rows] of Object.entries(raw)) {
          const totalCount = rows.reduce((s, r) => s + r.count, 0);
          const weightedAvg = rows.reduce((s, r) => s + r.avg * r.count, 0) / totalCount;
          const minVal = Math.min(...rows.map(r => r.min));
          const maxVal = Math.max(...rows.map(r => r.max));
          map[display] = {
            count: totalCount,
            avg: Math.round(weightedAvg * 10) / 10,
            min: Math.round(minVal * 10) / 10,
            max: Math.round(maxVal * 10) / 10,
          };
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

  const brokers = getBrokers(office).filter(b => !EXCLUDE.includes(b.display));

  const brokerList = brokers.map(({ display }) => {
    const s = statsMap[display] || null;
    return { name: display, count: s ? s.count : 0, avg: s ? s.avg : null, min: s ? s.min : null, max: s ? s.max : null };
  }).sort((a, b) => {
    if (a.avg === null && b.avg === null) return 0;
    if (a.avg === null) return 1;
    if (b.avg === null) return -1;
    return a.avg - b.avg;
  });

  const officeSummary = Object.keys(BROKER_GROUPS).map(o => {
    const obrokers = BROKER_GROUPS[o].filter(b => !EXCLUDE.includes(b.display));
    const withData = obrokers.filter(b => statsMap[b.display]);
    if (withData.length === 0) return { name: o, avg: null, count: 0 };
    const totalCount = withData.reduce((a, b) => a + statsMap[b.display].count, 0);
    const weightedAvg = withData.reduce((a, b) => a + statsMap[b.display].avg * statsMap[b.display].count, 0) / totalCount;
    return { name: o, avg: Math.round(weightedAvg * 10) / 10, count: totalCount };
  }).sort((a, b) => {
    if (a.avg === null && b.avg === null) return 0;
    if (a.avg === null) return 1;
    if (b.avg === null) return -1;
    return a.avg - b.avg;
  });

  const withData = brokers.filter(b => statsMap[b.display]);
  const totalCount = withData.reduce((a, b) => a + statsMap[b.display].count, 0);
  const overallAvg = totalCount > 0
    ? Math.round(withData.reduce((a, b) => a + statsMap[b.display].avg * statsMap[b.display].count, 0) / totalCount * 10) / 10
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
              <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
                <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Celkom maklérov</p>
                <p className="text-2xl font-bold">{brokers.length}</p>
              </div>
              <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
                <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Priem. čas (dni)</p>
                <p className={"text-2xl font-bold " + overallSpeed.color}>{overallAvg ?? "—"}</p>
              </div>
              <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
                <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Rýchlych (≤30d)</p>
                <p className="text-2xl font-bold text-green-400">{withData.filter(b => statsMap[b.display].avg <= 30).length}</p>
              </div>
              <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
                <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Pomalých (&gt;60d)</p>
                <p className="text-2xl font-bold text-red-400">{withData.filter(b => statsMap[b.display].avg > 60).length}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4 md:mb-8">
              {["Všetky", ...Object.keys(BROKER_GROUPS)].map(o => (
                <button key={o} onClick={() => setOffice(o)}
                  className={"px-4 py-2 rounded-full text-sm font-medium " + (office === o ? "text-white" : btnBase)}
                  style={office === o ? { backgroundColor: "#FF501C" } : {}}>
                  {o}
                </button>
              ))}
            </div>

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
