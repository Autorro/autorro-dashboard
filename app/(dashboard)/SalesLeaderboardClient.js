"use client";
import { useEffect, useState } from "react";

/* ── Kancelárie ── */
const OFFICES = {
  "Všetky": null,
  "BB": ["Dominika Kompaniková","Dominka Kompaníková","Milan Kováč","Andrej Čík","Tomáš Urbán","Tomás Urban","Dávid Juhaniak","David Juhaniak"],
  "TT": ["Bálint Forró","Bálint Forro","Tomáš Opálek","Karolína Lisická","Martin Blažek","Lukáš Krommel"],
  "NR": ["Martin Petráš","Dávid Kalužák","David Kalužák","Daniel Kádek","Gabriela Šodorová","Dávid Čintala"],
  "BA": ["Milan Švorc","Ján Mikuš","Richard Kiss","Karin Harvan","Matej Hromada","Milan Pulc","Martin Bošeľa","Peter Maťo","Jonathán Pavelka","Matej Klačko","Dominik Ďurčo"],
  "TN": ["Libor Koníček","Tomáš Otrubný","Peter Mjartan","Martin Mečiar","Ján Skovajsa","Tomáš Kučerka","Patrik Frič"],
  "ZA": ["Tomáš Smieško","Daniel Jašek","Vladko Hess","Wlodzimierz Hess","Irena Varadová","Matej Gažo","Veronika Maťková","Tomáš Ďurana"],
  "PP": ["Sebastián Čuban","Tomáš Matta"],
  "KE": ["Ján Tej","Adrián Šomšág","Viliam Baran","Jaroslav Hažlinský","Martin Živčák","Ján Slivka"],
};
const EXCLUDE = ["Development","Tomáš Martiš","Miroslav Hrehor","Peter Hudec","Jaroslav Kováč"];

/* ── Kariérne pozície ── */
const TIERS = [
  { id:"M1", min:0,       max:30_000,  color:"#6b7280", light:"#f3f4f6", hotovostna:40, uverova:20 },
  { id:"M2", min:30_000,  max:100_000, color:"#2563eb", light:"#dbeafe", hotovostna:45, uverova:20 },
  { id:"M3", min:100_000, max:200_000, color:"#16a34a", light:"#dcfce7", hotovostna:50, uverova:25 },
  { id:"M4", min:200_000, max:400_000, color:"#d97706", light:"#fef3c7", hotovostna:60, uverova:25 },
  { id:"M5", min:400_000, max:800_000, color:"#ea580c", light:"#ffedd5", hotovostna:75, uverova:25 },
  { id:"M6", min:800_000, max:Infinity,color:"#7c3aed", light:"#ede9fe", hotovostna:90, uverova:25 },
];

function getTier(v) { return TIERS.findLast(t => v >= t.min) || TIERS[0]; }
function getTierProgress(v) {
  const t = getTier(v);
  if (t.max === Infinity) return { tier:t, pct:100, remaining:0, next:null };
  return { tier:t, pct: Math.min(100,((v-t.min)/(t.max-t.min))*100), remaining:t.max-v, next:TIERS[TIERS.indexOf(t)+1]||null };
}

/* ── Initials avatar ── */
function initials(name) {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? p[0][0]+p[p.length-1][0] : name.slice(0,2);
}
function avatarColor(name) {
  const colors = ["#FF501C","#2563eb","#16a34a","#d97706","#7c3aed","#db2777","#0891b2","#4f46e5"];
  let h = 0; for (const c of name) h = (h*31+c.charCodeAt(0))%colors.length;
  return colors[h];
}

/* ── Kurzy ── */
const FX = { EUR:1, CZK:1/25.5 };
function toEur(v, cur) { return v*(FX[cur]??1); }

function norm(s) { return (s||"").normalize("NFD").replace(/\p{Diacritic}/gu,"").trim().toLowerCase(); }
function inOffice(name, list) { if(!list) return true; const n=norm(name); return list.some(a=>norm(a)===n); }

function fmtEur(v, decimals=0) {
  return new Intl.NumberFormat("sk-SK",{style:"currency",currency:"EUR",maximumFractionDigits:decimals}).format(v);
}
function fmtOrig(v, cur) {
  if(cur==="EUR") return null;
  return new Intl.NumberFormat("sk-SK",{style:"currency",currency:cur,maximumFractionDigits:0}).format(v);
}
function fmtDate(d) {
  if(!d) return "—";
  return new Date(d).toLocaleDateString("sk-SK",{day:"2-digit",month:"2-digit",year:"numeric"});
}

/* ── Prednastavené obdobia ── */
function getRange(period) {
  const now=new Date(), y=now.getFullYear(), m=now.getMonth(), d=now.getDate();
  switch(period){
    case "Dnes":               return {from:new Date(y,m,d),   to:new Date(y,m,d,23,59,59)};
    case "Tento mesiac":       return {from:new Date(y,m,1),   to:new Date(y,m+1,0)};
    case "Minulý mesiac":      return {from:new Date(y,m-1,1), to:new Date(y,m,0)};
    case "Posledné 3 mesiace": return {from:new Date(y,m-2,1), to:new Date(y,m+1,0)};
    case "Tento rok":          return {from:new Date(y,0,1),   to:new Date(y,11,31)};
    default:                   return null;
  }
}
function thisMonthRange() {
  const now=new Date(), y=now.getFullYear(), m=now.getMonth();
  return {from:new Date(y,m,1), to:new Date(y,m+1,0)};
}
function getMonthProgress() {
  const now=new Date(), y=now.getFullYear(), m=now.getMonth();
  const elapsed = now.getDate();
  const total   = new Date(y,m+1,0).getDate();
  return { elapsed, total, pct: elapsed/total };
}

const PERIODS = ["Dnes","Tento mesiac","Minulý mesiac","Posledné 3 mesiace","Tento rok","Vlastné"];
const MEDALS  = ["🥇","🥈","🥉"];
const ACCENT  = "#FF501C";

/* ══════════════════════════════════════════════════════ */
export default function SalesLeaderboardClient() {
  const [allDeals, setAllDeals] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [office,   setOffice]   = useState("Všetky");
  const [period,   setPeriod]   = useState("Tento mesiac");
  const [from,     setFrom]     = useState("");
  const [to,       setTo]       = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(()=>{
    setLoading(true);
    fetch("/api/leaderboard")
      .then(r=>r.json())
      .then(d=>setAllDeals(Array.isArray(d)?d:[]))
      .finally(()=>setLoading(false));
  },[]);

  /* ── Kariérne all-time totaly (bez filtra) ── */
  const allTimeByBroker = {};
  for(const d of allDeals){
    if(EXCLUDE.some(e=>norm(e)===norm(d.owner))) continue;
    allTimeByBroker[d.owner]=(allTimeByBroker[d.owner]||0)+toEur(d.cenaVozidla,d.currency);
  }

  /* ── Sumy pre tento mesiac ── */
  const tmr = thisMonthRange();
  const thisMonthByBroker     = {};
  const thisMonthUverByBroker = {};
  for(const d of allDeals){
    if(EXCLUDE.some(e=>norm(e)===norm(d.owner))) continue;
    if(!d.wonTime) continue;
    const t=new Date(d.wonTime);
    if(t<tmr.from||t>tmr.to) continue;
    thisMonthByBroker[d.owner]    =(thisMonthByBroker[d.owner]    ||0)+toEur(d.cenaVozidla,d.currency);
    thisMonthUverByBroker[d.owner]=(thisMonthUverByBroker[d.owner]||0)+(d.proviziaUver||0);
  }

  /* ── Filter ── */
  const range = period==="Vlastné"
    ? (from&&to?{from:new Date(from),to:new Date(to+"T23:59:59")}:null)
    : getRange(period);

  const filtered = allDeals.filter(d=>{
    if(EXCLUDE.some(e=>norm(e)===norm(d.owner))) return false;
    if(!inOffice(d.owner,OFFICES[office])) return false;
    if(!d.wonTime) return false;
    if(range){const t=new Date(d.wonTime);if(t<range.from||t>range.to) return false;}
    return true;
  });

  /* ── Agregácia ── */
  const bMap={};
  for(const d of filtered){
    if(!bMap[d.owner]) bMap[d.owner]={count:0,total:0,totalUver:0,deals:[]};
    bMap[d.owner].count++;
    bMap[d.owner].total    +=toEur(d.cenaVozidla,d.currency);
    bMap[d.owner].totalUver+=(d.proviziaUver||0);
    bMap[d.owner].deals.push(d);
  }
  const brokers = Object.entries(bMap)
    .map(([name,s])=>({
      name, ...s,
      avg:          s.total/s.count,
      allTimeTotal: allTimeByBroker[name]||0,
      thisMonth:    thisMonthByBroker[name]    ||0,
      thisMonthUver:thisMonthUverByBroker[name]||0,
    }))
    .sort((a,b)=>b.total-a.total||b.count-a.count);

  const totalDeals   = brokers.reduce((s,b)=>s+b.count,0);
  const totalRevenue = brokers.reduce((s,b)=>s+b.total,0);
  const avgPerDeal   = totalDeals?totalRevenue/totalDeals:0;
  const totalThisMonth = Object.values(thisMonthByBroker)
    .filter((_,i)=>!EXCLUDE.some(e=>norm(e)===norm(Object.keys(thisMonthByBroker)[i])))
    .reduce((s,v)=>s+v,0);

  const monthProgress  = getMonthProgress();
  const isThisMonth    = period === "Tento mesiac";
  const showForecast   = isThisMonth && monthProgress.elapsed < monthProgress.total && monthProgress.pct > 0;
  const totalForecast  = showForecast ? totalThisMonth / monthProgress.pct : 0;

  /* ── Financovanie – celkové sumy za obdobie ── */
  const totalUverProviziaSum = brokers.reduce((s,b)=>s+b.totalUver,0);
  const totalUverEarned      = brokers.reduce((s,b)=>{
    const {tier}=getTierProgress(b.allTimeTotal);
    return s+b.totalUver*(tier.uverova/100);
  },0);
  const countUverDeals = filtered.filter(d=>(d.proviziaUver||0)>0).length;

  /* ── Skeleton ── */
  if(loading) return(
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-gray-200 rounded-2xl w-1/2"/>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_,i)=><div key={i} className="h-24 bg-gray-200 rounded-2xl"/>)}
      </div>
      {[...Array(6)].map((_,i)=><div key={i} className="h-20 bg-gray-200 rounded-2xl"/>)}
    </div>
  );

  return(
    <div className="space-y-5">

      {/* ── Nadpis ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">🏆 Leaderboard predaja</h1>
          <p className="text-sm text-gray-400 mt-0.5">Obrat a zárobky podľa makléra · pozícia = kariérny objem</p>
        </div>
        <button
          onClick={()=>{setLoading(true);fetch("/api/leaderboard?force=1").then(r=>r.json()).then(d=>setAllDeals(Array.isArray(d)?d:[])).finally(()=>setLoading(false));}}
          className="text-xs px-4 py-2 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-1.5 font-medium"
        >🔄 Obnoviť</button>
      </div>

      {/* ── Súhrnné karty ── */}
      <div className={`grid gap-3 ${showForecast ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}>
        {[
          {label:"Predané (obdobie)", value:totalDeals,     fmt:v=>v+" ks",  icon:"🚗", grad:"from-blue-600 to-blue-700"},
          {label:"Obrat (obdobie)",   value:totalRevenue,   fmt:fmtEur,       icon:"💰", grad:"from-green-600 to-green-700"},
          {label:"Priemerný deal",    value:avgPerDeal,     fmt:fmtEur,       icon:"📊", grad:"from-purple-600 to-purple-700"},
          {label:"Obrat tento mesiac",value:totalThisMonth, fmt:fmtEur,       icon:"📅", grad:"from-orange-500 to-red-500"},
          ...(showForecast ? [{
            label:`Prognóza (${monthProgress.elapsed}/${monthProgress.total} dní)`,
            value:totalForecast,
            fmt:fmtEur,
            icon:"📈",
            grad:"from-teal-500 to-cyan-600",
            sub: `${Math.round(monthProgress.pct*100)}% mesiaca`,
          }] : []),
        ].map(s=>(
          <div key={s.label} className={`rounded-2xl p-4 text-white bg-gradient-to-br ${s.grad} shadow-sm`}>
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">{s.icon} {s.label}</p>
            <p className="text-xl font-extrabold leading-tight">{s.fmt(s.value)}</p>
            {s.sub && <p className="text-xs text-white/60 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Banner: Financovanie (vždy zobrazený) ── */}
      <div className="rounded-2xl p-5 text-white shadow-sm"
        style={{background:"linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)"}}>
        <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
          💳 Príjmy z financovania – {period === "Vlastné" ? "vlastné obdobie" : period.toLowerCase()}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-xl px-4 py-3">
            <p className="text-xs text-white/60 mb-0.5">Celkové provízie z financovania</p>
            <p className="text-2xl font-extrabold">{fmtEur(totalUverProviziaSum)}</p>
            <p className="text-xs text-white/50 mt-0.5">{countUverDeals} dealov s financovaním</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3">
            <p className="text-xs text-white/60 mb-0.5">Zárobky maklérov z financovania</p>
            <p className="text-2xl font-extrabold">{fmtEur(totalUverEarned)}</p>
            <p className="text-xs text-white/50 mt-0.5">podľa kariérnych % (20–25 %)</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3">
            <p className="text-xs text-white/60 mb-0.5">Zostatok po vyplatení maklérov</p>
            <p className="text-2xl font-extrabold">{fmtEur(totalUverProviziaSum - totalUverEarned)}</p>
            <p className="text-xs text-white/50 mt-0.5">
              {totalUverProviziaSum > 0
                ? `${Math.round(((totalUverProviziaSum - totalUverEarned) / totalUverProviziaSum) * 100)} % z celkového objemu`
                : 'žiadne financovanie v tomto období'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filtre ── */}
      <div className="bg-white rounded-2xl shadow-sm px-4 py-3 overflow-x-auto">
        <div className="flex items-center gap-3 min-w-max">

          {/* Kancelária */}
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kancelária</span>
          {Object.keys(OFFICES).map(o=>(
            <button key={o} onClick={()=>setOffice(o)}
              className="px-3 py-1 rounded-full text-sm font-semibold transition-all whitespace-nowrap"
              style={office===o?{backgroundColor:ACCENT,color:"white",boxShadow:"0 2px 8px #FF501C55"}:{backgroundColor:"#f3f4f6",color:"#6b7280"}}
            >{o}</button>
          ))}

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200 mx-1 flex-shrink-0"/>

          {/* Obdobie */}
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Obdobie</span>
          {PERIODS.map(p=>(
            <button key={p} onClick={()=>setPeriod(p)}
              className="px-3 py-1 rounded-full text-sm font-semibold transition-all whitespace-nowrap"
              style={period===p?{backgroundColor:"#1e3a5f",color:"white",boxShadow:"0 2px 8px #1e3a5f55"}:{backgroundColor:"#f3f4f6",color:"#6b7280"}}
            >{p}</button>
          ))}

          {/* Vlastné – inline, bez skoku */}
          <div className={`flex items-center gap-2 overflow-hidden transition-all duration-200 ${period==="Vlastné" ? "max-w-xs opacity-100" : "max-w-0 opacity-0 pointer-events-none"}`}>
            {[{label:"Od",val:from,set:setFrom},{label:"Do",val:to,set:setTo}].map(f=>(
              <div key={f.label} className="flex items-center gap-1">
                <span className="text-xs font-semibold text-gray-400">{f.label}</span>
                <input type="date" value={f.val} onChange={e=>f.set(e.target.value)}
                  className="border border-gray-200 rounded-xl px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Legenda pozícií ── */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Kariérne pozície · hotovostná % / úverová %
        </p>
        <div className="flex flex-wrap gap-2">
          {TIERS.map(t=>(
            <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{backgroundColor:t.light,border:`1.5px solid ${t.color}30`}}>
              <span className="text-xs font-extrabold px-1.5 py-0.5 rounded"
                style={{color:t.color,backgroundColor:t.color+"18"}}>{t.id}</span>
              <span className="text-xs text-gray-500 font-medium">
                {t.max===Infinity?`${fmtEur(t.min)}+`:`${fmtEur(t.min)}–${fmtEur(t.max)}`}
              </span>
              <span className="text-xs font-bold" style={{color:t.color}}>{t.hotovostna}%</span>
              <span className="text-xs text-blue-500 font-semibold">/ 💳 {t.uverova}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Leaderboard ── */}
      {brokers.length===0?(
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-semibold text-gray-600">Žiadne predaje v zvolenom období.</p>
        </div>
      ):(
        <div className="space-y-2">
          {brokers.map((b,i)=>{
            const isExpanded=expanded===b.name;
            const sharePct=totalRevenue?(b.total/totalRevenue*100):0;
            const {tier,pct:tierPct,remaining,next}=getTierProgress(b.allTimeTotal);

            /* ── Zárobky ── */
            const earned          = b.total         * (tier.hotovostna/100);
            const earnedUver      = b.totalUver      * (tier.uverova   /100);
            const earnedMonth     = b.thisMonth      * (tier.hotovostna/100);
            const earnedMonthUver = b.thisMonthUver  * (tier.uverova   /100);
            const earnedTotal     = earned     + earnedUver;
            const earnedMonthTotal= earnedMonth+ earnedMonthUver;
            const hasUverInPeriod = b.totalUver > 0;
            const hasUverDeals    = b.deals.some(d=>(d.proviziaUver||0)>0);

            const brokerForecast      = showForecast && b.thisMonth > 0 ? b.thisMonth / monthProgress.pct : null;
            const brokerForecastEarned= brokerForecast ? brokerForecast * (tier.hotovostna/100) : null;

            const ac    = avatarColor(b.name);
            const isTop3= i<3;

            return(
              <div key={b.name}
                className="bg-white rounded-2xl shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                style={isTop3?{borderLeft:`4px solid ${["#f59e0b","#9ca3af","#b45309"][i]}`}:{borderLeft:"4px solid transparent"}}>

                {/* ── Hlavný riadok ── */}
                <button onClick={()=>setExpanded(isExpanded?null:b.name)}
                  className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-gray-50/70 transition-colors">

                  {/* Rank + avatar */}
                  <div className="flex-shrink-0 relative">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-extrabold"
                      style={{backgroundColor:ac}}>
                      {initials(b.name)}
                    </div>
                    {isTop3&&(
                      <span className="absolute -top-1.5 -right-1.5 text-base leading-none">{MEDALS[i]}</span>
                    )}
                    {!isTop3&&(
                      <span className="absolute -top-1.5 -right-1.5 text-xs font-bold text-gray-400 bg-white rounded-full px-0.5">#{i+1}</span>
                    )}
                  </div>

                  {/* Meno + tier + progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-bold text-gray-900 text-sm truncate">{b.name}</p>
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded-md"
                        style={{backgroundColor:tier.light,color:tier.color,border:`1.5px solid ${tier.color}40`}}>
                        {tier.id}
                      </span>
                      {earnedMonthTotal>0&&(
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                          📅 {fmtEur(earnedMonthTotal)} tento mes.
                        </span>
                      )}
                      {brokerForecastEarned&&(
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 whitespace-nowrap">
                          📈 {fmtEur(brokerForecastEarned)} prognóza
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex-1 max-w-[160px]">
                        <div className="h-full rounded-full transition-all"
                          style={{width:tierPct+"%",backgroundColor:tier.color}}/>
                      </div>
                      {next?(
                        <span className="text-xs text-gray-400 whitespace-nowrap">do {next.id}: {fmtEur(remaining)}</span>
                      ):(
                        <span className="text-xs font-semibold" style={{color:tier.color}}>✦ Top pozícia</span>
                      )}
                    </div>
                  </div>

                  {/* Počet */}
                  <div className="hidden sm:flex flex-col items-center flex-shrink-0 w-14">
                    <p className="text-xl font-extrabold text-gray-900 leading-none">{b.count}</p>
                    <p className="text-xs text-gray-400">aut</p>
                  </div>

                  {/* Obrat + zárobky */}
                  <div className="flex-shrink-0 text-right min-w-[120px]">
                    <p className="text-base font-extrabold text-gray-900">{fmtEur(b.total)}</p>
                    {hasUverInPeriod ? (
                      <div className="text-xs mt-0.5 space-y-0.5">
                        <p className="text-emerald-600 font-semibold">predaj: {fmtEur(earned)}</p>
                        <p className="text-blue-600 font-semibold">💳 financ.: {fmtEur(earnedUver)}</p>
                        <p className="font-extrabold text-gray-800 border-t border-gray-100 pt-0.5">
                          = {fmtEur(earnedTotal)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-emerald-600">zarobil: {fmtEur(earned)}</p>
                    )}
                  </div>

                  <span className="text-gray-300 flex-shrink-0 ml-1 text-sm">{isExpanded?"▲":"▼"}</span>
                </button>

                {/* ── Rozbalený detail ── */}
                {isExpanded&&(
                  <div className="border-t border-gray-100">

                    {/* Info karta */}
                    <div className="px-5 py-4" style={{backgroundColor:tier.light}}>

                      {/* Základné info */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Kariérna pozícia</p>
                          <span className="font-extrabold text-lg" style={{color:tier.color}}>{tier.id}</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Kariérny objem</p>
                          <span className="font-extrabold text-base text-gray-900">{fmtEur(b.allTimeTotal)}</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Zárobky tento mes.</p>
                          <span className="font-extrabold text-base text-emerald-700">{fmtEur(earnedMonthTotal)}</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Predané (obdobie)</p>
                          <span className="font-extrabold text-base text-gray-900">{b.count} aut</span>
                        </div>
                        {brokerForecast && (
                          <div className="col-span-2 sm:col-span-4 rounded-xl px-4 py-3 bg-teal-50 border border-teal-200">
                            <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider mb-2">
                              📈 Prognóza konca mesiaca · {monthProgress.elapsed}/{monthProgress.total} dní ({Math.round(monthProgress.pct*100)}%)
                            </p>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 mb-0.5">Predpokladaný obrat</p>
                                <p className="font-extrabold text-base text-teal-800">{fmtEur(brokerForecast)}</p>
                                <p className="text-xs text-gray-400 mt-0.5">doteraz {fmtEur(b.thisMonth)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-0.5">Predpokladané zárobky</p>
                                <p className="font-extrabold text-base text-teal-800">{fmtEur(brokerForecastEarned)}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{tier.hotovostna}% z obratu</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-0.5">Zostatok mesiaca</p>
                                <p className="font-extrabold text-base text-gray-700">{fmtEur(brokerForecast - b.thisMonth)}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{monthProgress.total - monthProgress.elapsed} dní</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {next&&(
                          <div className="col-span-2 sm:col-span-4">
                            <p className="text-xs text-gray-500 mb-1">Postup na {next.id} — chýba {fmtEur(remaining)}</p>
                            <div className="h-2 bg-white rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all"
                                style={{width:tierPct+"%",backgroundColor:tier.color}}/>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{tierPct.toFixed(0)}% splnené</p>
                          </div>
                        )}
                      </div>

                      {/* Zárobkový rozklad */}
                      <div className={`rounded-xl overflow-hidden border ${hasUverInPeriod ? "border-blue-200" : "border-emerald-200"}`}>
                        <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${hasUverInPeriod ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
                          💰 Zárobky za obdobie
                        </div>
                        <div className={`grid divide-x ${hasUverInPeriod ? "grid-cols-3 divide-blue-100" : "grid-cols-1"} bg-white`}>
                          <div className="px-4 py-3">
                            <p className="text-xs text-gray-400 mb-0.5">
                              Provízia z predaja <span className="font-bold" style={{color:tier.color}}>({tier.hotovostna}%)</span>
                            </p>
                            <p className="text-xl font-extrabold text-emerald-700">{fmtEur(earned)}</p>
                            <p className="text-xs text-gray-400 mt-0.5">z obratu {fmtEur(b.total)}</p>
                          </div>
                          {hasUverInPeriod && <>
                            <div className="px-4 py-3">
                              <p className="text-xs text-gray-400 mb-0.5">
                                💳 Provízia z financovania <span className="font-bold text-blue-600">({tier.uverova}%)</span>
                              </p>
                              <p className="text-xl font-extrabold text-blue-700">{fmtEur(earnedUver)}</p>
                              <p className="text-xs text-gray-400 mt-0.5">z financovania {fmtEur(b.totalUver)}</p>
                            </div>
                            <div className="px-4 py-3 bg-gray-50">
                              <p className="text-xs text-gray-400 mb-0.5">Celkovo zarobené</p>
                              <p className="text-xl font-extrabold text-gray-900">{fmtEur(earnedTotal)}</p>
                              <p className="text-xs text-gray-400 mt-0.5">predaj + financovanie</p>
                            </div>
                          </>}
                        </div>
                      </div>

                    </div>

                    {/* Mobile karty dealov */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {b.deals.sort((a,z)=>new Date(z.wonTime)-new Date(a.wonTime)).map(d=>{
                        const orig=fmtOrig(d.cenaVozidla,d.currency);
                        const eur =fmtEur(toEur(d.cenaVozidla,d.currency));
                        return(
                          <div key={d.id} className="px-4 py-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-800 text-sm">{d.title}</p>
                                <p className="text-xs text-gray-400">{fmtDate(d.wonTime)}</p>
                              </div>
                              <div className="text-right ml-2">
                                <p className="font-bold text-green-700 text-sm whitespace-nowrap">{orig??eur}</p>
                                {orig&&<p className="text-xs text-gray-400">≈ {eur}</p>}
                              </div>
                            </div>
                            {(d.proviziaUver||0)>0&&(
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                                  💳 Financovanie: {fmtEur(d.proviziaUver)} → zárobek {fmtEur(d.proviziaUver*(tier.uverova/100))}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop tabuľka dealov */}
                    <table className="hidden md:table w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs uppercase text-gray-400">
                          <th className="px-5 py-2 text-left font-semibold">Vozidlo</th>
                          <th className="px-5 py-2 text-left font-semibold">Predané</th>
                          <th className="px-5 py-2 text-right font-semibold">Pôv. hodnota</th>
                          <th className="px-5 py-2 text-right font-semibold">EUR</th>
                          <th className="px-5 py-2 text-right font-semibold">Zárobek predaj</th>
                          {hasUverDeals&&<th className="px-5 py-2 text-right font-semibold">💳 Financovanie</th>}
                          {hasUverDeals&&<th className="px-5 py-2 text-right font-semibold text-gray-700">Spolu</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {b.deals.sort((a,z)=>new Date(z.wonTime)-new Date(a.wonTime)).map(d=>{
                          const orig     = fmtOrig(d.cenaVozidla,d.currency);
                          const eur      = toEur(d.cenaVozidla,d.currency);
                          const eP       = eur*(tier.hotovostna/100);
                          const eU       = (d.proviziaUver||0)*(tier.uverova/100);
                          const hasUver  = (d.proviziaUver||0)>0;
                          return(
                            <tr key={d.id} className={`hover:bg-gray-50 ${hasUver?"bg-blue-50/30":""}`}>
                              <td className="px-5 py-2.5 font-medium text-gray-800">{d.title}</td>
                              <td className="px-5 py-2.5 text-gray-500">{fmtDate(d.wonTime)}</td>
                              <td className="px-5 py-2.5 text-right">
                                {orig?<span className="font-semibold text-blue-700">{orig}</span>:<span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-5 py-2.5 text-right font-bold text-gray-800">{fmtEur(eur)}</td>
                              <td className="px-5 py-2.5 text-right font-bold text-emerald-700">{fmtEur(eP)}</td>
                              {hasUverDeals&&(
                                <td className="px-5 py-2.5 text-right font-bold text-blue-600">
                                  {hasUver?(
                                    <span className="inline-flex flex-col items-end">
                                      <span>{fmtEur(eU)}</span>
                                      <span className="text-xs text-gray-400 font-normal">z {fmtEur(d.proviziaUver)}</span>
                                    </span>
                                  ):"—"}
                                </td>
                              )}
                              {hasUverDeals&&(
                                <td className="px-5 py-2.5 text-right font-extrabold text-gray-900">
                                  {fmtEur(eP+eU)}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-emerald-50">
                          <td colSpan={3} className="px-5 py-2.5 text-sm font-semibold text-emerald-800">Spolu (EUR)</td>
                          <td className="px-5 py-2.5 text-right font-extrabold text-gray-900">{fmtEur(b.total)}</td>
                          <td className="px-5 py-2.5 text-right font-extrabold text-emerald-800">{fmtEur(earned)}</td>
                          {hasUverDeals&&(
                            <td className="px-5 py-2.5 text-right font-extrabold text-blue-800">{fmtEur(earnedUver)}</td>
                          )}
                          {hasUverDeals&&(
                            <td className="px-5 py-2.5 text-right font-extrabold text-gray-900">{fmtEur(earnedTotal)}</td>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {range&&(
        <p className="text-xs text-gray-400 text-center">
          {fmtDate(range.from.toISOString())} – {fmtDate(range.to.toISOString())} · {filtered.length} dealov · cache 5 min
        </p>
      )}
    </div>
  );
}
