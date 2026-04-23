import TrendClient from "./TrendClient";
import { getServerSupabase } from "../../../lib/auth-server";

async function getData() {
  const supabase = await getServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('health_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: true });

  if (error) {
    console.error('[trend] health_snapshots query failed:', error.message);
    return [];
  }
  return data || [];
}

export const dynamic = "force-dynamic";

export default async function TrendPage() {
  const snapshots = await getData();
  return <TrendClient snapshots={snapshots} />;
}
