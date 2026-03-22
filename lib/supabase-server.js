import { createClient } from '@supabase/supabase-js'

/**
 * Singleton Supabase klient so správnymi server-side nastaveniami.
 * Používa service role key – importovať IBA v server-side kóde (API routy, Server Components).
 * NIKDY neimportovať v "use client" komponentoch.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
