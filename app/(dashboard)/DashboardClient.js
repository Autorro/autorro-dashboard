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

const EXCLUDE = ["Development", "Tomáš Martiš", "Miroslav Hrehor", "Peter Hudec", "Jaroslav Kováč"];
const CENA_KEY = "880011fdbacbc3eee50103ec49001ac8abd56ae1";

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

export default function DashboardClient() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [office, setOffice] = useState("Všetky");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    fetch("/api/zdravie-ponuky")
      .then(r => r.json())
      .then(data => { setDeals(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const bg = dark ? "text-white" : "text-gray-900";
  const bgStyle = dark ? {backgroundColor: '#481132'} : {backgroundColor: '#FFFFFF'};
  const cardCls = dark ? "shadow" : "bg-white shadow";
  const cardStyle = dark ? {backgroundColor: '#5c1a42'} : {};
  const rowCls = dark ? "border-gray-700" : "border-gray-100 hover:bg-gray-50";
  const theadCls = dark ? "text-gray-300" : "text-gray-700";
  const theadStyle = dark ? {backgroundColor: '#3d0e2a'} : {backgroundColor: '#F7F6F4'};
  const btnBase = dark ? "text-gray-300 hover:opacity-80" : "bg-gray-100 text-gray-700 hover:bg-gray-200";

  const cleanDeals = deals.filter(d => !EXCLUDE.includes(d.owner_name));
  const officeDeals = office === "Všetky" ? cleanDeals : cleanDeals.filter(d => {
    const names = OFFICES[office] || [];
    return names.some(n => d.owner_name && d.owner_name.trim().toLowerCase() === n.trim().toLowerCase());
  });

  const brokers = {};
  officeDeals.forEach(deal => {
    const name = deal.owner_name || "Neznámy";
    if (!brokers[name]) brokers[name] = { total: 0, ok: 0, nie: 0 };
    brokers[name].total++;
    if (deal[CENA_KEY] == 100) brokers[name].ok++;
    else brokers[name].nie++;
  });

  const brokerList = Object.entries(brokers)
    .map(([name, s]) => ({ name, ...s, pct: s.total > 0 ? Math.round((s.ok / s.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct);

  const totalOk = officeDeals.filter(d => d[CENA_KEY] == 100).length;
  const totalPct = officeDeals.length > 0 ? Math.round((totalOk / officeDeals.length) * 100) : 0;
  const health = getHealth(totalPct);

  const TOP_BRANDS = ["ŠKODA", "VOLKSWAGEN", "BMW", "AUDI", "MERCEDES"];
  const brandStats = TOP_BRANDS.map(brand => {
    const matches = officeDeals.filter(d => d.title && d.title.toUpperCase().includes(brand));
    const pct = officeDeals.length > 0 ? Math.round((matches.length / officeDeals.length) * 100) : 0;
    return { brand, count: matches.length, pct };
  });
  const topBrandTotal = brandStats.reduce((a, b) => a + b.count, 0);
  const topBrandPct = officeDeals.length > 0 ? Math.round((topBrandTotal / officeDeals.length) * 100) : 0;

  const officeSummary = Object.keys(OFFICES).filter(o => o !== "Všetky").map(o => {
    const names = OFFICES[o];
    const od = cleanDeals.filter(d => names.some(n => d.owner_name && d.owner_name.trim().toLowerCase() === n.trim().toLowerCase()));
    const ok = od.filter(d => d[CENA_KEY] == 100).length;
    const pct = od.length > 0 ? Math.round((ok / od.length) * 100) : 0;
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
        <p className={"mb-6 " + (dark ? "text-gray-400" : "text-gray-500")}>Zdravie ponuky – Stage: Inzerované</p>

        {loading && (
          <div className="flex items-center gap-3 text-gray-400 py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-orange-500" />
            Načítavam dáta...
          </div>
        )}

        {!loading && <>
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

          <div className="flex flex-wrap gap-2 mb-4 md:mb-8">
            {Object.keys(OFFICES).map(o => (
              <button key={o} onClick={() => setOffice(o)}
                className={"px-4 py-2 rounded-full text-sm font-medium " + (office === o ? "text-white" : btnBase)} style={office === o ? {backgroundColor: "#FF501C"} : {}}>
                {o}
              </button>
            ))}
          </div>

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

          <h2 className="text-xl font-semibold mb-4">
            {office === "Všetky" ? "Všetci makléri" : "Makléri – " + office}
          </h2>
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[600px]">
            <thead className={theadCls}>
              <tr>
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
                const h = getHealth(b.pct);
                return (
                  <tr key={b.name} className={"border-t " + rowCls}>
                    <td className="p-3 text-gray-500">{i + 1}</td>
                    <td className="p-3 font-medium">{b.name}</td>
                    <td className="p-3">{b.total}</td>
                    <td className="p-3 text-green-400">{b.ok}</td>
                    <td className="p-3 text-red-400">{b.nie}</td>
                    <td className={"p-3 font-bold " + h.color}>{b.pct}%</td>
                    <td className="p-3"><HealthBar pct={b.pct} dark={dark} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </>}
      </div>
    </div>
  );
}