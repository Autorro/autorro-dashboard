/**
 * Global SWR konfigurácia pre dashboard app.
 *
 * Stratégia:
 *  - Cache pretrváva v localStorage pod kľúčom `autorro-swr-cache-v1` → po
 *    zatvorení tabu/reloade sa dáta okamžite ukážu z pamäte a na pozadí sa
 *    spustí tichý refetch (stale-while-revalidate).
 *  - Automatický refresh každých 10 min (`refreshInterval`).
 *  - Dedupe 60 s — ak viac komponentov chce ten istý endpoint v priebehu
 *    minúty, spustí sa len 1 fetch.
 *  - Revalidate on focus — keď sa vrátiš na tab, dáta sa obnovia.
 *  - Persistuje sa len JSON GET endpoint `/api/*`; ostatné kľúče sa preskočia.
 */

const CACHE_KEY    = 'autorro-swr-cache-v1'
const MAX_CACHE_MB = 4  // localStorage limit ~5 MB, necháme rezervu
const TEN_MIN_MS   = 10 * 60 * 1000
const ONE_MIN_MS   = 60 * 1000

export const defaultFetcher = async (url) => {
  const res = await fetch(url)
  if (!res.ok) {
    const err = new Error(`Fetch failed: ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

/**
 * Provider pre SWR — Map napojená na localStorage. Volá sa raz pri mountnutí
 * SWRConfigu. Treba zavolať až v prehliadači (kontroluje typeof window).
 */
export function createLocalStorageProvider() {
  if (typeof window === 'undefined') return () => new Map()

  return () => {
    let map = new Map()
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) map = new Map(parsed)
      }
    } catch {
      // corrupt cache → začni od nuly
    }

    // Pred zatvorením tabu / reloadom zapíš späť
    const save = () => {
      try {
        // Ulož iba GET endpointy `/api/*`, ostatné kľúče preskoč. Chráni to
        // pred zbytočným rastom (napr. loader stavy, chyby, interné kľúče).
        const entries = []
        for (const [key, value] of map.entries()) {
          if (typeof key !== 'string') continue
          if (!key.startsWith('/api/')) continue
          // SWR ukladá pod kľúč objekt { data, error, isValidating, ... };
          // error objekty nepersistuj, kazilo by to refetch.
          if (value && typeof value === 'object' && 'data' in value) {
            entries.push([key, { data: value.data }])
          }
        }
        const serialized = JSON.stringify(entries)
        // Pri prekročení limitu zmaž cache — pri ďalšom návrate len fetchne nanovo
        if (serialized.length > MAX_CACHE_MB * 1024 * 1024) {
          localStorage.removeItem(CACHE_KEY)
        } else {
          localStorage.setItem(CACHE_KEY, serialized)
        }
      } catch {
        // quota exceeded alebo private mode → ignore
      }
    }

    window.addEventListener('beforeunload', save)
    window.addEventListener('pagehide',     save)
    // Uloženie aj keď používateľ prepne tab (iOS Safari nevolá beforeunload)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') save()
    })

    return map
  }
}

export const swrDefaults = {
  fetcher:              defaultFetcher,
  refreshInterval:      TEN_MIN_MS,
  dedupingInterval:     ONE_MIN_MS,
  revalidateOnFocus:    true,
  revalidateOnReconnect: true,
  keepPreviousData:     true,   // pri preklikoch drž starú odpoveď kým nepríde nová
  errorRetryCount:      2,
}

export const SWR_CACHE_KEY = CACHE_KEY
