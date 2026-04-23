/**
 * Zdieľané konštanty pre server-side aj client-side použitie.
 * Jedna definícia eliminuje duplicitu naprieč všetkými modulmi.
 */

// ── Pipedrive: pipeline stages ──────────────────────────────────────────────
export const INZEROVANE_STAGES = [13, 31, 34, 22]

// ── Pipedrive field keys ────────────────────────────────────────────────────
// Cenové polia
export const CENA_KEY         = '880011fdbacbc3eee50103ec49001ac8abd56ae1' // Cena je OK (enum, 100 = áno)
export const ODP_AUTORRO      = 'b4d54b0e06789b713abe1062178c19490259e00a' // Odporúčaná cena – AUTORRO
export const CENA_VOZIDLA     = '7bc01b48cc10642c58f19ce14bb33fe8abb7bb97' // Cena vozidla
// Inzercia
export const AUTOBAZAR_URL_KEY = '8ad28e02d445f11af2064ed71aab1aa1906db534' // Autobazar.eu / Sauto.sk
export const AUTORRO_URL_KEY   = '65230483051b78019de87ebe7ca1b8380b3e85b2' // Autorro.sk / Autorro.cz
export const INZEROVANE_OD_KEY = '3f9740a67e24bf1c3f3e65360abc0673bb07a4a8' // Dátum, od kedy je auto inzerované
// Značka vozidla
export const ZNACKA_KEY        = 'c5d33ca43498a4e3e0e90dc8e1cfa3944107290d' // Značka vozidla (enum)
// Leady (callcentrum / wasItLead)
export const WASITLEAD_KEY     = '75d70860fca1d25d8ed8ac4c533979b62d93e1f6' // "Bol to lead?" (enum)
export const WASITLEAD_YES     = '805'                                      // enum option ID pre "áno"
export const NAVOLALA_KEY      = '03fcbb91323260625766779aee5b4589498069b4' // Kto lead navolal (enum, telefonisti)

// ── Agregácie: vylúčené mená (centrála, vedenie, test účty) ─────────────────
export const EXCLUDE = [
  'Development', 'Tomáš Martiš', 'Miroslav Hrehor', 'Peter Hudec', 'Jaroslav Kováč',
]

// ── Kancelárie → makléri ────────────────────────────────────────────────────
// Obsahuje rôzne diakritické/pravopisné varianty mien, ako sa vyskytujú
// v Pipedrive dátach (owner_name).
export const OFFICES = {
  BB: ['Dominika Kompaniková', 'Dominka Kompaníková', 'Milan Kováč', 'Andrej Čík', 'Tomáš Urbán', 'Tomás Urban', 'Dávid Juhaniak', 'David Juhaniak'],
  TT: ['Bálint Forró', 'Bálint Forro', 'Tomáš Opálek', 'Karolína Lisická', 'Martin Blažek', 'Lukáš Krommel'],
  NR: ['Martin Petráš', 'Dávid Kalužák', 'David Kalužák', 'Daniel Kádek', 'Gabriela Šodorová', 'Dávid Čintala'],
  BA: ['Milan Švorc', 'Ján Mikuš', 'Richard Kiss', 'Karin Harvan', 'Matej Hromada', 'Milan Pulc', 'Martin Bošeľa', 'Peter Maťo', 'Jonathán Pavelka', 'Matej Klačko', 'Dominik Ďurčo'],
  TN: ['Libor Koníček', 'Tomáš Otrubný', 'Ján Skovajsa', 'Tomáš Kučerka', 'Patrik Frič'],
  PD: ['Peter Mjartan', 'Martin Mečiar'],
  ZA: ['Tomáš Smieško', 'Daniel Jašek', 'Vladko Hess', 'Wlodzimierz Hess', 'Irena Varadová', 'Matej Gažo', 'Veronika Maťková', 'Tomáš Ďurana'],
  PP: ['Sebastián Čuban', 'Tomáš Matta'],
  KE: ['Ján Tej', 'Adrián Šomšág', 'Viliam Baran', 'Jaroslav Hažlinský', 'Martin Živčák', 'Ján Slivka'],
}

// Variant pre UI filtre, kde "Všetky" je prvá voľba.
export const OFFICES_WITH_ALL = { 'Všetky': null, ...OFFICES }

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Lower-case + strip diakritiku. Používať na porovnávanie mien. */
export function norm(s) {
  return (s || '').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

/** Zistí kanceláriu pre meno maklera. Vracia kľúč ('BB'...) alebo null. */
export function getOffice(name) {
  if (!name) return null
  const n = norm(name)
  for (const [office, names] of Object.entries(OFFICES)) {
    if (names.some(x => norm(x) === n)) return office
  }
  return null
}
