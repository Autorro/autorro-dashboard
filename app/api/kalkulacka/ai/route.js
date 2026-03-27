import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const fmt = v => v != null && v > 0 ? v.toLocaleString('sk-SK') + ' €' : '—'
const fmtKm = v => v != null && v > 0 ? v.toLocaleString('sk-SK') + ' km' : '—'

export async function POST(request) {
  try {
    const { input, recommended, market, comparable, generation, history } = await request.json()

    if (!input?.model) {
      return new Response('Chýba model', { status: 400 })
    }

    // Zostav kontext pre Claude
    const carDesc = [
      input.brandName, input.model,
      input.rok ? input.rok : null,
      input.km ? fmtKm(input.km) : null,
      input.palivo || null,
      input.prevodovka || null,
      input.pohonLabel || null,
      input.vykon ? `${input.vykon} kW` : null,
    ].filter(Boolean).join(', ')

    const marketLines = market?.listings?.slice(0, 8).map(l =>
      `  - ${l.title} (${l.rok || '?'}, ${fmtKm(l.km)}, ${l.vykon ? l.vykon + ' kW' : '?'}, ${l.palivo || '?'}) → ${fmt(l.price)}`
    ).join('\n') || '  Žiadne trhové dáta'

    const histLines = comparable?.slice(0, 5).map(d =>
      `  - ${d.title} (${d.evidencia || d.wonDate}, ${fmtKm(d.km)}) → predané za ${fmt(d.predanZa)}, výkup ${fmt(d.vykupZa)}`
    ).join('\n') || '  Žiadne historické dáta'

    const systemPrompt = `Si expert na oceňovanie ojazdených vozidiel na slovenskom trhu. Pracuješ pre autobazár Autorro.
Odpovedáš výhradne po slovensky. Buď konkrétny, stručný a praktický. Formátuj odpoveď prehľadne.`

    const userMsg = `Oceňujem vozidlo: **${carDesc}**
${generation ? `Generácia: ${generation.name} (${generation.fromYear}–${generation.toYear})` : ''}

**Odporúčané ceny (algoritmus):**
- Predajná: ${fmt(recommended?.predaj)}
- Výkupná: ${fmt(recommended?.vykup)}
- Zdroj: ${recommended?.source === 'market' ? 'aktuálny trh autobazar.eu' : 'história Autorro'}

**Aktuálny trh (autobazar.eu) — podobné vozidlá:**
${marketLines}
${market?.listings?.length ? `Celkom ${market.listings.length} inzerátov, medián ${fmt(market.filteredStats?.median || market.stats?.median)}` : ''}

**História predajov Autorro (posledných 18 mesiacov):**
${histLines}
${history?.predaj ? `Priemerný predaj: ${fmt(history.predaj.median)} (${history.predaj.n} predajov)` : ''}
${history?.vykup ? `Priemerný výkup: ${fmt(history.vykup.median)} (${history.vykup.n} výkupov)` : ''}

Na základe týchto dát:
1. Zhodnoť odporúčané ceny — sú realistické?
2. Daj konkrétne odporúčanie na predajnú a výkupnú cenu
3. Upozorni na rizikové faktory alebo špeciality tohto vozidla
4. Navrhni cenovú stratégiu (napr. ako rýchlo predať, kde je priestor na rokovanie)

Buď stručný — max 300 slov.`

    const stream = await client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }],
    })

    // Streamuj odpoveď priamo klientovi
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
        } catch (e) {
          console.error('[ai stream]', e)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('[kalkulacka/ai POST]', err)
    return new Response('Chyba servera', { status: 500 })
  }
}
