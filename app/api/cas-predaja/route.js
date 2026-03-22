import { supabase } from '@/lib/supabase'
import { createCache } from '@/lib/pipedrive'
import { INZEROVANE_STAGES } from '@/lib/constants'

const CACHE_TTL = 10 * 60 * 1000
const cache     = createCache(CACHE_TTL)

// Fetch Pipedrive deal details in batches of 10
async function fetchDealDetails(dealIds, apiToken) {
  const details = {};
  const BATCH = 10;
  for (let i = 0; i < dealIds.length; i += BATCH) {
    const batch = dealIds.slice(i, i + BATCH);
    await Promise.all(batch.map(async (id) => {
      try {
        const res = await fetch(
          `https://api.pipedrive.com/v1/deals/${id}?api_token=${apiToken}&fields=id,title,add_time,close_time,won_time,lost_time,status,value,currency`
        );
        const json = await res.json();
        if (json.data) details[id] = json.data;
      } catch (e) { console.warn('[cas-predaja] Detail dealu', id, 'sa nepodarilo načítať:', e.message) }
    }));
  }
  return details;
}

async function fetchData() {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN;

  const { data, error } = await supabase
    .from("stage_changes")
    .select("deal_id, deal_title, owner_name, from_stage, to_stage, changed_at")
    .or(`to_stage.in.(${INZEROVANE_STAGES.join(",")}),from_stage.in.(${INZEROVANE_STAGES.join(",")})`)
    .order("changed_at", { ascending: true });

  if (error) throw new Error(error.message);

  // Group events by deal_id
  const dealMap = {};
  for (const row of data) {
    if (!dealMap[row.deal_id]) {
      dealMap[row.deal_id] = {
        deal_id: row.deal_id,
        owner_name: row.owner_name,
        deal_title: row.deal_title,
        entries: [],
        exits: [],
      };
    }
    if (INZEROVANE_STAGES.includes(row.to_stage))   dealMap[row.deal_id].entries.push(new Date(row.changed_at));
    if (INZEROVANE_STAGES.includes(row.from_stage)) dealMap[row.deal_id].exits.push(new Date(row.changed_at));
  }

  // Calculate duration per deal
  const now = new Date();
  const dealDurations = [];

  for (const [dealId, deal] of Object.entries(dealMap)) {
    if (deal.entries.length === 0) continue;
    const entry = deal.entries[0];
    const exit  = deal.exits.find(e => e > entry) || null;
    const end   = exit || now;
    const days  = Math.round(((end - entry) / (1000 * 60 * 60 * 24)) * 10) / 10;
    dealDurations.push({
      deal_id:    Number(dealId),
      owner_name: deal.owner_name,
      deal_title: deal.deal_title,
      days,
      completed:  !!exit,
      entry_date: entry.toISOString(),
      exit_date:  exit ? exit.toISOString() : null,
    });
  }

  // Fetch Pipedrive details for all unique deal IDs
  const uniqueIds = [...new Set(dealDurations.map(d => d.deal_id))];
  const pdDetails = await fetchDealDetails(uniqueIds, apiToken);

  // Merge Pipedrive data into each deal
  const enriched = dealDurations.map(d => {
    const pd = pdDetails[d.deal_id] || {};
    const closeDate = pd.close_time || pd.won_time || pd.lost_time || null;
    return {
      ...d,
      pd_id:        pd.id || d.deal_id,
      add_time:     pd.add_time  || null,  // date deal was opened in Pipedrive
      close_time:   closeDate,             // date deal was closed
      value:        pd.value     || null,  // deal value
      currency:     pd.currency  || "EUR",
      status:       pd.status    || null,  // open / won / lost
    };
  });

  // Aggregate by owner_name — keep deal list
  const ownerMap = {};
  for (const d of enriched) {
    const name = d.owner_name || "Neznámy";
    if (!ownerMap[name]) ownerMap[name] = [];
    ownerMap[name].push(d);
  }

  const result = Object.entries(ownerMap).map(([owner_name, deals]) => {
    const days = deals.map(d => d.days);
    return {
      owner_name,
      count: days.length,
      avg:   Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10,
      min:   Math.round(Math.min(...days) * 10) / 10,
      max:   Math.round(Math.max(...days) * 10) / 10,
      deals: deals.sort((a, b) => b.days - a.days), // slowest first
    };
  });

  return result;
}

export async function GET() {
  try {
    const cached = cache.get();
    if (cached !== null) {
      return Response.json(cached, { headers: { "X-Cache": "HIT" } });
    }
    const data = await fetchData();
    cache.set(data);
    return Response.json(data, { headers: { "X-Cache": "MISS" } });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
