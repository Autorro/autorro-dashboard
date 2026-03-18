export const dynamic = "force-dynamic";
import DashboardClient from "./DashboardClient";

const INZEROVANE_STAGES = [13, 31, 34, 22];

async function getAllDeals() {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN;
  let all = [];
  
  for (const stageId of INZEROVANE_STAGES) {
    let start = 0;
    while (true) {
      const response = await fetch(
        "https://api.pipedrive.com/v1/deals?api_token=" + apiToken + "&limit=100&start=" + start + "&status=open&stage_id=" + stageId + "&fields=id,title,owner_id,stage_id,value,currency,status,880011fdbacbc3eee50103ec49001ac8abd56ae1",
        { next: { revalidate: 300 } }
      );
      const data = await response.json();
      all = all.concat(data.data || []);
      const more = data.additional_data?.pagination?.more_items_in_collection;
      if (!more) break;
      start = data.additional_data.pagination.next_start;
    }
  }
  return all;
}

export default async function Home() {
  const deals = await getAllDeals();
  return <DashboardClient deals={deals} />;
}