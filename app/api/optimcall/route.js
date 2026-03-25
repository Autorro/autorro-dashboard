export const runtime = "nodejs";

const HOST    = "autorealitka.m2.optimcall.cz";
const B64AUTH = Buffer.from("admin:Autorro2024").toString("base64");

async function fetchJson(path) {
  const res = await fetch(`https://${HOST}${path}`, {
    headers: { Authorization: `Basic ${B64AUTH}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
  const text = await res.text();
  if (!text) return [];
  return JSON.parse(text);
}

export async function GET(request) {
  try {
    const [users, lines] = await Promise.all([
      fetchJson("/rest/users"),
      fetchJson("/rest/phoneLines"),
    ]);

    // Try call records – returns empty if none exist yet
    let callRecords = [];
    try {
      const { searchParams } = new URL(request.url);
      const dateFrom = searchParams.get("dateFrom") || "";
      const dateTo   = searchParams.get("dateTo")   || "";
      const qp = new URLSearchParams();
      if (dateFrom) qp.set("dateFrom", dateFrom);
      if (dateTo)   qp.set("dateTo",   dateTo);
      const crPath = "/rest/callRecords" + (qp.toString() ? "?" + qp.toString() : "");
      callRecords = await fetchJson(crPath);
      if (!Array.isArray(callRecords)) callRecords = [];
    } catch (_) {
      // callRecords not available – continue with empty array
    }

    // ── Build per-user stats from call records ───────────────────────────────
    const userStats = {};
    for (const u of users) {
      userStats[u.login] = {
        id: u.id,
        login: u.login,
        status: u.statusName || u.status || null,
        calls: 0,
        uniqueNumbers: new Set(),
        answered: 0,
        missed: 0,
        outgoing: 0,
        incoming: 0,
        totalDuration: 0,
      };
    }

    for (const call of callRecords) {
      const key = call.userLogin || call.userName || call.login || null;
      if (key && userStats[key]) {
        const s = userStats[key];
        s.calls++;
        if (call.number)   s.uniqueNumbers.add(call.number);
        if (call.answered === true || call.answered === 1) s.answered++;
        else s.missed++;
        if (call.direction === "outgoing") s.outgoing++;
        else s.incoming++;
        s.totalDuration += call.duration || 0;
      }
    }

    const statsArray = Object.values(userStats).map((s) => ({
      ...s,
      uniqueNumbers: s.uniqueNumbers.size,
    }));

    // ── Map phone lines ───────────────────────────────────────────────────────
    const phoneLines = lines.map((l) => ({
      id: l.id,
      number: l.phoneNumber,
      behavior: l.behavior,
      redirectTo: l.redirectTo,
      calls: callRecords.filter(
        (c) =>
          c.extension === l.phoneNumber ||
          c.phoneLine === l.phoneNumber ||
          c.calledNumber === l.phoneNumber
      ).length,
    }));

    return Response.json({
      ok: true,
      hasCallRecords: callRecords.length > 0,
      summary: {
        totalCalls:    callRecords.length,
        answered:      callRecords.filter((c) => c.answered === true || c.answered === 1).length,
        missed:        callRecords.filter((c) => c.answered === false || c.answered === 0).length,
        totalDuration: callRecords.reduce((a, c) => a + (c.duration || 0), 0),
      },
      users: statsArray,
      phoneLines,
    });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
