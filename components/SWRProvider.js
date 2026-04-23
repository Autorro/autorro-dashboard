"use client";
import { SWRConfig } from 'swr'
import { createLocalStorageProvider, swrDefaults } from '@/lib/swr-config'

/**
 * Klientský wrapper — spustí localStorage provider až v prehliadači.
 * Server-render dostane prázdny Map (žiadna persistentná cache na serveri).
 */
export default function SWRProvider({ children }) {
  return (
    <SWRConfig value={{ ...swrDefaults, provider: createLocalStorageProvider() }}>
      {children}
    </SWRConfig>
  )
}
