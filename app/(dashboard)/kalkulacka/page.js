"use client";
import { useState, useEffect } from "react";

const fmt = v => v ? v.toLocaleString("sk-SK") + " €" : "—";
const fmtKm = v => v ? v.toLocaleString("sk-SK") + " km" : "—";

export default function KalkulackaPage() {
  const dark = false; // TODO: zapojiť do globálneho dark mode keď bude context

  const [enums,   setEnums]   = useState({ znacky: [], paliva: [] });
  const [url,     setUrl]     = useState("");
  const [form,    setForm]    = useState({ znackaId: "", model: "", km: "", palivoId: "", vykon: "" });
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState("");

  useEffect(() => {
    fetch("/api/kalkulacka").then(r => r.json()).then(d => setEnums(d));
  }, []);

  async function handleUrl(val) {
    setUrl(val);
    if (!val.includes("autobazar") && !val.includes("bazos")) return;
    // Pokus o auto-parse URL → prefill formulára
    try {
      const res  = await fetch("/api/kalkulacka", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: val }),
      });
      const data = await res.json();
      if (data.parsed) {
        setForm(f => ({
          ...f,
          znackaId: data.parsed.znackaId ?? f.znackaId,
          model:    data.parsed.model    || f.model,
        }));
      }
      if (data.scraped) {
        setForm(f => ({
          ...f,
          km:   data.scraped.km   ? String(data.scraped.km)   : f.km,
          rok:  data.scraped.rok  ? String(data.scraped.rok)  : f.rok,
        }));
      }
    } catch {}
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/kalkulacka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url:       url || undefined,
          znackaId:  form.znackaId ? parseInt(form.znackaId) : undefined,
          model:     form.model    || undefined,
          km:        form.km       ? parseInt(form.km)       : undefined,
          palivoId:  form.palivoId ? parseInt(form.palivoId) : undefined,
          vykon:     form.vykon    ? parseInt(form.vykon)    : undefined,
        }),
      });
      const data = await res.json();
      if (data.error && !data.stats) setError(data.error);
      else setResult(data);
    } catch {
      setError("Chyba servera");
    }
    setLoading(false);
  }

  const card = dark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200";
  const inp  = dark
    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-orange-400"
    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-400";
  const label = dark ? "text-gray-300" : "text-gray-700";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>🧮 Kalkulačka ocenenia</h1>
        <p className={`text-sm mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          Odhadni predajnú cenu auta na základe histórie predajov Autorro
        </p>
      </div>

      {/* Formulár */}
      <div className={`rounded-xl p-6 shadow-sm ${card}`}>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* URL vstup */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${label}`}>
              URL inzerátu (autobazar.eu alebo bazoš.sk)
            </label>
            <input
              type="url"
              value={url}
              onChange={e => handleUrl(e.target.value)}
              placeholder="https://www.autobazar.eu/detail/...  alebo  https://auto.bazos.sk/..."
              className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${inp}`}
            />
            <p className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
              Nepovinné — po vložení sa pokúsime vyplniť polia automaticky
            </p>
          </div>

          <div className={`border-t ${dark ? "border-gray-700" : "border-gray-100"} pt-4`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Parametre auta
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

              {/* Značka */}
              <div className="col-span-1">
                <label className={`block text-sm font-medium mb-1 ${label}`}>Značka *</label>
                <select
                  value={form.znackaId}
                  onChange={e => setForm(f => ({ ...f, znackaId: e.target.value }))}
                  required
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${inp}`}
                >
                  <option value="">Vyber značku</option>
                  {enums.znacky.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              {/* Model */}
              <div className="col-span-1">
                <label className={`block text-sm font-medium mb-1 ${label}`}>Model *</label>
                <input
                  type="text"
                  value={form.model}
                  onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                  placeholder="napr. Octavia, 3 Series"
                  required
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${inp}`}
                />
              </div>

              {/* KM */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Kilometre</label>
                <input
                  type="number"
                  value={form.km}
                  onChange={e => setForm(f => ({ ...f, km: e.target.value }))}
                  placeholder="napr. 85000"
                  min="0"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${inp}`}
                />
              </div>

              {/* Palivo */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Palivo</label>
                <select
                  value={form.palivoId}
                  onChange={e => setForm(f => ({ ...f, palivoId: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${inp}`}
                >
                  <option value="">Ľubovoľné</option>
                  {enums.paliva.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Výkon */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Výkon (kW)</label>
                <input
                  type="number"
                  value={form.vykon}
                  onChange={e => setForm(f => ({ ...f, vykon: e.target.value }))}
                  placeholder="napr. 110"
                  min="0"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${inp}`}
                />
              </div>

            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            {loading ? "Počítam…" : "🔍 Naceniť auto"}
          </button>
        </form>
      </div>

      {/* Výsledky */}
      {result && result.stats && (
        <div className="space-y-4">

          {/* Hlavná cena */}
          <div className={`rounded-xl p-6 shadow-sm ${card}`}>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className={`text-sm font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  {result.input.brandName} {result.input.model}
                  {result.input.km ? ` · ${fmtKm(result.input.km)}` : ""}
                  {result.input.palivo ? ` · ${result.input.palivo}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-6">
                  <div>
                    <p className={`text-xs uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}>Odp. predajná cena</p>
                    <p className="text-3xl font-bold text-orange-500">
                      {result.stats.predaj ? fmt(result.stats.predaj.median) : "—"}
                    </p>
                    {result.stats.predaj && (
                      <p className={`text-xs mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                        Rozsah: {fmt(result.stats.predaj.min)} – {fmt(result.stats.predaj.max)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className={`text-xs uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}>Odp. výkupná cena</p>
                    <p className={`text-2xl font-bold ${dark ? "text-blue-400" : "text-blue-600"}`}>
                      {result.stats.vykup ? fmt(result.stats.vykup.median) : "—"}
                    </p>
                    {result.stats.vykup && (
                      <p className={`text-xs mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                        Rozsah: {fmt(result.stats.vykup.min)} – {fmt(result.stats.vykup.max)}
                      </p>
                    )}
                  </div>
                  {result.stats.proviz && (
                    <div>
                      <p className={`text-xs uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}>Priem. provízia</p>
                      <p className={`text-2xl font-bold ${dark ? "text-green-400" : "text-green-600"}`}>
                        {fmt(result.stats.proviz.avg)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className={`text-right text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
                <p className="text-lg font-semibold">{result.totalMatched}</p>
                <p className="text-xs">porovnateľných predajov</p>
                <p className="text-xs mt-1">{result.totalFiltered} s touto značkou</p>
              </div>
            </div>
          </div>

          {/* Porovnateľné dealy */}
          {result.comparable?.length > 0 && (
            <div className={`rounded-xl shadow-sm overflow-hidden ${card}`}>
              <div className={`px-6 py-4 border-b ${dark ? "border-gray-700" : "border-gray-100"}`}>
                <h2 className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
                  Podobné predaje v histórii
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={dark ? "bg-gray-700/50 text-gray-400" : "bg-gray-50 text-gray-500"}>
                      <th className="px-4 py-3 text-left font-medium">Auto</th>
                      <th className="px-4 py-3 text-right font-medium">KM</th>
                      <th className="px-4 py-3 text-right font-medium">Predané za</th>
                      <th className="px-4 py-3 text-right font-medium">Výkup</th>
                      <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Maklér</th>
                      <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Dátum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.comparable.map((d, i) => (
                      <tr
                        key={d.id}
                        className={`border-t ${dark ? "border-gray-700 hover:bg-gray-700/30" : "border-gray-100 hover:bg-gray-50"} transition-colors`}
                      >
                        <td className="px-4 py-3">
                          <a
                            href={`https://autorro.pipedrive.com/deal/${d.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-500 hover:underline font-medium"
                          >
                            {d.title}
                          </a>
                          {d.palivo && (
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${dark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                              {d.palivo}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{fmtKm(d.km)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-orange-500">
                          {fmt(d.predanZa)}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums ${dark ? "text-blue-400" : "text-blue-600"}`}>
                          {fmt(d.vykupZa)}
                        </td>
                        <td className={`px-4 py-3 hidden md:table-cell ${dark ? "text-gray-400" : "text-gray-500"}`}>
                          {d.owner}
                        </td>
                        <td className={`px-4 py-3 hidden md:table-cell ${dark ? "text-gray-400" : "text-gray-500"}`}>
                          {d.wonDate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trhové ceny z autobazar.eu */}
          {result.market?.stats && (
            <div className={`rounded-xl p-6 shadow-sm ${card}`}>
              <h2 className={`font-semibold mb-4 ${dark ? "text-white" : "text-gray-900"}`}>
                📊 Aktuálny trh — Autobazar.eu
                <span className={`ml-2 text-xs font-normal ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  ({result.market.stats.n} inzerátov)
                </span>
              </h2>
              <div className="flex flex-wrap gap-6 mb-4">
                <div>
                  <p className={`text-xs uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}>Medián inzerátov</p>
                  <p className={`text-2xl font-bold ${dark ? "text-yellow-400" : "text-yellow-600"}`}>{fmt(result.market.stats.median)}</p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}>Rozsah</p>
                  <p className={`text-lg font-semibold ${dark ? "text-gray-200" : "text-gray-700"}`}>
                    {fmt(result.market.stats.min)} – {fmt(result.market.stats.max)}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className={dark ? "text-gray-400" : "text-gray-500"}>
                      <th className="text-left py-1 pr-3">Auto</th>
                      <th className="text-right py-1 pr-3">Rok</th>
                      <th className="text-right py-1 pr-3">KM</th>
                      <th className="text-right py-1 pr-3">Palivo</th>
                      <th className="text-right py-1">Cena</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.market.listings.slice(0,10).map((l, i) => (
                      <tr key={i} className={`border-t ${dark ? "border-gray-700" : "border-gray-100"}`}>
                        <td className={`py-1.5 pr-3 ${dark ? "text-gray-300" : "text-gray-700"}`}>{l.title}</td>
                        <td className={`text-right py-1.5 pr-3 ${dark ? "text-gray-400" : "text-gray-500"}`}>{l.rok || "—"}</td>
                        <td className={`text-right py-1.5 pr-3 tabular-nums ${dark ? "text-gray-400" : "text-gray-500"}`}>{fmtKm(l.km)}</td>
                        <td className={`text-right py-1.5 pr-3 ${dark ? "text-gray-400" : "text-gray-500"}`}>{l.palivo || "—"}</td>
                        <td className="text-right py-1.5 font-medium text-yellow-600">{fmt(l.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.comparable?.length === 0 && (
            <div className={`rounded-xl p-6 text-center ${card}`}>
              <p className={dark ? "text-gray-400" : "text-gray-500"}>
                Nenašli sa žiadne porovnateľné predaje. Skús zmeniť značku alebo model.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
