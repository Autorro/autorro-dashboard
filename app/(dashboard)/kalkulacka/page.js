"use client";
import { useState, useEffect, useRef } from "react";

const fmt   = v => (v != null && v > 0) ? v.toLocaleString("sk-SK") + " €" : "—";
const fmtKm = v => (v != null && v > 0) ? v.toLocaleString("sk-SK") + " km" : "—";

export default function KalkulackaPage() {
  const dark = false;

  const [enums,       setEnums]       = useState({ znacky: [], paliva: [], prevodovky: [] });
  const [url,         setUrl]         = useState("");
  const [form,        setForm]        = useState({ znackaId: "", model: "", km: "", rok: "", palivoId: "", prevId: "", vykon: "" });
  const [autofillInfo,setAutofillInfo]= useState(null);
  const [urlLoading,  setUrlLoading]  = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    fetch("/api/kalkulacka").then(r => r.json()).then(d => setEnums(d));
  }, []);

  function handleUrl(val) {
    setUrl(val);
    setAutofillInfo(null);
    clearTimeout(debounceRef.current);
    if (!val.includes("autobazar") && !val.includes("bazos")) return;
    debounceRef.current = setTimeout(() => tryAutofill(val), 700);
  }

  async function tryAutofill(val) {
    setUrlLoading(true);
    try {
      const res  = await fetch("/api/kalkulacka", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: val, autofillOnly: true }),
      });
      const data = await res.json();
      if (data.autofill) {
        const af     = data.autofill;
        const filled = [];
        setForm(f => {
          const n = { ...f };
          if (af.znackaId) { n.znackaId = String(af.znackaId); filled.push("Značka"); }
          if (af.model)    { n.model    = af.model;             filled.push("Model"); }
          if (af.km)       { n.km       = String(af.km);        filled.push("KM"); }
          if (af.rok)      { n.rok      = String(af.rok);       filled.push("Ročník"); }
          if (af.palivoId) { n.palivoId = String(af.palivoId);  filled.push("Palivo"); }
          if (af.prevId)   { n.prevId   = String(af.prevId);    filled.push("Prevodovka"); }
          if (af.vykon)    { n.vykon    = String(af.vykon);     filled.push("Výkon kW"); }
          return n;
        });
        const src = af.source === "autobazar" ? "autobazar.eu" : af.source === "bazos" ? "bazoš.sk" : "URL";
        setAutofillInfo({ source: src, fields: filled });
      }
    } catch {}
    setUrlLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/kalkulacka", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url:      url      || undefined,
          znackaId: form.znackaId ? parseInt(form.znackaId) : undefined,
          model:    form.model    || undefined,
          km:       form.km       ? parseInt(form.km)       : undefined,
          rok:      form.rok      ? parseInt(form.rok)      : undefined,
          palivoId: form.palivoId ? parseInt(form.palivoId) : undefined,
          prevId:   form.prevId   ? parseInt(form.prevId)   : undefined,
          vykon:    form.vykon    ? parseInt(form.vykon)    : undefined,
        }),
      });
      const data = await res.json();
      if (data.error && !data.recommended) setError(data.error);
      else setResult(data);
    } catch { setError("Chyba servera"); }
    setLoading(false);
  }

  const card = "bg-white border border-gray-200";
  const inp  = "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-400";
  const lbl  = "text-gray-700";

  // Pomocné funkcie pre client-side filtrovanie trhových inzerátov
  const fuelGroup = id => {
    if ([234, 240].includes(id))                return "diesel";
    if ([244, 233, 235, 236, 237].includes(id)) return "benzin";
    if ([238, 241].includes(id))                return "hybrid";
    if ([239].includes(id))                     return "elektro";
    return "other";
  };
  const AUTO_IDS = [229, 224, 225, 226, 227, 223];

  // Filtruje inzeráty — striktné: kW ±10, palivo, prevodovka; progresívne km
  function filterListings(listings, input) {
    if (!listings?.length || !input) return listings || [];

    const strictFilter = (l, kmTolerance) => {
      if (input.vykon && l.vykon && Math.abs(l.vykon - input.vykon) > 10) return false;
      if (input.palivoId && l.palivoId && fuelGroup(l.palivoId) !== fuelGroup(input.palivoId)) return false;
      if (input.prevId && l.prevId) {
        const wAuto = AUTO_IDS.includes(input.prevId);
        const rAuto = AUTO_IDS.includes(l.prevId);
        if (wAuto !== rAuto) return false;
      }
      if (input.km && l.km && kmTolerance != null && Math.abs(l.km - input.km) > kmTolerance) return false;
      return true;
    };

    // Progresívne uvoľňuj km toleranciu kým nenájdeme aspoň 2 výsledky
    for (const kmTol of [20000, 40000, 60000, null]) {
      const result = listings.filter(l => strictFilter(l, kmTol));
      if (result.length >= 2 || kmTol === null) return result;
    }
    return listings;
  }

  // Zisti čo zobrazíme ako hlavné odporúčané ceny
  const rec       = result?.recommended;
  const mktStats  = result?.market?.filteredStats || result?.market?.stats;
  const hist      = result?.history;
  const fromMarket = rec?.source === "market";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🧮 Kalkulačka ocenenia</h1>
        <p className="text-sm mt-1 text-gray-500">Odhadni predajnú a výkupnú cenu auta</p>
      </div>

      {/* Formulár */}
      <div className={`rounded-xl p-6 shadow-sm ${card}`}>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* URL */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${lbl}`}>
              URL inzerátu <span className="font-normal text-gray-400">(autobazar.eu alebo bazoš.sk)</span>
            </label>
            <div className="relative">
              <input
                type="url" value={url} onChange={e => handleUrl(e.target.value)}
                placeholder="https://www.autobazar.eu/detail/...  alebo  https://auto.bazos.sk/..."
                className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 pr-10 ${inp}`}
              />
              {urlLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">⏳</span>
              )}
            </div>
            {autofillInfo?.fields?.length > 0 ? (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                <span>✅</span>
                <span>Automaticky vyplnené z <strong>{autofillInfo.source}</strong>: {autofillInfo.fields.join(", ")}</span>
              </div>
            ) : !urlLoading ? (
              <p className="text-xs mt-1 text-gray-400">Nepovinné — po vložení sa pokúsime vyplniť polia automaticky</p>
            ) : null}
          </div>

          {/* Parametre */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-gray-500">Parametre auta</p>

            {/* Row 1: Značka + Model */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${lbl}`}>Značka *</label>
                <select value={form.znackaId} onChange={e => setForm(f => ({ ...f, znackaId: e.target.value }))}
                  required className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${inp}`}>
                  <option value="">Vyber značku</option>
                  {enums.znacky.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${lbl}`}>Model *</label>
                <input type="text" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                  placeholder="napr. Octavia, Golf, 3 Series" required
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${inp}`} />
              </div>
            </div>

            {/* Row 2: KM + Ročník + Výkon */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${lbl}`}>Kilometre</label>
                <input type="number" value={form.km} onChange={e => setForm(f => ({ ...f, km: e.target.value }))}
                  placeholder="napr. 85 000" min="0"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${inp}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${lbl}`}>Ročník</label>
                <input type="number" value={form.rok} onChange={e => setForm(f => ({ ...f, rok: e.target.value }))}
                  placeholder="napr. 2019" min="1990" max="2030"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${inp}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${lbl}`}>Výkon (kW)</label>
                <input type="number" value={form.vykon} onChange={e => setForm(f => ({ ...f, vykon: e.target.value }))}
                  placeholder="napr. 110" min="0"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${inp}`} />
              </div>
            </div>

            {/* Row 3: Palivo + Prevodovka */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${lbl}`}>Palivo</label>
                <select value={form.palivoId} onChange={e => setForm(f => ({ ...f, palivoId: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${inp}`}>
                  <option value="">Ľubovoľné</option>
                  {enums.paliva.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${lbl}`}>Typ prevodovky</label>
                <select value={form.prevId} onChange={e => setForm(f => ({ ...f, prevId: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${inp}`}>
                  <option value="">Ľubovoľná</option>
                  {enums.prevodovky.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm">
            {loading ? "Počítam…" : "🔍 Naceniť auto"}
          </button>
        </form>
      </div>

      {/* Výsledky */}
      {result && (rec || result.stats) && (
        <div className="space-y-4">

          {/* ── Hlavné odporúčané ceny ── */}
          <div className={`rounded-xl p-6 shadow-sm ${card}`}>

            {/* Popis auta */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <p className="text-sm font-medium text-gray-500">
                {result.input?.brandName} {result.input?.model}
                {result.input?.rok        ? ` · ${result.input.rok}` : ""}
                {result.input?.km         ? ` · ${fmtKm(result.input.km)}` : ""}
                {result.input?.palivo     ? ` · ${result.input.palivo}` : ""}
                {result.input?.prevodovka ? ` · ${result.input.prevodovka}` : ""}
              </p>
              {result.generation && (
                <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5 font-medium">
                  🔢 Gen. {result.generation.name} ({result.generation.fromYear}–{result.generation.toYear})
                </span>
              )}
            </div>

            {/* Cenové odporúčania */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

              {/* Odp. predajná */}
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <p className="text-xs uppercase tracking-wider text-orange-400 font-semibold mb-1">
                  Odp. predajná cena
                </p>
                <p className="text-3xl font-bold text-orange-600">{fmt(rec?.predaj)}</p>
                {fromMarket && mktStats && (
                  <p className="text-xs text-orange-400 mt-1">
                    trh: {fmt(mktStats.min)} – {fmt(mktStats.max)}
                  </p>
                )}
                <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                  fromMarket ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {fromMarket ? "📊 z trhu" : "📂 z histórie"}
                </span>
              </div>

              {/* Odp. výkupná */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-1">
                  Odp. výkupná cena
                </p>
                <p className="text-3xl font-bold text-blue-600">{fmt(rec?.vykup)}</p>
                {rec?.marginRatio && (
                  <p className="text-xs text-blue-400 mt-1">marža ~{100 - rec.marginRatio}%</p>
                )}
                <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                  fromMarket ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {fromMarket ? "📊 odvodená z trhu" : "📂 z histórie"}
                </span>
              </div>

              {/* Priem. provízia */}
              {hist?.proviz && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <p className="text-xs uppercase tracking-wider text-green-400 font-semibold mb-1">Priem. provízia</p>
                  <p className="text-3xl font-bold text-green-600">{fmt(hist.proviz.avg)}</p>
                  <p className="text-xs text-green-400 mt-1">z {hist.proviz.n} predajov</p>
                  <span className="mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-600">📂 z histórie</span>
                </div>
              )}
            </div>

            {/* Pipedrive história — detail */}
            {hist?.predaj && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-gray-400 text-xs">Autorro priemerný predaj (história)</span>
                  <div className="font-semibold text-gray-700">{fmt(hist.predaj.median)}
                    <span className="text-xs text-gray-400 ml-1">({hist.predaj.n} predajov)</span>
                  </div>
                </div>
                {hist.vykup && (
                  <div>
                    <span className="text-gray-400 text-xs">Autorro priemerný výkup (história)</span>
                    <div className="font-semibold text-gray-700">{fmt(hist.vykup.median)}
                      <span className="text-xs text-gray-400 ml-1">({hist.vykup.n} výkupov)</span>
                    </div>
                  </div>
                )}
                <div className="ml-auto text-right">
                  <span className="text-gray-400 text-xs">Porovnateľných predajov</span>
                  <div className="font-semibold text-gray-700">{result.totalMatched}
                    <span className="text-xs text-gray-400 ml-1">(z {result.totalFiltered} so značkou)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Trhové ceny autobazar.eu ── */}
          {result.market?.listings?.length > 0 && (() => {
            const allRows      = result.market.listings;
            const filteredRows = filterListings(allRows, result.input);
            const rows         = filteredRows.length > 0 ? filteredRows : allRows;
            const isFiltered   = filteredRows.length > 0 && filteredRows.length < allRows.length;
            // Zisti aká km tolerancia bola použitá
            const usedKmTol = (() => {
              if (!result.input?.km) return null;
              for (const t of [20000, 40000, 60000, null]) {
                const n = allRows.filter(l => {
                  if (result.input.vykon && l.vykon && Math.abs(l.vykon - result.input.vykon) > 10) return false;
                  if (result.input.palivoId && l.palivoId && fuelGroup(l.palivoId) !== fuelGroup(result.input.palivoId)) return false;
                  if (result.input.prevId && l.prevId) {
                    if (AUTO_IDS.includes(l.prevId) !== AUTO_IDS.includes(result.input.prevId)) return false;
                  }
                  if (t != null && l.km && Math.abs(l.km - result.input.km) > t) return false;
                  return true;
                }).length;
                if (n >= 2 || t === null) return t;
              }
              return null;
            })();

            // Vypočítaj medián filtrovaných cien priamo v UI
            const prices    = filteredRows.map(l => l.price).filter(Boolean).sort((a, b) => a - b);
            const n         = prices.length;
            const median    = n > 0 ? (n % 2 === 0 ? Math.round((prices[n/2-1]+prices[n/2])/2) : prices[Math.floor(n/2)]) : null;
            const priceMin  = n > 0 ? prices[0] : null;
            const priceMax  = n > 0 ? prices[n-1] : null;
            const displayStats = isFiltered && median ? { median, min: priceMin, max: priceMax } : result.market.filteredStats || result.market.stats;

            return (
              <div className={`rounded-xl shadow-sm overflow-hidden ${card}`}>
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">📊 Aktuálny trh — Autobazar.eu</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isFiltered
                        ? `${filteredRows.length} zodpovedajúcich z ${allRows.length} · rovnaká motorizácia + prevodovka + palivo${usedKmTol != null ? ` · km ±${(usedKmTol/1000).toFixed(0)}k` : ""}${result.generation ? ` · gen. ${result.generation.name}` : ""}`
                        : `${allRows.length} inzerátov celkom (bez zhodnej motorizácie v dostupných výsledkoch)`}
                    </p>
                  </div>
                  {displayStats?.median && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Medián {isFiltered ? "(filtrované)" : ""}</p>
                      <p className="text-lg font-bold text-yellow-600">{fmt(displayStats.median)}</p>
                      <p className="text-xs text-gray-400">{fmt(displayStats.min)} – {fmt(displayStats.max)}</p>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500">
                        <th className="px-4 py-2 text-left font-medium">Auto</th>
                        <th className="px-4 py-2 text-right font-medium">Rok</th>
                        <th className="px-4 py-2 text-right font-medium">KM</th>
                        <th className="px-4 py-2 text-right font-medium hidden sm:table-cell">kW</th>
                        <th className="px-4 py-2 text-right font-medium hidden sm:table-cell">Palivo</th>
                        <th className="px-4 py-2 text-right font-medium hidden md:table-cell">Prevodovka</th>
                        <th className="px-4 py-2 text-right font-medium">Cena</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 12).map((l, i) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-700 font-medium">{l.title}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{l.rok || "—"}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-500">{fmtKm(l.km)}</td>
                          <td className="px-4 py-2 text-right hidden sm:table-cell text-gray-500">{l.vykon ? `${l.vykon} kW` : "—"}</td>
                          <td className="px-4 py-2 text-right hidden sm:table-cell text-gray-600">{l.palivo || "—"}</td>
                          <td className="px-4 py-2 text-right hidden md:table-cell text-gray-500">{l.prevodovka || "—"}</td>
                          <td className="px-4 py-2 text-right font-semibold tabular-nums text-yellow-700">{fmt(l.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* ── Podobné predaje v histórii Autorro ── */}
          {result.comparable?.length > 0 && (
            <div className={`rounded-xl shadow-sm overflow-hidden ${card}`}>
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">📂 Podobné predaje v histórii Autorro</h2>
                <p className="text-xs text-gray-400 mt-0.5">Len deals vyhrané za posledných 12 mesiacov · km ±20 000 · rovnaká prevodovka</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      <th className="px-4 py-3 text-left font-medium">Auto</th>
                      <th className="px-4 py-3 text-right font-medium">1. evid.</th>
                      <th className="px-4 py-3 text-right font-medium">KM</th>
                      <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">Prevod.</th>
                      <th className="px-4 py-3 text-right font-medium">Predané za</th>
                      <th className="px-4 py-3 text-right font-medium">Výkup</th>
                      <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Maklér</th>
                      <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Vyhrané</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.comparable.map((d) => (
                      <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <a href={`https://autorro.pipedrive.com/deal/${d.id}`} target="_blank" rel="noopener noreferrer"
                            className="text-orange-500 hover:underline font-medium">{d.title}</a>
                          {d.palivo && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{d.palivo}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">{d.evidencia || "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600">{fmtKm(d.km)}</td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell text-gray-500">{d.prevodovka || "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-orange-500">{fmt(d.predanZa)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-blue-600">{fmt(d.vykupZa)}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-500">{d.owner}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-500">{d.wonDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.comparable?.length === 0 && (
            <div className={`rounded-xl p-4 ${card}`}>
              <p className="text-sm text-gray-400 text-center">📂 Žiadne zodpovedajúce predaje v histórii Autorro za posledných 18 mesiacov</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
