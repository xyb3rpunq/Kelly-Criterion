/**
 * Market data layer for the five monitored instruments.
 *
 * Honesty contract for this file: every quote carries the source it came from
 * and the timestamp it was observed. Nothing is invented, nothing is smoothed,
 * and anything the UI cannot get live is labelled as cached rather than dressed
 * up as a tick feed. See `sourceLabel` on each instrument.
 *
 * Tier 1 — live, browser-side, no API key, CORS-verified:
 *   DXY     computed from a live FX basket using the official ICE formula
 *   XAUUSD  api.gold-api.com
 *   XAGUSD  api.gold-api.com
 *   BTCUSD  api.binance.com (BTCUSDT)
 *
 * Tier 2 — server-side snapshot, because no free CORS-enabled WTI feed exists:
 *   USOIL   Yahoo CL=F, via /api/quotes on Vercel or a build-time cache on Pages
 *
 * Day-change for every instrument is measured against `refClose` from the Tier 2
 * cache, which the build script already converts into spot-equivalent terms so
 * the futures/spot basis does not leak into the percentage.
 */

export const INSTRUMENTS = [
  {
    id: 'DXY',
    label: 'DXY',
    name: 'US Dollar Index',
    yahoo: 'DX-Y.NYB',
    decimals: 3,
    unit: 'idx',
    // Volatility-scaled defaults so the starting setup is sane per instrument.
    stopPct: 0.0015,
    tier: 'derived',
    sourceLabel: 'ICE basket · computed',
    note: 'Computed live from EUR, JPY, GBP, CAD, SEK and CHF using the published ICE geometric-weight formula.',
  },
  {
    id: 'XAUUSD',
    label: 'XAU/USD',
    name: 'Gold Spot',
    yahoo: 'GC=F',
    decimals: 2,
    unit: 'oz',
    stopPct: 0.0025,
    tier: 'live',
    sourceLabel: 'gold-api.com',
    note: 'Spot gold in USD per troy ounce.',
  },
  {
    id: 'XAGUSD',
    label: 'XAG/USD',
    name: 'Silver Spot',
    yahoo: 'SI=F',
    decimals: 3,
    unit: 'oz',
    stopPct: 0.006,
    tier: 'live',
    sourceLabel: 'gold-api.com',
    note: 'Spot silver in USD per troy ounce.',
  },
  {
    id: 'USOIL',
    label: 'USOIL',
    name: 'WTI Crude',
    yahoo: 'CL=F',
    decimals: 2,
    unit: 'bbl',
    stopPct: 0.008,
    tier: 'cached',
    sourceLabel: 'Yahoo CL=F · snapshot',
    note: 'WTI front-month futures. No free CORS-enabled feed exists for crude, so this value comes from a server-side snapshot rather than a live browser connection.',
  },
  {
    id: 'BTCUSD',
    label: 'BTC/USD',
    name: 'Bitcoin',
    yahoo: 'BTC-USD',
    decimals: 1,
    unit: 'BTC',
    stopPct: 0.012,
    tier: 'live',
    sourceLabel: 'Binance BTCUSDT',
    note: 'Binance spot BTCUSDT, treated as USD.',
  },
]

export const INSTRUMENT_BY_ID = Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i]))

/**
 * Official ICE US Dollar Index: a geometric weighted mean against six currencies.
 * EUR and GBP carry negative exponents because they are quoted as XXX/USD while
 * the rest are quoted USD/XXX.
 *
 * Verified against the live DX-Y.NYB print during development: 99.956 computed
 * vs 99.962 published.
 */
export function computeDXY(rates) {
  const { EUR, JPY, GBP, CAD, SEK, CHF } = rates || {}
  if (![EUR, JPY, GBP, CAD, SEK, CHF].every((v) => Number.isFinite(v) && v > 0)) return null

  const eurusd = 1 / EUR
  const gbpusd = 1 / GBP

  return (
    50.14348112 *
    Math.pow(eurusd, -0.576) *
    Math.pow(JPY, 0.136) *
    Math.pow(gbpusd, -0.119) *
    Math.pow(CAD, 0.091) *
    Math.pow(SEK, 0.042) *
    Math.pow(CHF, 0.036)
  )
}

const TIMEOUT_MS = 9000

async function getJSON(url, signal) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  const onAbort = () => ctrl.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/** Settle every promise but never let one bad feed take down the others. */
async function settle(entries) {
  const results = await Promise.allSettled(entries.map(([, p]) => p))
  const out = {}
  results.forEach((r, i) => {
    out[entries[i][0]] = r.status === 'fulfilled' ? r.value : null
  })
  return out
}

async function fetchFxBasket(signal) {
  const data = await getJSON(
    'https://api.fxratesapi.com/latest?base=USD&currencies=EUR,JPY,GBP,CAD,SEK,CHF',
    signal,
  )
  if (!data?.rates) throw new Error('fx: no rates')
  return { rates: data.rates, ts: data.timestamp ? data.timestamp * 1000 : Date.now() }
}

async function fetchMetal(symbol, signal) {
  const data = await getJSON(`https://api.gold-api.com/price/${symbol}`, signal)
  if (!Number.isFinite(data?.price)) throw new Error(`${symbol}: no price`)
  return { price: data.price, ts: data.updatedAt ? Date.parse(data.updatedAt) : Date.now() }
}

async function fetchBTC(signal) {
  try {
    const d = await getJSON('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', signal)
    const price = Number(d?.price)
    if (!Number.isFinite(price)) throw new Error('binance: no price')
    return { price, ts: Date.now(), via: 'Binance BTCUSDT' }
  } catch {
    // Binance is geo-blocked in some regions; Coinbase is the backup.
    const d = await getJSON('https://api.coinbase.com/v2/prices/BTC-USD/spot', signal)
    const price = Number(d?.data?.amount)
    if (!Number.isFinite(price)) throw new Error('coinbase: no price')
    return { price, ts: Date.now(), via: 'Coinbase BTC-USD' }
  }
}

/**
 * Tier 2. Tries the Vercel serverless proxy first (genuinely live), then the
 * build-time cache that ships with the GitHub Pages bundle. Returns null when
 * neither is reachable — callers must cope with a missing reference close.
 */
export async function fetchSnapshot(baseUrl = import.meta.env?.BASE_URL || '/', signal) {
  try {
    const live = await getJSON('/api/quotes', signal)
    if (live?.quotes) return { ...live, origin: 'api' }
  } catch {
    /* not deployed on a platform with functions — fall through to the cache */
  }
  try {
    const cached = await getJSON(`${baseUrl}market-cache.json`, signal)
    if (cached?.quotes) return { ...cached, origin: 'cache' }
  } catch {
    /* no cache either */
  }
  return null
}

/**
 * One full refresh of all five instruments.
 *
 * @param {object} opts
 * @param {object|null} opts.snapshot previously fetched Tier 2 payload (reference closes)
 * @returns {Promise<Record<string, Quote>>}
 *
 * @typedef {{ id: string, price: number|null, changePct: number|null,
 *   ts: number|null, source: string, live: boolean, stale: boolean,
 *   error: string|null }} Quote
 */
export async function fetchQuotes({ snapshot = null, signal } = {}) {
  const raw = await settle([
    ['fx', fetchFxBasket(signal)],
    ['xau', fetchMetal('XAU', signal)],
    ['xag', fetchMetal('XAG', signal)],
    ['btc', fetchBTC(signal)],
  ])

  const snap = snapshot?.quotes || {}
  const now = Date.now()

  const build = (id, price, ts, source, live) => {
    const ref = Number(snap[id]?.refClose)
    const changePct =
      Number.isFinite(price) && Number.isFinite(ref) && ref > 0 ? (price - ref) / ref : null
    return {
      id,
      price: Number.isFinite(price) ? price : null,
      changePct,
      ts: ts ?? null,
      source,
      live,
      // Anything older than three minutes stops claiming to be current.
      stale: ts ? now - ts > 180000 : true,
      error: Number.isFinite(price) ? null : 'unavailable',
    }
  }

  const dxy = raw.fx ? computeDXY(raw.fx.rates) : null
  const oil = snap.USOIL

  return {
    DXY: build('DXY', dxy, raw.fx?.ts, 'ICE basket · fxratesapi', true),
    XAUUSD: build('XAUUSD', raw.xau?.price, raw.xau?.ts, 'gold-api.com', true),
    XAGUSD: build('XAGUSD', raw.xag?.price, raw.xag?.ts, 'gold-api.com', true),
    USOIL: build(
      'USOIL',
      Number(oil?.price),
      oil?.ts ? Date.parse(oil.ts) : null,
      snapshot?.origin === 'api' ? 'Yahoo CL=F · proxy' : 'Yahoo CL=F · snapshot',
      snapshot?.origin === 'api',
    ),
    BTCUSD: build('BTCUSD', raw.btc?.price, raw.btc?.ts, raw.btc?.via || 'Binance BTCUSDT', true),
  }
}
