"use client";
import { useState } from 'react'
import { useSWRConfig } from 'swr'

/**
 * „Obnoviť" tlačidlo — vyvolá revalidáciu všetkých SWR kľúčov, ktoré cachuje
 * aktuálna session. Voliteľne pošle `?force=1`, aby sa obišla aj server-side
 * cache (Next route revalidate).
 */
export default function RefreshButton({ onClick, forceServer = true, compact = false }) {
  const { cache, mutate } = useSWRConfig()
  const [spinning, setSpinning] = useState(false)

  async function handleClick() {
    if (spinning) return
    setSpinning(true)
    onClick?.()
    try {
      // 1. Zozbieraj všetky aktívne API kľúče
      const keys = []
      for (const key of cache.keys()) {
        if (typeof key === 'string' && key.startsWith('/api/')) keys.push(key)
      }

      // 2. Pri force=true spusti server-revalidate (endpointy podporujú ?force=1)
      if (forceServer) {
        await Promise.allSettled(
          keys.map(k => fetch(k + (k.includes('?') ? '&' : '?') + 'force=1', { cache: 'no-store' }))
        )
      }

      // 3. Mutate cez SWR — stiahne znova a prepíše UI
      await Promise.allSettled(keys.map(k => mutate(k)))
    } finally {
      // Krátka pauza aby animácia bola viditeľná aj pri veľmi rýchlom refreshi
      setTimeout(() => setSpinning(false), 400)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={spinning}
      className={
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#F7F6F4] hover:bg-[#5c1a42] hover:text-white transition-colors w-full disabled:opacity-60"
      }
      title="Obnoviť dáta (aj server cache)"
    >
      <span className={`text-lg w-6 text-center ${spinning ? 'animate-spin' : ''}`}>
        🔄
      </span>
      {!compact && <span>{spinning ? 'Obnovujem…' : 'Obnoviť dáta'}</span>}
    </button>
  )
}
