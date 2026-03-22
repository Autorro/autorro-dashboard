/**
 * Zdieľané konštanty pre server-side aj client-side použitie.
 * Jedna definícia eliminuje duplicitu naprieč všetkými modulmi.
 */

export const INZEROVANE_STAGES = [13, 31, 34, 22]

export const EXCLUDE = [
  'Development', 'Tomáš Martiš', 'Miroslav Hrehor', 'Peter Hudec', 'Jaroslav Kováč',
]

// Pipedrive field keys
export const CENA_KEY     = '880011fdbacbc3eee50103ec49001ac8abd56ae1' // Cena je OK (enum, 100 = áno)
export const ODP_AUTORRO  = 'b4d54b0e06789b713abe1062178c19490259e00a' // Odporúčaná cena – AUTORRO
export const CENA_VOZIDLA = '7bc01b48cc10642c58f19ce14bb33fe8abb7bb97' // Cena vozidla
