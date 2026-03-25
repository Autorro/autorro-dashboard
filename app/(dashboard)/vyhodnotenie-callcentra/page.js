"use client";
import { useState, useEffect, useCallback } from "react";

const PERIODS = [
  { label: "Dnes",         days: 0 },
  { label: "Posledných 7 dní", days: 7 },
  { label: "Tento mesiac", days: 30 },
  { label: "Posledných 90 dní", days: 90 },
];

function getDateRange(days) {
  const now  = new Date();
  const from = new Date();
  if (days === 0) {
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(now.getDate() - days);
  }
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo:   now.toISOString().slice(0, 10),
  };
}

function fmtDur(secs) {
  if (!secs) return "0 s";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s} s`;
}

function StatCard({ icon, label, value, sub, color = "#FF501C" }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex items-start gap-4">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function UserRow({ user }) {
  const [open, setOpen] = useState(false);
  const pct = user.calls
    ? Math.round((user.answered / user.calls) * 100)
    : null;

  return (
    <div className="border-b last:border-0 border-gray-100">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="w-9 h-9 rounded-full bg-[#481132] text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
          {user.login[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{user.login}</p>
          <p className="text-xs text-gray-400">
            {user.status || "—"}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="font-bold text-gray-900">{user.calls}</p>
            <p className="text-xs text-gray-400">hovorov</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900">{user.uniqueNumbers}</p>
            <p className="text-xs text-gray-400">čísel</p>
          </div>
          {pct !== null && (
            <div className="w-20 hidden sm:block">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>zdv.</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: pct + "%",
                    backgroundColor: pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
            </div>
          )}
          <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50">
          {[
            ["📞", "Všetky hovory", user.calls],
            ["✅", "Zdvihnuté", user.answered],
            ["❌", "Zmešk.", user.missed],
            ["☎️", "Jedinečné čísla", user.uniqueNumbers],
            ["⬆️", "Odchádzajúce", user.outgoing],
            ["⬇️", "Prichádzajúce", user.incoming],
            ["⏱️", "Celk. čas", fmtDur(user.totalDuration)],
            ["📊", "Úspešnosť", pct !== null ? pct + "%" : "—"],
          ].map(([icon, label, val]) => (
            <div key={label} className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-xs text-gray-400">{icon} {label}</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VyhodnotenieCCPage() {
  const [periodIdx, setPeriodIdx] = useState(0);
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [sortBy, setSortBy]   = useState("calls");

  const load = useCallback(async (idx) => {
    setLoading(true);
    setError(null);
    try {
      const { dateFrom, dateTo } = getDateRange(PERIODS[idx].days);
      const res = await fetch(
        `/api/optimcall?dateFrom=${dateFrom}&dateTo=${dateTo}`
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Chyba načítania");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(periodIdx); }, [periodIdx, load]);

  const sorted = data?.users
    ? [...data.users].sort((a, b) => b[sortBy] - a[sortBy])
    : [];

  const usersWithCalls = sorted.filter((u) => u.calls > 0);
  const allUsers       = sorted;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">📞 Vyhodnotenie callcentra</h1>
        <p className="text-sm text-gray-400 mt-0.5">Štatistiky a výkon call centra</p>
      </div>

      {/* Period filter */}
      <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">Obdobie</span>
          {PERIODS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPeriodIdx(i)}
              className={
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors " +
                (periodIdx === i
                  ? "bg-[#FF501C] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">⏳</p>
          <p className="font-semibold">Načítavam dáta…</p>
        </div>
      )}
      {error && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-red-500">
          <p className="text-3xl mb-2">⚠️</p>
          <p className="font-semibold">Chyba: {error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="📞" label="Celkové hovory"    value={data.summary.totalCalls}    color="#FF501C" />
            <StatCard icon="✅" label="Zdvihnuté"         value={data.summary.answered}       color="#22c55e" />
            <StatCard icon="❌" label="Zmeškané"          value={data.summary.missed}         color="#ef4444" />
            <StatCard icon="⏱️" label="Celkový čas"      value={fmtDur(data.summary.totalDuration)} color="#8b5cf6" />
          </div>

          {/* No call records notice */}
          {!data.hasCallRecords && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4 items-start">
              <span className="text-2xl">ℹ️</span>
              <div>
                <p className="font-semibold text-amber-800">Žiadne záznamy hovorov</p>
                <p className="text-sm text-amber-700 mt-1">
                  Systém OptimCall je pripojený, ale pre vybraté obdobie neexistujú žiadne záznamy hovorov.
                  Zoznam používateľov a liniek je zobrazený nižšie.
                </p>
              </div>
            </div>
          )}

          {/* Phone lines */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-extrabold text-gray-900">📟 Telefónne linky</h2>
              <span className="text-sm text-gray-400">{data.phoneLines.length} liniek</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase bg-gray-50">
                    <th className="text-left px-5 py-3">Číslo</th>
                    <th className="text-left px-5 py-3">Správanie</th>
                    <th className="text-left px-5 py-3">Presmerovanie</th>
                    <th className="text-right px-5 py-3">Hovory</th>
                  </tr>
                </thead>
                <tbody>
                  {data.phoneLines.map((l) => (
                    <tr key={l.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3 font-semibold text-gray-900">{l.number}</td>
                      <td className="px-5 py-3">
                        <span className={
                          "px-2 py-0.5 rounded-full text-xs font-medium " +
                          (l.behavior === "redirect"
                            ? "bg-blue-100 text-blue-700"
                            : l.behavior === "scenario"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-600")
                        }>
                          {l.behavior}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{l.redirectTo || "—"}</td>
                      <td className="px-5 py-3 text-right font-bold text-gray-900">{l.calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Agents */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-gray-900">👥 Agenti</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {usersWithCalls.length} z {allUsers.length} mali hovory
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">Zoradiť:</span>
                {[
                  { key: "calls",   label: "Hovory" },
                  { key: "uniqueNumbers", label: "Čísla" },
                  { key: "answered",label: "Zdvihnuté" },
                  { key: "missed",  label: "Zmeškané" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={
                      "px-2.5 py-1 rounded-lg font-medium transition-colors " +
                      (sortBy === key
                        ? "bg-[#481132] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              {allUsers.map((u) => (
                <UserRow key={u.id} user={u} />
              ))}
              {allUsers.length === 0 && (
                <div className="py-10 text-center text-gray-400 text-sm">
                  Žiadni agenti
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
