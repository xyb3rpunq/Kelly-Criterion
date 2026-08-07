/**
 * Vercel serverless proxy for the instruments the browser cannot reach directly.
 *
 * Yahoo Finance serves quotes happily but sends no CORS headers, so a static
 * page cannot call it. Running the same request from a function removes that
 * restriction and makes USOIL genuinely live rather than a build-time snapshot.
 *
 * On GitHub Pages this route does not exist; the client detects the 404 and
 * falls back to `market-cache.json`. Same shape either way.
 */

const UA = 'Mozilla/5.0 (compatible; kelly-terminal/1.0)'

const SYMBOLS = [
  { id: 'DXY', yahoo: 'DX-Y.NYB', spot: null },
  { id: 'XAUUSD', yahoo: 'GC=F', spot: 'XAU' },
  { id: 'XAGUSD', yahoo: 'SI=F', spot: 'XAG' },
  { id: 'USOIL', yahoo: 'CL=F', spot: null },
  { id: 'BTCUSD', yahoo: 'BTC-USD', spot: null },
]

async function getJSON(url, timeoutMs = 8000) {
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

async function fetchOne({ id, yahoo, spot }) {
  const data = await getJSON(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&range=10d`,
  )
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error(`no data for ${yahoo}`)

  const closes = (result.indicators?.quote?.[0]?.close || []).filter((v) => Number.isFinite(v))
  if (closes.length < 2) throw new Error(`insufficient history for ${yahoo}`)

  const lastClose = closes[closes.length - 1]
  let price = Number.isFinite(result.meta?.regularMarketPrice)
    ? result.meta.regularMarketPrice
    : lastClose
  let refClose = closes[closes.length - 2]
  let basis = 1

  if (spot) {
    // Rescale the futures close into spot terms — see scripts/fetch-market.mjs.
    const s = await getJSON(`https://api.gold-api.com/price/${spot}`, 6000).catch(() => null)
    if (Number.isFinite(s?.price) && lastClose > 0) {
      basis = s.price / lastClose
      refClose *= basis
      price = s.price
    }
  }

  return [
    id,
    {
      price: Number(price.toFixed(6)),
      refClose: Number(refClose.toFixed(6)),
      basis: Number(basis.toFixed(6)),
      yahoo,
      ts: result.meta?.regularMarketTime
        ? new Date(result.meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString(),
    },
  ]
}

export default async function handler(req, res) {
  const settled = await Promise.allSettled(SYMBOLS.map(fetchOne))

  const quotes = {}
  const errors = []
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      quotes[r.value[0]] = r.value[1]
    } else {
      quotes[SYMBOLS[i].id] = null
      errors.push(`${SYMBOLS[i].id}: ${r.reason?.message || 'failed'}`)
    }
  })

  // 60s edge cache: enough to absorb a burst of visitors without going stale.
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.status(200).json({
    generatedAt: new Date().toISOString(),
    note: 'Live server-side proxy (Vercel function).',
    errors,
    quotes,
  })
}
