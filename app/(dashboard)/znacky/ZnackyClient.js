"use client";
import { useEffect, useState } from "react";

const ACCENT = "#FF501C";

// Farba podľa mena značky (konzistentná)
function brandColor(name) {
  const palette = [
    "#2563eb","#16a34a","#d97706","#7c3aed","#db2777",
    "#0891b2","#ea580c","#059669","#4f46e5","#dc2626",
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % palette.length;
  return palette[h];
}

// Logo/emoji podľa značky
const BRAND_EMOJI = {
  "Škoda":"🟢","Volkswagen":"🔵","BMW":"🔷","Audi":"⭕","Mercedes":"⭐",
  "Ford":"🔴","Opel":"⚡","Toyota":"🟥","Hyundai":"🟦","Kia":"⬛",
  "Seat":"🟠","Cupra":"🔥","Peugeot":"🦁","Renault":"🔷","Citroen":"⬆️",
  "Fiat":"🇮🇹","Honda":"🔴","Mazda":"🌀","Dacia":"🟩","Volvo":"🇸🇪",
  "Porsche":"🐴","Lexus":"🏅","Tesla":"⚡","Mini":"🇬🇧","Land Rover":"🦁",
  "Alfa Romeo":"🍀","Jeep":"🏔️","Subaru":"⭐","Suzuki":"🎌","Jaguar":"🐆",
  "Bmw":"🔷","Volkswagen":"🔵",
};

function getBrandInitial(brand) {
  return (brand||"?")[0].toUpperCase();
}

// Značky vylúčené zo zobrazenia (testovací/nerelevantný obsah)
const EXCLUDE_BRANDS = new Set(["Bugatti"]);

const SORT_OPTIONS = [
  { key:"total",   label:"Počet OP" },
  { key:"won",     label:"Počet Won" },
  { key:"winRate", label:"Win rate %" },
  { key:"open",    label:"Aktívne" },
];

export default function ZnackyClient() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort,    setSort]    = useState("total");
  const [search,  setSearch]  = useState("");
  const [minOp,   setMinOp]   = useState(1);

  const load = (force=false) => {
    setLoading(true);
    fetch(`/api/znacky${force?"?force=1":""}`)
      .then(r => r.json())
      .then(d => setData(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = data
    .filter(b => !EXCLUDE_BRANDS.has(b.brand))
    .filter(b => b.total >= minOp)
    .filter(b => !search || b.brand.toLowerCase().includes(search.toLowerCase()))
    .sort((a, z) => {
      // Neurčená vždy na koniec
      if (a.brand === "Neurčená" && z.brand !== "Neurčená") return 1;
      if (z.brand === "Neurčená" && a.brand !== "Neurčená") return -1;
      if (sort === "winRate") {
        const av = a.winRate ?? -1, bv = z.winRate ?? -1;
        return bv - av;
      }
      return z[sort] - a[sort];
    });

  const totalOp  = data.reduce((s,b) => s+b.total, 0);
  const totalWon = data.reduce((s,b) => s+b.won,   0);
  const totalOpen= data.reduce((s,b) => s+b.open,  0);
  const globalWinRate = (totalWon+data.reduce((s,b)=>s+b.lost,0)) > 0
    ? Math.round(totalWon / (totalWon + data.reduce((s,b)=>s+b.lost,0)) * 100) : 0;

  const maxTotal = filtered[0]?.total || 1;

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-gray-200 rounded-2xl w-1/2"/>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_,i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl"/>)}
      </div>
      {[...Array(8)].map((_,i) => <div key={i} className="h-14 bg-gray-200 rounded-2xl"/>)}
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Nadpis */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">🚘 Značky vozidiel</h1>
          <p className="text-sm text-gray-400 mt-0.5">Počet OP, won a win rate podľa značky · všetky časy</p>
        </div>
        <button onClick={() => load(true)}
          className="text-xs px-4 py-2 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-1.5 font-medium">
          🔄 Obnoviť
        </button>
      </div>

      {/* Súhrnné karty */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Celkom OP",     value:totalOp,       icon:"📋", fmt:v=>v+" ks",   grad:"from-blue-600 to-blue-700" },
          { label:"Celkom Won",    value:totalWon,       icon:"✅", fmt:v=>v+" ks",   grad:"from-green-600 to-green-700" },
          { label:"Aktívne",       value:totalOpen,      icon:"🔄", fmt:v=>v+" ks",   grad:"from-orange-500 to-orange-600" },
          { label:"Celk. win rate",value:globalWinRate,  icon:"🎯", fmt:v=>v+"%",     grad:"from-purple-600 to-purple-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 text-white bg-gradient-to-br ${s.grad} shadow-sm`}>
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">{s.icon} {s.label}</p>
            <p className="text-xl font-extrabold">{s.fmt(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Filtre + zoradenie */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Hľadaj značku</label>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="napr. BMW, Škoda..."
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Min. OP</label>
          <select value={minOp} onChange={e=>setMinOp(Number(e.target.value))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-200">
            {[1,2,5,10,20,50].map(v=><option key={v} value={v}>≥ {v} OP</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Zoradiť podľa</label>
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map(o=>(
              <button key={o.key} onClick={()=>setSort(o.key)}
                className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
                style={sort===o.key
                  ?{backgroundColor:ACCENT,color:"white",boxShadow:`0 2px 8px ${ACCENT}55`}
                  :{backgroundColor:"#f3f4f6",color:"#6b7280"}}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Zoznam značiek */}
      <div className="space-y-2">
        {filtered.map((b, i) => {
          const color   = brandColor(b.brand);
          const emoji   = BRAND_EMOJI[b.brand];
          const barPct  = (b.total / maxTotal) * 100;
          const wonPct  = b.total > 0 ? (b.won / b.total) * 100 : 0;

          return (
            <div key={b.brand}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
              style={{ borderLeft: `4px solid ${color}` }}>

              <div className="px-4 py-3.5 flex items-center gap-3">

                {/* Avatar + rank */}
                <div className="flex-shrink-0 relative">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-extrabold"
                    style={{ backgroundColor: color }}>
                    {emoji || getBrandInitial(b.brand)}
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 text-xs font-bold text-gray-400 bg-white rounded-full px-0.5 leading-tight">
                    #{i+1}
                  </span>
                </div>

                {/* Meno + bary */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm mb-1.5">{b.brand}</p>
                  {/* Celkový bar (OP) */}
                  <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="absolute left-0 top-0 h-full rounded-full transition-all"
                      style={{ width: barPct+"%", backgroundColor: color+"33", border: `1px solid ${color}55` }}/>
                    {/* Won segment */}
                    <div className="absolute left-0 top-0 h-full rounded-full transition-all"
                      style={{ width: wonPct+"%", backgroundColor: color }}/>
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-bold"
                      style={{ color: wonPct>30 ? "white" : color }}>
                      {b.won} won / {b.total} OP
                    </span>
                  </div>
                </div>

                {/* Štatistiky */}
                <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-lg font-extrabold text-gray-900 leading-none">{b.open}</p>
                    <p className="text-xs text-gray-400 mt-0.5">aktívne</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-extrabold text-green-700 leading-none">{b.won}</p>
                    <p className="text-xs text-gray-400 mt-0.5">won</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-extrabold text-red-500 leading-none">{b.lost}</p>
                    <p className="text-xs text-gray-400 mt-0.5">lost</p>
                  </div>
                  {b.winRate !== null && (
                    <div className="text-center min-w-[52px]">
                      <p className="text-lg font-extrabold leading-none"
                        style={{ color: b.winRate>=50?"#16a34a":b.winRate>=30?"#d97706":"#dc2626" }}>
                        {b.winRate}%
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">win rate</p>
                    </div>
                  )}
                </div>

                {/* Mobile: len win rate */}
                <div className="sm:hidden text-right flex-shrink-0">
                  {b.winRate !== null && (
                    <p className="text-base font-extrabold"
                      style={{ color: b.winRate>=50?"#16a34a":b.winRate>=30?"#d97706":"#dc2626" }}>
                      {b.winRate}%
                    </p>
                  )}
                  <p className="text-xs text-gray-400">{b.total} OP</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold text-gray-600">Žiadne značky nezodpovedajú filtru.</p>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">{data.length} značiek · {totalOp} celkovo OP · cache 10 min</p>
    </div>
  );
}
