/**
 * Serverová cache cez Next.js unstable_cache (Vercel Data Cache).
 * Cachuje výsledky asynchrónnych funkcií — perzistentné naprieč serverless
 * instancemi, bezplatné, nulová externá infraštruktúra.
 */

import { unstable_cache } from 'next/cache'

/**
 * Obalí asynchrónnu funkciu do Vercel Data Cache.
 * @param {Function} fn        - async funkcia vracajúca dáta
 * @param {string}   key       - unikátny kľúč pre túto cache entry
 * @param {number}   ttl       - životnosť v sekundách (default 5 min)
 * @param {string[]} extraTags - extra tagy pre ručnú invalidáciu
 */
export function cache(fn, key, ttl = 300, extraTags = []) {
  return unstable_cache(fn, [key], {
    revalidate: ttl,
    tags:       [key, 'all', ...extraTags],
  })
}
