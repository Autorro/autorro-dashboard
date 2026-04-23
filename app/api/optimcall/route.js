export const runtime = "nodejs";

import WebSocket from "ws";
import { randomUUID } from "crypto";
import { NAVOLALA_KEY, WASITLEAD_KEY, WASITLEAD_YES as WASITLEAD_TRUE } from "@/lib/constants";
import { getServerUser } from "@/lib/auth-server";

const HOST = "autorealitka.m2.optimcall.cz";
const OPTIMCALL_USER     = process.env.OPTIMCALL_USER     || "admin";
const OPTIMCALL_PASSWORD = process.env.OPTIMCALL_PASSWORD || "";

// Pipedrive navolala option IDs that belong to telefonists (as strings)
const TELEFONIST_IDS = new Set(["418", "419", "420", "421", "422", "935", "426"]);

// ── Agent registry ─────────────────────────────────────────────────────────────
// navolalaId = Pipedrive enum option ID for the "Navolala" field
// ext        = OptimCall extension (klapka); null if not yet assigned
const AGENTS = [
  { navolalaId: "418", nick: "Anička",  fullName: "Annamária Durcová",  ext: null },
  { navolalaId: "419", nick: "Braňo",   fullName: "Braňo",              ext: null },
  { navolalaId: "420", nick: "Daniel",  fullName: "Daniel Ondriga",      ext: null },
  { navolalaId: "421", nick: "Kača",    fullName: "Katarína Durcová",   ext: null },
  { navolalaId: "422", nick: "Miška",   fullName: "Michaela Knezelová", ext: null },
  { navolalaId: "935", nick: "Patress", fullName: "Patrik Baláž",       ext: null },
  { navolalaId: "426", nick: "Sandra",  fullName: "Sandra Lechnerová",  ext: "303" },
];

// Match an OptimCall srcName / src (extension) to an AGENTS entry
function findAgent(srcName, src) {
  // 1. Explicit extension match
  const byExt = AGENTS.find(a => a.ext && a.ext === src);
  if (byExt) return byExt;

  const name = (srcName || "").toLowerCase();

  // 2. Nick match (Anička, Kača, …)
  const byNick = AGENTS.find(a => name.includes(a.nick.toLowerCase()));
  if (byNick) return byNick;

  // 3. Significant word from fullName (len > 3, skip very common words)
  const byFull = AGENTS.find(a => {
    const words = a.fullName.toLowerCase().split(" ");
    return words.some(w => w.length > 4 && name.includes(w));
  });
  return byFull || null;
}

// ── Helper: parse $numberLong ──────────────────────────────────────────────────
function nl(val) {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (val.$numberLong) return parseInt(val.$numberLong, 10);
  return 0;
}

// ── WebSocket: authenticate ────────────────────────────────────────────────────
function wsAuth() {
  return new Promise((resolve, reject) => {
    if (!OPTIMCALL_PASSWORD) {
      return reject(new Error("OPTIMCALL_PASSWORD env var is not set"));
    }
    const ws = new WebSocket(`wss://${HOST}/websocket`, { rejectUnauthorized: false });
    let authSent = false;
    const t = setTimeout(() => { ws.terminate(); reject(new Error("auth timeout")); }, 12000);

    ws.on("error", (e) => { clearTimeout(t); reject(e); });
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      const cls = msg._class || "";

      if (!authSent && cls.includes("ConnectionIdentity") && msg.activeIdentity?._class?.includes("Unknown")) {
        authSent = true;
        ws.send(JSON.stringify({
          _class:    "com.optimsys.costra.session.SessionChangeTrueIdentity",
          messageId: randomUUID(),
          authToken: { _class: "com.optimsys.costra.identity.AuthorizeByNamePassword", name: OPTIMCALL_USER, password: OPTIMCALL_PASSWORD },
          tenant:    { _class: "com.optimsys.costra.identity.TenantName", name: HOST },
        }));
        return;
      }
      if (authSent && cls.includes("ConnectionIdentity") && msg.activeIdentity?.id) {
        clearTimeout(t);
        resolve(ws);
      }
    });
  });
}

// ── WebSocket: fetch call records ──────────────────────────────────────────────
async function fetchCallRecords(dateFrom, dateTo) {
  const ws = await wsAuth();
  const containerId = randomUUID();
  const PAGE = 500;
  let allRecords = [];

  return new Promise((resolve, reject) => {
    let fetchSent = false;
    let pageStart = 0;

    const t = setTimeout(() => { ws.terminate(); resolve(allRecords); }, 25000);

    ws.on("error", (e) => { clearTimeout(t); reject(e); });

    ws.send(JSON.stringify({
      _class:         "com.optimsys.costra.containers.Container$Open",
      containerId,
      containerClass: "com.optimsys.costra.optimcall.call.ui.CallHistory",
      params: { filter: { dateFrom, dateTo }, search: "", ordering: { startTime: -1 }, start: 0, limit: PAGE },
    }));

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      const cls = msg._class || "";

      if (cls.includes("SuccessReply") && !fetchSent) {
        fetchSent = true;
        ws.send(JSON.stringify({
          _class:    "com.optimsys.costra.optimcall.call.ui.CallHistory$Fetch",
          containerId,
          filter:    { dateFrom, dateTo },
          search:    "",
          ordering:  { startTime: -1 },
          start:     pageStart,
          limit:     PAGE,
        }));
        return;
      }

      if (cls.includes("ListContainer$Fetched")) {
        const list = msg.data?.list || [];
        allRecords = allRecords.concat(list);

        if (list.length === PAGE && allRecords.length < 3000) {
          pageStart += PAGE;
          ws.send(JSON.stringify({
            _class:    "com.optimsys.costra.optimcall.call.ui.CallHistory$Fetch",
            containerId,
            filter:    { dateFrom, dateTo },
            search:    "",
            ordering:  { startTime: -1 },
            start:     pageStart,
            limit:     PAGE,
          }));
        } else {
          clearTimeout(t);
          ws.terminate();
          resolve(allRecords);
        }
      }

      if (cls.includes("FailReply") || cls.includes("Exception")) {
        clearTimeout(t);
        ws.terminate();
        reject(new Error(msg.message || "Server FailReply"));
      }
    });
  });
}

// ── Pipedrive: fetch "navolané" deals ─────────────────────────────────────────
// A deal counts as "navolané" when:
//   • wasItLead = true (805)
//   • the "Navolala" field is a known telefonist
//   • the deal was CREATED (add_time) within the requested date range
// Stage is intentionally NOT filtered — deals move between stages over time,
// but the add_time (creation date) stays fixed and wasItLead=true is permanent.
async function fetchPipedriveLeads(dateFrom, dateTo) {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN;
  const results  = []; // [{ date, navolalaId }]
  let start = 0;

  while (true) {
    const url =
      `https://api.pipedrive.com/v1/deals?api_token=${apiToken}` +
      `&status=all&sort=add_time+DESC&start=${start}&limit=500`;
    const res  = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    const deals = json.data || [];
    if (deals.length === 0) break;

    let reachedEnd = false;
    for (const deal of deals) {
      const addDate    = (deal.add_time || "").slice(0, 10);
      if (addDate < dateFrom) { reachedEnd = true; break; }
      if (addDate > dateTo)   continue;
      const wasItLead  = String(deal[WASITLEAD_KEY] || "");
      if (wasItLead !== WASITLEAD_TRUE) continue;
      const navolalaId = String(deal[NAVOLALA_KEY]  || "");
      if (!TELEFONIST_IDS.has(navolalaId)) continue;
      results.push({ date: addDate, navolalaId });
    }

    if (reachedEnd) break;
    if (!json.additional_data?.pagination?.more_items_in_collection) break;
    start += 500;
  }

  return results;
}

// ── Build per-agent per-day stats ──────────────────────────────────────────────
// obvolane = answered OptimCall calls (secConn > 0)
// navolane = wasItLead=true Pipedrive deals
function buildStats(callRecords, pipedriveLeads, dateFrom, dateTo) {
  // --- OptimCall: obvolane per (agentKey, date) ---
  // obvolaneMap[agentKey][date] = { obvolane, totalSecs, src, srcName }
  const obvolaneMap = {};
  const extToKey    = {}; // memoize ext→agentKey

  for (const r of callRecords) {
    const src     = r.src || "";
    const srcName = r.srcName || src;
    const secConn = nl(r.secondsConnected);
    const startMs = nl(r.startTime);

    // Only outgoing internal extensions
    if (!src || src.startsWith("+") || src.length > 6) continue;

    const date = startMs ? new Date(startMs).toISOString().slice(0, 10) : null;
    if (!date || date < dateFrom || date > dateTo) continue;

    // Only count answered calls (secConn > 0) → these are "obvolané"
    if (secConn <= 0) continue;

    // Identify agent
    if (!extToKey[src]) {
      const ag = findAgent(srcName, src);
      extToKey[src] = ag ? ag.nick : srcName || src;
    }
    const key = extToKey[src];

    if (!obvolaneMap[key]) obvolaneMap[key] = {};
    if (!obvolaneMap[key][date]) obvolaneMap[key][date] = { obvolane: 0, totalSecs: 0, src, srcName };
    obvolaneMap[key][date].obvolane++;
    obvolaneMap[key][date].totalSecs += secConn;
  }

  // --- Pipedrive: navolane per (agentKey, date) ---
  const navolaneMap = {}; // navolaneMap[agentKey][date] = count

  for (const { date, navolalaId } of pipedriveLeads) {
    const ag = AGENTS.find(a => a.navolalaId === navolalaId);
    if (!ag) continue;
    const key = ag.nick;
    if (!navolaneMap[key]) navolaneMap[key] = {};
    navolaneMap[key][date] = (navolaneMap[key][date] || 0) + 1;
  }

  // --- Merge: collect all agent keys from both sources ---
  const allKeys = new Set([...Object.keys(obvolaneMap), ...Object.keys(navolaneMap)]);

  // Collect all dates in range
  const allDates = new Set();
  for (const [, days] of Object.entries(obvolaneMap)) Object.keys(days).forEach(d => allDates.add(d));
  for (const [, days] of Object.entries(navolaneMap)) Object.keys(days).forEach(d => allDates.add(d));

  const agents = [];

  for (const key of allKeys) {
    const ag  = AGENTS.find(a => a.nick === key);
    const dates = new Set([
      ...Object.keys(obvolaneMap[key] || {}),
      ...Object.keys(navolaneMap[key] || {}),
    ]);

    const dayStats = [...dates].sort().map(date => {
      const o = obvolaneMap[key]?.[date] || {};
      const obvolane  = o.obvolane  || 0;
      const navolane  = navolaneMap[key]?.[date] || 0;
      const totalSecs = o.totalSecs || 0;
      return {
        date,
        obvolane,
        navolane,
        efektivita: obvolane > 0 ? Math.round((navolane / obvolane) * 100) : 0,
        totalSecs,
      };
    });

    const totObv = dayStats.reduce((s, d) => s + d.obvolane, 0);
    const totNav = dayStats.reduce((s, d) => s + d.navolane, 0);
    const totSec = dayStats.reduce((s, d) => s + d.totalSecs, 0);

    // Try to find OptimCall ext/srcName for this agent
    const firstODay = Object.values(obvolaneMap[key] || {})[0];
    const src     = ag?.ext || firstODay?.src || "";
    const srcName = ag?.fullName || firstODay?.srcName || key;

    agents.push({
      nick:          key,
      fullName:      ag?.fullName || key,
      src,
      days:          dayStats,
      totalObvolane: totObv,
      totalNavolane: totNav,
      efektivita:    totObv > 0 ? Math.round((totNav / totObv) * 100) : 0,
      totalSecs:     totSec,
    });
  }

  return agents
    .filter(a => a.totalObvolane > 0 || a.totalNavolane > 0)
    .sort((a, b) => b.totalNavolane - a.totalNavolane || b.totalObvolane - a.totalObvolane);
}

// ── Cache wrapper (per date range, TTL 5 min) ─────────────────────────────────
import { unstable_cache } from "next/cache";

function getCachedOptimcall(dateFrom, dateTo) {
  return unstable_cache(
    async () => {
      const [callRecords, pipedriveLeads] = await Promise.all([
        fetchCallRecords(dateFrom, dateTo),
        fetchPipedriveLeads(dateFrom, dateTo),
      ]);
      const agents   = buildStats(callRecords, pipedriveLeads, dateFrom, dateTo);
      const totalObv = agents.reduce((s, a) => s + a.totalObvolane, 0);
      const totalNav = agents.reduce((s, a) => s + a.totalNavolane, 0);
      return {
        ok: true,
        recordCount:    callRecords.length,
        leadCount:      pipedriveLeads.length,
        dateFrom,
        dateTo,
        summary: {
          obvolane:   totalObv,
          navolane:   totalNav,
          efektivita: totalObv > 0 ? Math.round((totalNav / totalObv) * 100) : 0,
          totalSecs:  agents.reduce((s, a) => s + a.totalSecs, 0),
        },
        agents,
      };
    },
    [`optimcall-${dateFrom}-${dateTo}`],
    { revalidate: 300, tags: ["optimcall", "all"] }
  )();
}

// ── GET handler ────────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom") || new Date().toISOString().slice(0, 10);
    const dateTo   = searchParams.get("dateTo")   || new Date().toISOString().slice(0, 10);
    const force    = searchParams.get("force") === "1";

    if (force) {
      const { revalidateTag } = await import("next/cache");
      revalidateTag("optimcall");
    }

    const data = await getCachedOptimcall(dateFrom, dateTo);
    return Response.json(data, { headers: { "X-Cache": force ? "REVALIDATED" : "HIT" } });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
