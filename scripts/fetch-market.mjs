/**
 * Build-time market snapshot.
 *
 * Produces `public/market-cache.json`, which ships inside the GitHub Pages
 * bundle. It exists for two reasons:
 *
 *  1. USOIL has no free CORS-enabled feed, so crude can only be fetched
 *     server-side. This is the only path by which the static build gets it.
 *  2. Every instrument needs a reference previous close to compute a day
 *     change against. Yahoo provides that; the browser-side feeds do not.
 *
 * For gold and silver the Yahoo symbols are futures (GC=F / SI=F) while the
 * browser reads spot. Carrying the futures close straight over would bake the
 * basis — roughly 1.3% on gold — into every day-change figure, so the previous
 * close is rescaled into spot-equivalent terms before it is written out.
 *
 * The script never throws: a failed fetch writes a null entry so the site still
 * builds and simply reports that instrument as unavailable.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../public/market-cache.json')

const UA = 'Mozilla/5.0 (compatible; kelly-terminal/1.0; +https://github.com/xyb3rpunq/Kelly-Criterion)'

const SYMBOLS = [
  { id: 'DXY', yahoo: 'DX-Y.NYB', spot: null },
  { id: 'XAUUSD', yahoo: 'GC=F', spot: 'XAU' },
  { id: 'XAGUSD', yahoo: 'SI=F', spot: 'XAG' },
  { id: 'USOIL', yahoo: 'CL=F', spot: null },
  { id: 'BTCUSD', yahoo: 'BTC-USD', spot: null },
]

async function getJSON(url, timeoutMs = 15000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** Last two *valid* daily closes — Yahoo pads the series with nulls on holidays. */
async function fetchYahooDaily(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?interval=1d&range=10d`
  const data = await getJSON(url)
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error(`no result for ${symbol}`)

  const closes = (result.indicators?.quote?.[0]?.close || []).filter((v) => Number.isFinite(v))
  if (closes.length < 2) throw new Error(`insufficient closes for ${symbol}`)

  const price = Number.isFinite(result.meta?.regularMarketPrice)
    ? result.meta.regularMarketPrice
    : closes[closes.length - 1]

  return {
    price,
    lastClose: closes[closes.length - 1],
    prevClose: closes[closes.length - 2],
    ts: result.meta?.regularMarketTime
      ? new Date(result.meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString(),
  }
}

async function fetchSpot(symbol) {
  const d = await getJSON(`https://api.gold-api.com/price/${symbol}`, 10000)
  return Number.isFinite(d?.price) ? d.price : null
}

async function main() {
  const quotes = {}
  const errors = []

  for (const { id, yahoo, spot } of SYMBOLS) {
    try {
      const y = await fetchYahooDaily(yahoo)
      let refClose = y.prevClose
      let basis = 1
      let price = y.price

      if (spot) {
        const live = await fetchSpot(spot).catch(() => null)
        if (live && y.lastClose > 0) {
          // Rescale the futures close into spot terms so the day change is clean.
          basis = live / y.lastClose
          refClose = y.prevClose * basis
          price = live
        }
      }

      quotes[id] = {
        price: Number(price.toFixed(6)),
        refClose: Number(refClose.toFixed(6)),
        basis: Number(basis.toFixed(6)),
        yahoo,
        ts: y.ts,
      }
      console.log(
        `  ${id.padEnd(7)} price=${quotes[id].price}  ref=${quotes[id].refClose}` +
          (basis !== 1 ? `  basis=${quotes[id].basis}` : ''),
      )
    } catch (err) {
      quotes[id] = null
      errors.push(`${id}: ${err.message}`)
      console.warn(`  ${id.padEnd(7)} FAILED — ${err.message}`)
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    note: 'Server-side snapshot taken at build time. Reference closes are spot-adjusted for metals.',
    errors,
    quotes,
  }

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`\nWrote ${OUT}`)
  if (errors.length) console.warn(`Completed with ${errors.length} failed symbol(s).`)
}

console.log('Fetching market snapshot…')
main().catch((err) => {
  // Never fail the build over a data provider being down.
  console.error('Snapshot failed entirely:', err.message)
  process.exit(0)
})
