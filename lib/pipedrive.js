/**
 * Zdieľané utility pre Pipedrive API.
 * Importovať IBA v server-side kóde.
 */

/**
 * Načíta všetky stránky z Pipedrive paginovaného endpointu.
 * baseUrl musí obsahovať všetky parametre okrem &start=
 */
export async function fetchAllPages(baseUrl) {
  const all = []
  let start = 0
  while (true) {
    const res  = await fetch(`${baseUrl}&start=${start}`, { cache: 'no-store' })
    const json = await res.json()
    all.push(...(json.data || []))
    if (!json.additional_data?.pagination?.more_items_in_collection) break
    start = json.additional_data.pagination.next_start
  }
  return all
}

/**
 * Továreň na in-memory cache s TTL.
 * Každý API modul si vytvorí vlastnú inštanciu: const cache = createCache(TTL_MS)
 */
export function createCache(ttl) {
  let data      = null
  let timestamp = 0
  return {
    /** Vráti cached dáta alebo null pri cache miss. */
    get(force = false) {
      if (!force && data !== null && Date.now() - timestamp < ttl) return data
      return null
    },
    /** Uloží dáta do cache. */
    set(newData) {
      data      = newData
      timestamp = Date.now()
    },
    /** Vek cache v sekundách. */
    age() {
      return Math.round((Date.now() - timestamp) / 1000)
    },
  }
}
