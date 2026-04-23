// Custom Supabase storage adapter ktorý session ukladá do cookie s
// `domain=.autorro.sk`, takže je zdieľaná medzi všetkými subdoménami
// (app, checklist, support, dashboard). LocalStorage sa nedá zdieľať
// cross-subdomain.
//
// Hodnota sa chunkuje po 3500 znakoch (cookie limit ~4KB) do .0 .1 .2…
// pretože plný Supabase session (access + refresh + user) môže mať >4KB.
//
// V dev (localhost) domain atribút vynecháme — prehliadač by ho aj tak ignoroval.

const MAX_CHUNK = 3500
const ONE_YEAR = 60 * 60 * 24 * 365

function isProdHost() {
  return typeof window !== 'undefined' && window.location.hostname.endsWith('.autorro.sk')
}

function writeCookie(name, value) {
  if (typeof document === 'undefined') return
  const base = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`
  const full = isProdHost() ? `${base}; domain=.autorro.sk; Secure` : base
  document.cookie = full
}

function deleteCookie(name) {
  if (typeof document === 'undefined') return
  const base = `${name}=; path=/; max-age=0`
  const full = isProdHost() ? `${base}; domain=.autorro.sk` : base
  document.cookie = full
  // Zmaž aj variant bez domain (pre prípad migrácie zo staršieho storage-u)
  document.cookie = `${name}=; path=/; max-age=0`
}

function readCookie(name) {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie ? document.cookie.split('; ') : []
  for (const c of cookies) {
    const eq = c.indexOf('=')
    if (eq === -1) continue
    const k = c.slice(0, eq)
    if (k === name) return decodeURIComponent(c.slice(eq + 1))
  }
  return null
}

// Collect všetky chunk cookies (.0, .1, …) pre daný kľúč
function listChunkNames(baseKey) {
  if (typeof document === 'undefined') return []
  const cookies = document.cookie ? document.cookie.split('; ') : []
  const prefix = baseKey + '.'
  const names = []
  for (const c of cookies) {
    const eq = c.indexOf('=')
    if (eq === -1) continue
    const k = c.slice(0, eq)
    if (k.startsWith(prefix) && /^\d+$/.test(k.slice(prefix.length))) names.push(k)
  }
  return names
}

export const cookieStorage = {
  getItem(key) {
    // 1) Skús single-cookie variant
    const single = readCookie(key)
    if (single !== null && single !== '') return single

    // 2) Zlož chunked variant .0 .1 .2 …
    const chunkNames = listChunkNames(key).sort((a, b) => {
      const ai = parseInt(a.slice(key.length + 1), 10)
      const bi = parseInt(b.slice(key.length + 1), 10)
      return ai - bi
    })
    if (chunkNames.length === 0) return null
    let combined = ''
    for (const n of chunkNames) {
      const part = readCookie(n)
      if (part === null) return null
      combined += part
    }
    return combined || null
  },

  setItem(key, value) {
    // Vyčisti staré chunky
    for (const n of listChunkNames(key)) deleteCookie(n)

    if (value.length <= MAX_CHUNK) {
      writeCookie(key, value)
      // Pre istotu zmaž aj .0 variant ak nejaký ostal
      deleteCookie(key + '.0')
      return
    }

    // Chunked write — zmaž single-key variant
    deleteCookie(key)
    let i = 0
    for (let start = 0; start < value.length; start += MAX_CHUNK, i++) {
      writeCookie(`${key}.${i}`, value.slice(start, start + MAX_CHUNK))
    }
  },

  removeItem(key) {
    deleteCookie(key)
    for (const n of listChunkNames(key)) deleteCookie(n)
  },
}
