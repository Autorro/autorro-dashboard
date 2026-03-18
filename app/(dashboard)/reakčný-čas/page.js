import ReakcnyClient from "./ReakcnyClient";
import { createClient } from '@supabase/supabase-js'

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { data } = await supabase
    .from('stage_changes')
    .select('*')
    .order('changed_at', { ascending: false })
  return data || []
}

export default async function ReakcnyPage() {
  const changes = await getData()
  return <ReakcnyClient changes={changes} />
}