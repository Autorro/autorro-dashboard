"use client";
import { useState } from "react";
import useSWR from "swr";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine,
} from "recharts";

/* ── Konštanty ── */
const STAGES = {
  7: "Dohodnúť stretnutie",
  8: "Neskôr dohodnúť",
  9: "Dohodnuté stretnutie",
  10: "Nafotené",
  11: "Podpisované",
  13: "Inzerované",
  31: "Inzerované SK",
  34: "Inzerované SK2",
  22: "Inzerované CZ",
};

const ACCENT   = "#FF501C";
const cardCls  = "bg-white rounded-xl shadow-sm";

/* ── Pomocné funkcie ── */
function fmtHours(h) {
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  const r = h % 24;
  return r ? `${d}d ${r}h` : `${d}d`;
}

function colorForHours(h) {
  if (h <= 24)  return "#16a34a"; // zelená
  if (h <= 72)  return "#f59e0b"; // oranžová
  return "#ef4444";               // červená
}

/* ── Custom Tooltip pre bar chart ── */
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-900 mb-1">{d.name}</p>
      <p>Priemerný čas: <span className="font-bold" style={{ color: colorForHours(d.avg) }}>{fmtHours(d.avg)}</span></p>
      <p className="text-gray-500">Počet dealov: {d.count}</p>
      <p className="text-green-600">Najrýchlejší: {fmtHours(d.min)}</p>
      <p className="text-red-500">Najpomalší: {fmtHours(d.max)}</p>
    </div>
  );
}

/* ── Histogram dát: rozdelenie reakčných časov ── */
function buildHistogram(times) {
  const buckets = [
    { label: "0–12h",   min: 0,   max: 12  },
    { label: "12–24h",  min: 12,  max: 24  },
    { label: "1–2d",    min: 24,  max: 48  },
    { label: "2–4d",    min: 48,  max: 96  },
    { label: "4–7d",    min: 96,  max: 168 },
    { label: "7d+",     min: 168, max: Infinity },
  ];
  return buckets.map(b => ({
    label: b.label,
    count: times.filter(h => h >= b.min && h < b.max).length,
  }));
}

/* ── Hlavný komponent ── */
export default function ReakcnyClient() {
  const [expanded,  setExpanded]  = useState(null);

  const { data, isLoading, isValidating, mutate } = useSWR("/api/reakčný-čas");
  const changes = Array.isArray(data) ? data : [];
  const loading = isLoading && !data;

  const refresh = async () => {
    await fetch("/api/reakčný-čas?force=1", { cache: "no-store" });
    mutate();
  };

  /* ── Skeleton ── */
  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-gray-200 rounded-xl w-1/3" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_,i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="h-64 bg-gray-200 rounded-xl" />
      <div className="h-48 bg-gray-200 rounded-xl" />
    </div>
  );

  /* ── Výpočet reakčných časov ── */
  const dealMap = {};
  changes.forEach(c => {
    if (!dealMap[c.deal_id]) dealMap[c.deal_id] = [];
    dealMap[c.deal_id].push(c);
  });

  const reactionTimes = [];
  Object.values(dealMap).forEach(events => {
    // Zoradíme ASC aby sme zachytili prvý výskyt
    const sorted = [...events].sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));
    // Hľadáme prvý záznam kde deal opustil stage 7 (to_stage=7 nemáme, lebo webhook bol nastavený keď boli dealy už v stage 7)
    const entry = sorted.find(e => e.from_stage === 7);
    const done  = sorted.find(e => e.to_stage === 9);
    if (entry && done) {
      const diff  = new Date(done.changed_at) - new Date(entry.changed_at);
      const hours = Math.round(diff / 3600000);
      if (hours >= 0) {
        reactionTimes.push({
          deal_id:    entry.deal_id,
          deal_title: entry.deal_title,
          owner_name: entry.owner_name,
          hours,
          entryTime:  entry.changed_at,
          doneTime:   done.changed_at,
        });
      }
    }
  });

  /* ── Štatistiky podľa makléra ── */
  const brokerMap = {};
  reactionTimes.forEach(r => {
    if (!brokerMap[r.owner_name]) brokerMap[r.owner_name] = [];
    brokerMap[r.owner_name].push(r);
  });

  const brokerStats = Object.entries(brokerMap).map(([name, items]) => {
    const hours = items.map(i => i.hours);
    return {
      name,
      count: hours.length,
      avg:   Math.round(hours.reduce((a,b) => a+b, 0) / hours.length),
      min:   Math.min(...hours),
      max:   Math.max(...hours),
      deals: items,
    };
  }).sort((a, b) => a.avg - b.avg);

  const allHours    = reactionTimes.map(r => r.hours);
  const globalAvg   = allHours.length ? Math.round(allHours.reduce((a,b) => a+b, 0) / allHours.length) : 0;
  const globalMin   = allHours.length ? Math.min(...allHours) : 0;
  const globalMax   = allHours.length ? Math.max(...allHours) : 0;
  const histogram   = buildHistogram(allHours);

  /* ── Prázdny stav ── */
  if (changes.length === 0) return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">⚡ Reakčný čas</h1>
      <div className={cardCls + " p-8 text-center text-gray-500"}>
        <p className="text-4xl mb-3">📭</p>
        <p className="font-semibold text-lg text-gray-700 mb-1">Zatiaľ žiadne dáta</p>
        <p className="text-sm mb-4">Dáta sa zbierajú automaticky cez Pipedrive webhook. Prvé štatistiky uvidíš keď makléri začnú presúvať dealy.</p>
        <button
          onClick={refresh}
          disabled={isValidating}
          className="text-xs px-4 py-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-60"
        >
          {isValidating ? "⏳ Obnovujem…" : "🔄 Skúsiť znova"}
        </button>
      </div>
    </div>
  );

  if (brokerStats.length === 0) return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">⚡ Reakčný čas</h1>
      <div className={cardCls + " p-8 text-center text-gray-500"}>
        <p className="text-4xl mb-3">⏳</p>
        <p className="font-semibold text-lg text-gray-700 mb-1">Zbierame dáta…</p>
        <p className="text-sm">Máme {changes.length} zmien stage. Reakčný čas sa vypočíta keď maklér presunie deal z <strong>Dohodnúť stretnutie</strong> → <strong>Dohodnuté stretnutie</strong>.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Nadpis ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⚡ Reakčný čas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Čas od "Dohodnúť stretnutie" po "Dohodnuté stretnutie"</p>
        </div>
        <button
          onClick={refresh}
          disabled={isValidating}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center gap-1 disabled:opacity-60"
        >
          {isValidating ? "⏳ Obnovujem…" : "🔄 Obnoviť"}
        </button>
      </div>

      {/* ── Súhrnné karty ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Priemerný čas",    value: fmtHours(globalAvg), color: colorForHours(globalAvg), icon: "⏱" },
          { label: "Najrýchlejší",     value: fmtHours(globalMin), color: "#16a34a",                icon: "🚀" },
          { label: "Najpomalší",       value: fmtHours(globalMax), color: "#ef4444",                icon: "🐢" },
          { label: "Analyzovaných",    value: reactionTimes.length + " dealov", color: "#1e3a5f",   icon: "📊" },
        ].map(s => (
          <div key={s.label} className={cardCls + " p-4"}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{s.icon} {s.label}</p>
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Bar chart: priemerný čas podľa makléra ── */}
      <div className={cardCls + " p-5"}>
        <h2 className="font-bold text-gray-900 mb-4">Priemerný reakčný čas podľa makléra</h2>
        <ResponsiveContainer width="100%" height={Math.max(220, brokerStats.length * 44)}>
          <BarChart
            data={brokerStats}
            layout="vertical"
            margin={{ top: 0, right: 60, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
            <XAxis
              type="number"
              tickFormatter={fmtHours}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fontSize: 12, fill: "#374151" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              x={globalAvg}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: `ø ${fmtHours(globalAvg)}`, position: "top", fontSize: 11, fill: "#94a3b8" }}
            />
            <Bar dataKey="avg" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {brokerStats.map((b, i) => (
                <Cell key={i} fill={colorForHours(b.avg)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-3 text-xs text-gray-500 justify-center">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-green-600" /> do 24h</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-amber-400" /> 1–3 dni</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-red-500" /> 3+ dní</span>
        </div>
      </div>

      {/* ── Distribúcia reakčných časov ── */}
      <div className={cardCls + " p-5"}>
        <h2 className="font-bold text-gray-900 mb-4">Distribúcia reakčných časov</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={histogram} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v) => [v + " dealov", "Počet"]}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
            />
            <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={60} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Tabuľka maklérov (rozbaľovacia) ── */}
      <div className={cardCls + " overflow-hidden"}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Detail podľa makléra</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {brokerStats.map((b, i) => (
            <div key={b.name}>
              <button
                onClick={() => setExpanded(expanded === b.name ? null : b.name)}
                className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                {/* Rank */}
                <span className="text-sm font-bold text-gray-400 w-6 flex-shrink-0">#{i+1}</span>
                {/* Meno */}
                <span className="flex-1 font-medium text-gray-900">{b.name}</span>
                {/* Štatistiky */}
                <div className="hidden sm:flex gap-6 text-sm">
                  <span className="text-gray-400">{b.count} dealov</span>
                  <span className="text-green-600">{fmtHours(b.min)} min</span>
                  <span className="text-red-500">{fmtHours(b.max)} max</span>
                </div>
                {/* Avg badge */}
                <span className="px-2.5 py-1 rounded-full text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: colorForHours(b.avg) }}>
                  ø {fmtHours(b.avg)}
                </span>
                <span className="text-gray-400 flex-shrink-0">{expanded === b.name ? "▲" : "▼"}</span>
              </button>

              {/* Detail dealov */}
              {expanded === b.name && (
                <div className="border-t border-gray-100 bg-gray-50">
                  {/* Mobile: karty */}
                  <div className="md:hidden divide-y divide-gray-200">
                    {b.deals.sort((a,z) => a.hours - z.hours).map(d => (
                      <div key={d.deal_id} className="px-5 py-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{d.deal_title}</p>
                          <p className="text-xs text-gray-400">{new Date(d.entryTime).toLocaleDateString("sk-SK")}</p>
                        </div>
                        <span className="text-sm font-bold px-2 py-1 rounded-full text-white flex-shrink-0 ml-2"
                          style={{ backgroundColor: colorForHours(d.hours) }}>
                          {fmtHours(d.hours)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Desktop: tabuľka */}
                  <table className="hidden md:table w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase text-gray-400 border-b border-gray-200">
                        <th className="px-5 py-2 text-left font-semibold">Deal</th>
                        <th className="px-5 py-2 text-left font-semibold">Zaradený</th>
                        <th className="px-5 py-2 text-left font-semibold">Dohodnutý</th>
                        <th className="px-5 py-2 text-right font-semibold">Reakčný čas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {b.deals.sort((a,z) => a.hours - z.hours).map(d => (
                        <tr key={d.deal_id} className="hover:bg-white">
                          <td className="px-5 py-2.5 font-medium text-gray-800">{d.deal_title}</td>
                          <td className="px-5 py-2.5 text-gray-500">{new Date(d.entryTime).toLocaleString("sk-SK", { dateStyle:"short", timeStyle:"short" })}</td>
                          <td className="px-5 py-2.5 text-gray-500">{new Date(d.doneTime).toLocaleString("sk-SK", { dateStyle:"short", timeStyle:"short" })}</td>
                          <td className="px-5 py-2.5 text-right">
                            <span className="px-2.5 py-1 rounded-full text-white text-xs font-bold"
                              style={{ backgroundColor: colorForHours(d.hours) }}>
                              {fmtHours(d.hours)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Posledné zmeny stage (raw log) ── */}
      <details className={cardCls + " overflow-hidden"}>
        <summary className="px-5 py-4 cursor-pointer font-semibold text-gray-700 hover:bg-gray-50 select-none">
          📋 Surový log zmien stage ({changes.length})
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-400 uppercase">
                <th className="px-4 py-2 text-left">Deal</th>
                <th className="px-4 py-2 text-left">Maklér</th>
                <th className="px-4 py-2 text-left">Z</th>
                <th className="px-4 py-2 text-left">Na</th>
                <th className="px-4 py-2 text-left">Čas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {changes.slice(0, 30).map((c, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{c.deal_title}</td>
                  <td className="px-4 py-2 text-gray-600">{c.owner_name}</td>
                  <td className="px-4 py-2 text-gray-400">{STAGES[c.from_stage] || c.from_stage}</td>
                  <td className="px-4 py-2 text-gray-400">{STAGES[c.to_stage]   || c.to_stage}</td>
                  <td className="px-4 py-2 text-gray-400">{new Date(c.changed_at).toLocaleString("sk-SK")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
