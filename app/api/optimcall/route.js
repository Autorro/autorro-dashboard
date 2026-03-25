export const runtime = "nodejs";

import WebSocket from "ws";
import { randomUUID } from "crypto";

const HOST = "autorealitka.m2.optimcall.cz";

// ── Helper: parse $numberLong ─────────────────────────────────────────────────
function nl(val) {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (val.$numberLong) return parseInt(val.$numberLong, 10);
  return 0;
}

// ── WebSocket: authenticate and return open ws ────────────────────────────────
function wsAuth() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://${HOST}/websocket`, {
      rejectUnauthorized: false,
      headers: { Cookie: "sessionId=" + randomUUID() },
    });
    let authSent = false;
    const t = setTimeout(() => { ws.terminate(); reject(new Error("auth timeout")); }, 12000);

    ws.on("error", (e) => { clearTimeout(t); reject(e); });
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      const cls = msg._class || "";

      // Step 1: initial Unknown ConnectionIdentity → send auth
      if (!authSent && cls.includes("ConnectionIdentity") && msg.activeIdentity?._class?.includes("Unknown")) {
        authSent = true;
        ws.send(JSON.stringify({
          _class:    "com.optimsys.costra.session.SessionChangeTrueIdentity",
          messageId: randomUUID(),
          authToken: { _class: "com.optimsys.costra.identity.AuthorizeByNamePassword", name: "admin", password: "Autorro2024" },
          tenant:    { _class: "com.optimsys.costra.identity.TenantName", name: HOST },
        }));
        return;
      }

      // Step 2: second ConnectionIdentity with real identity → authenticated
      if (authSent && cls.includes("ConnectionIdentity") && msg.activeIdentity?.id) {
        clearTimeout(t);
        resolve(ws);
      }
    });
  });
}

// ── WebSocket: fetch call records in pages ────────────────────────────────────
async function fetchCallRecords(dateFrom, dateTo) {
  const ws = await wsAuth();
  const containerId = randomUUID();
  const PAGE = 500;
  let allRecords = [];

  return new Promise((resolve, reject) => {
    let fetchSent = false;
    let pageStart = 0;

    const t = setTimeout(() => {
      ws.terminate();
      // Return whatever we collected so far rather than failing completely
      resolve(allRecords);
    }, 25000);

    ws.on("error", (e) => { clearTimeout(t); reject(e); });

    // Open container
    ws.send(JSON.stringify({
      _class:         "com.optimsys.costra.containers.Container$Open",
      containerId,
      containerClass: "com.optimsys.costra.optimcall.call.ui.CallHistory",
      params: {
        filter:   { dateFrom, dateTo },
        search:   "",
        ordering: { startTime: -1 },
        start:    0,
        limit:    PAGE,
      },
    }));

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      const cls = msg._class || "";

      // SuccessReply → send fetch
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

      // Data received
      if (cls.includes("ListContainer$Fetched")) {
        const list = msg.data?.list || [];
        allRecords = allRecords.concat(list);

        // Paginate if we got a full page (cap at 3000 records to avoid timeout)
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

// ── Parse call records into per-agent per-day stats ───────────────────────────
// Only include agents whose src looks like an internal extension (short number, no +)
function isInternalExt(src) {
  return src && !src.startsWith("+") && src.length <= 6;
}

function parseStats(records, dateFrom, dateTo) {
  const agents = {};

  for (const r of records) {
    const src     = r.src || "";
    const name    = r.srcName || src;
    const dst     = r.dst || "";
    const secConn = nl(r.secondsConnected);
    const startMs = nl(r.startTime);

    // Only count outgoing calls from internal extensions
    if (!isInternalExt(src)) continue;

    // Date of the call (UTC date — close enough for business hours in CET)
    const date = startMs
      ? new Date(startMs).toISOString().slice(0, 10)
      : null;

    // Client-side date filter (server filter may not restrict properly)
    if (date && dateFrom && date < dateFrom) continue;
    if (date && dateTo   && date > dateTo)   continue;
    if (!date) continue;

    if (!agents[src]) agents[src] = { src, name, days: {} };
    if (!agents[src].days[date]) {
      agents[src].days[date] = { obvolane: 0, navolane: 0, totalSecs: 0 };
    }

    const d = agents[src].days[date];
    d.obvolane++;                         // total call attempts
    if (secConn > 0) {
      d.navolane++;                       // answered calls
      d.totalSecs += secConn;
    }
  }

  // Flatten into array
  return Object.values(agents).map((agent) => {
    const dayStats = Object.entries(agent.days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        obvolane:   d.obvolane,
        navolane:   d.navolane,
        efektivita: d.obvolane > 0 ? Math.round((d.navolane / d.obvolane) * 100) : 0,
        totalSecs:  d.totalSecs,
      }));

    const totObv = dayStats.reduce((s, d) => s + d.obvolane, 0);
    const totNav = dayStats.reduce((s, d) => s + d.navolane, 0);

    return {
      src:           agent.src,
      name:          agent.name,
      days:          dayStats,
      totalObvolane: totObv,
      totalNavolane: totNav,
      efektivita:    totObv > 0 ? Math.round((totNav / totObv) * 100) : 0,
      totalSecs:     dayStats.reduce((s, d) => s + d.totalSecs, 0),
    };
  })
  .filter((a) => a.totalObvolane > 0)
  .sort((a, b) => b.totalObvolane - a.totalObvolane);
}

// ── GET handler ───────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom") || new Date().toISOString().slice(0, 10);
    const dateTo   = searchParams.get("dateTo")   || new Date().toISOString().slice(0, 10);

    const records = await fetchCallRecords(dateFrom, dateTo);
    const agents  = parseStats(records, dateFrom, dateTo);

    const totalObv = agents.reduce((s, a) => s + a.totalObvolane, 0);
    const totalNav = agents.reduce((s, a) => s + a.totalNavolane, 0);

    return Response.json({
      ok: true,
      recordCount: records.length,
      dateFrom,
      dateTo,
      summary: {
        obvolane:   totalObv,
        navolane:   totalNav,
        efektivita: totalObv > 0 ? Math.round((totalNav / totalObv) * 100) : 0,
        totalSecs:  agents.reduce((s, a) => s + a.totalSecs, 0),
      },
      agents,
    });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
