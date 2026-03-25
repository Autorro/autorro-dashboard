"use client";
import { useState, useEffect, useCallback } from "react";

const PERIODS = [
  { label: "Dnes",              days: 0  },
  { label: "Posledných 7 dní",  days: 7  },
  { label: "Tento mesiac",      days: 30 },
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

function pctColor(pct) {
  if (pct >= 70) return "#22c55e";
  if (pct >= 40) return "#f59e0b";
  return "#ef4444";
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

// Initials avatar
function Avatar({ name }) {
  const parts = (name || "?").split(" ");
  const initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : (name || "?")[0];
  return (
    <div className="w-9 h-9 rounded-full bg-[#481132] text-white font-bold text-sm flex items-center justify-center flex-shrink-0 uppercase">
      {initials}
    </div>
  );
}

// Agent row with expandable day-by-day table
function AgentRow({ agent, rank }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b last:border-0 border-gray-100">
      {/* Summary row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        {/* Rank badge */}
        <div className="w-6 text-center text-xs font-bold text-gray-400 flex-shrink-0">
          {rank}
        </div>
        <Avatar name={agent.fullName} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{agent.fullName}</p>
          <p className="text-xs text-gray-400">
            {agent.nick}
            {agent.src ? ` · ext. ${agent.src}` : ""}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 flex-shrink-0 text-right">
          <div>
            <p className="font-bold text-gray-900">{agent.totalObvolane}</p>
            <p className="text-xs text-gray-400">obvolané</p>
          </div>
          <div>
            <p className="font-bold text-gray-900">{agent.totalNavolane}</p>
            <p className="text-xs text-gray-400">navolané</p>
          </div>
          {/* Efektivita bar */}
          <div className="w-20 hidden sm:block">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>efek.</span>
              <span style={{ color: pctColor(agent.efektivita) }}>{agent.efektivita}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: Math.min(agent.efektivita, 100) + "%",
                  backgroundColor: pctColor(agent.efektivita),
                }}
              />
            </div>
          </div>
          <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Expandable: day-by-day breakdown */}
      {open && (
        <div className="bg-gray-50 px-4 pb-4 pt-2">
          {agent.days.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">Žiadne záznamy</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 uppercase">
                    <th className="text-left py-2 pr-4">Dátum</th>
                    <th className="text-right py-2 px-2">Obvolané</th>
                    <th className="text-right py-2 px-2">Navolané</th>
                    <th className="text-right py-2 px-2">Efektivita</th>
                    <th className="text-right py-2 pl-2">Čas</th>
                  </tr>
                </thead>
                <tbody>
                  {agent.days.map((d) => (
                    <tr key={d.date} className="border-t border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-700">
                        {new Date(d.date + "T12:00:00Z").toLocaleDateString("sk-SK", {
                          day: "numeric", month: "short", weekday: "short",
                        })}
                      </td>
                      <td className="py-2 px-2 text-right font-semibold text-gray-900">{d.obvolane}</td>
                      <td className="py-2 px-2 text-right font-semibold text-gray-900">{d.navolane}</td>
                      <td className="py-2 px-2 text-right">
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-bold"
                          style={{
                            backgroundColor: pctColor(d.efektivita) + "20",
                            color: pctColor(d.efektivita),
                          }}
                        >
                          {d.efektivita}%
                        </span>
                      </td>
                      <td className="py-2 pl-2 text-right text-gray-500">{fmtDur(d.totalSecs)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-bold text-gray-900">
                    <td className="py-2 pr-4">Spolu</td>
                    <td className="py-2 px-2 text-right">{agent.totalObvolane}</td>
                    <td className="py-2 px-2 text-right">{agent.totalNavolane}</td>
                    <td className="py-2 px-2 text-right">
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-bold"
                        style={{
                          backgroundColor: pctColor(agent.efektivita) + "20",
                          color: pctColor(agent.efektivita),
                        }}
                      >
                        {agent.efektivita}%
                      </span>
                    </td>
                    <td className="py-2 pl-2 text-right text-gray-500">{fmtDur(agent.totalSecs)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Summary leaderboard table (all agents in one view)
function LeaderboardTable({ agents }) {
  if (!agents || agents.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-extrabold text-gray-900">📊 Prehľad výkonu</h2>
        <p className="text-xs text-gray-400 mt-0.5">Obvolané = prepojené hovory (OptimCall) · Navolané = dealy „Dohodnúť stretnutie" (Pipedrive)</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 uppercase bg-gray-50">
            <th className="text-left px-5 py-3">#</th>
            <th className="text-left px-5 py-3">Agent</th>
            <th className="text-right px-4 py-3">Obvolané</th>
            <th className="text-right px-4 py-3">Navolané</th>
            <th className="text-right px-4 py-3">Efektivita</th>
            <th className="text-right px-4 py-3">Čas</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((a, i) => (
            <tr key={a.src} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-5 py-3 text-gray-400 font-semibold">{i + 1}</td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <Avatar name={a.fullName} />
                  <div>
                    <p className="font-semibold text-gray-900">{a.fullName}</p>
                    <p className="text-xs text-gray-400">
                      {a.nick}
                      {a.src ? ` · ext. ${a.src}` : ""}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-bold text-gray-900">{a.totalObvolane}</td>
              <td className="px-4 py-3 text-right font-bold text-gray-900">{a.totalNavolane}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: Math.min(a.efektivita, 100) + "%",
                        backgroundColor: pctColor(a.efektivita),
                      }}
                    />
                  </div>
                  <span
                    className="font-bold text-xs px-1.5 py-0.5 rounded"
                    style={{
                      color: pctColor(a.efektivita),
                      backgroundColor: pctColor(a.efektivita) + "20",
                    }}
                  >
                    {a.efektivita}%
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-right text-gray-500">{fmtDur(a.totalSecs)}</td>
            </tr>
          ))}
        </tbody>
        {/* Totals */}
        {agents.length > 1 && (() => {
          const totObv = agents.reduce((s, a) => s + a.totalObvolane, 0);
          const totNav = agents.reduce((s, a) => s + a.totalNavolane, 0);
          const totEfk = totObv > 0 ? Math.round((totNav / totObv) * 100) : 0;
          const totSec = agents.reduce((s, a) => s + a.totalSecs, 0);
          return (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-gray-900">
                <td className="px-5 py-3" colSpan={2}>Celkovo</td>
                <td className="px-4 py-3 text-right">{totObv}</td>
                <td className="px-4 py-3 text-right">{totNav}</td>
                <td className="px-4 py-3 text-right">
                  <span
                    className="font-bold text-xs px-1.5 py-0.5 rounded"
                    style={{ color: pctColor(totEfk), backgroundColor: pctColor(totEfk) + "20" }}
                  >
                    {totEfk}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-500">{fmtDur(totSec)}</td>
              </tr>
            </tfoot>
          );
        })()}
      </table>
    </div>
  );
}

export default function VyhodnotenieCCPage() {
  const [periodIdx, setPeriodIdx] = useState(0);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async (idx) => {
    setLoading(true);
    setError(null);
    try {
      const { dateFrom, dateTo } = getDateRange(PERIODS[idx].days);
      const res  = await fetch(`/api/optimcall?dateFrom=${dateFrom}&dateTo=${dateTo}`);
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

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">⏳</p>
          <p className="font-semibold">Načítavam dáta z OptimCall…</p>
          <p className="text-xs mt-1">Môže to chvíľu trvať</p>
        </div>
      )}

      {/* Error */}
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
            <StatCard icon="📞" label="Obvolané (prepojené)" value={data.summary.obvolane}          color="#FF501C"
              sub="Hovory so sekúndami spojenia"
            />
            <StatCard icon="🎯" label="Navolané (stretnutia)" value={data.summary.navolane}        color="#22c55e"
              sub={`${data.leadCount ?? ""} × Dohodnúť stretnutie (Pipedrive)`}
            />
            <StatCard icon="📊" label="Efektivita"          value={data.summary.efektivita + "%"}  color="#8b5cf6" />
            <StatCard icon="⏱️" label="Celkový čas"         value={fmtDur(data.summary.totalSecs)} color="#3b82f6"
              sub={`${data.recordCount} hovorov (OptimCall)`}
            />
          </div>

          {/* No data */}
          {data.agents.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4 items-start">
              <span className="text-2xl">ℹ️</span>
              <div>
                <p className="font-semibold text-amber-800">Žiadne záznamy hovorov</p>
                <p className="text-sm text-amber-700 mt-1">
                  Pre vybraté obdobie ({data.dateFrom} – {data.dateTo}) neexistujú žiadne záznamy hovorov.
                </p>
              </div>
            </div>
          )}

          {/* Leaderboard table */}
          {data.agents.length > 0 && <LeaderboardTable agents={data.agents} />}

          {/* Per-agent detail cards */}
          {data.agents.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-extrabold text-gray-900">👥 Detail podľa agenta</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Kliknite na agenta pre denný rozpad
                </p>
              </div>
              <div>
                {data.agents.map((a, i) => (
                  <AgentRow key={a.src} agent={a} rank={i + 1} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
