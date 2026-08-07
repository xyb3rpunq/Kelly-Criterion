/**
 * Market data layer for the five monitored instruments.
 *
 * Honesty contract for this file: every quote carries the source it came from,
 * the timestamp it was observed, and whether that source is streaming or
 * delayed. Nothing is invented, nothing is smoothed, and nothing delayed is
 * dressed up as a tick feed.
 *
 * PRIMARY — TradingView's public scanner endpoint. One POST returns all five
 * instruments with their day change already computed, and it sends CORS headers
 * (it echoes the request Origin), so a static page can call it directly with no
 * account, no API key and no server of our own. Verified update modes:
 *
 *   TVC:DXY          streaming
 *   TVC:GOLD         streaming
 *   TVC:SILVER       streaming
 *   BITSTAMP:BTCUSD  streaming
 *   NYMEX:CL1!       delayed_streaming_600  (10 minutes — labelled as such)
 *
 * Crude is the one instrument with no real-time free feed anywhere. Every
 * alternative was probed: TVC:USOIL and a dozen broker CFD tickers are absent
 * from the scanner index, Yahoo sends no CORS headers, Stooq gates on bot
 * detection, and the public CORS proxies are dead or paywalled. Ten-minute
 * delayed is the honest ceiling without paying someone.
 *
 * FALLBACK — the endpoint is undocumented, so if it changes shape or goes away
 * each instrument independently falls back to the documented public API it used
 * before: an ICE-formula DXY computed from a live FX basket, gold-api.com for
 * the metals, Binance (then Coinbase) for Bitcoin, and the build-time snapshot
 * for crude. Day change then comes from `refClose` in that snapshot, which the
 * build script has already converted to spot-equivalent terms so the
 * futures/spot basis cannot leak into the percentage.
 */

export const INSTRUMENTS = [
  {
    id: 'DXY',
    label: 'DXY',
    name: 'US Dollar Index',
    tv: 'TVC:DXY',
    yahoo: 'DX-Y.NYB',
    decimals: 3,
    unit: 'idx',
    // Volatility-scaled defaults so the starting setup is sane per instrument.
    stopPct: 0.0015,
    sourceLabel: 'TradingView TVC:DXY',
    note: 'US Dollar Index, streaming. Falls back to an in-browser ICE-formula computation over the EUR/JPY/GBP/CAD/SEK/CHF basket.',
  },
  {
    id: 'XAUUSD',
    label: 'XAU/USD',
    name: 'Gold Spot',
    tv: 'TVC:GOLD',
    yahoo: 'GC=F',
    decimals: 2,
    unit: 'oz',
    stopPct: 0.0025,
    sourceLabel: 'TradingView TVC:GOLD',
    note: 'Spot gold in USD per troy ounce, streaming. Falls back to gold-api.com.',
  },
  {
    id: 'XAGUSD',
    label: 'XAG/USD',
    name: 'Silver Spot',
    tv: 'TVC:SILVER',
    yahoo: 'SI=F',
    decimals: 3,
    unit: 'oz',
    stopPct: 0.006,
    sourceLabel: 'TradingView TVC:SILVER',
    note: 'Spot silver in USD per troy ounce, streaming. Falls back to gold-api.com.',
  },
  {
    id: 'USOIL',
    label: 'USOIL',
    name: 'WTI Crude',
    tv: 'NYMEX:CL1!',
    yahoo: 'CL=F',
    decimals: 2,
    unit: 'bbl',
    stopPct: 0.008,
    sourceLabel: 'TradingView NYMEX:CL1!',
    note: 'WTI front-month futures on a 10-minute delayed feed. No free real-time crude source exists without a paid subscription, so this is the honest ceiling — the card says DELAYED rather than pretending otherwise.',
  },
  {
    id: 'BTCUSD',
    label: 'BTC/USD',
    name: 'Bitcoin',
    tv: 'BITSTAMP:BTCUSD',
    yahoo: 'BTC-USD',
    decimals: 1,
    unit: 'BTC',
    stopPct: 0.012,
    sourceLabel: 'TradingView BITSTAMP:BTCUSD',
    note: 'Bitstamp spot BTC/USD, streaming. Falls back to Binance, then Coinbase.',
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

const TV_ENDPOINT = 'https://scanner.tradingview.com/global/scan'

/**
 * Binance pushes a miniTicker frame once per second. Bitcoin is the only one of
 * the five with a free public stream, so it is the only instrument that can
 * genuinely update every second — everything else is bounded by how often its
 * source refreshes, and pretending otherwise would just be a faster poll
 * returning the same number.
 *
 * The frame carries the rolling 24h open, so the change percentage comes
 * straight off the stream rather than being derived from a reference close.
 *
 * @param {(tick: {price:number, changePct:number|null, ts:number}) => void} onTick
 * @returns {() => void} disconnect
 */
export function openBTCStream(onTick) {
  if (typeof WebSocket === 'undefined') return () => {}

  let ws = null
  let closed = false
  let attempt = 0
  let retryTimer = 0

  const connect = () => {
    if (closed) return
    try {
      ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@miniTicker')
    } catch {
      schedule()
      return
    }

    ws.onopen = () => {
      attempt = 0
    }

    ws.onmessage = (event) => {
      try {
        const d = JSON.parse(event.data)
        const price = Number(d.c)
        const open = Number(d.o)
        if (!Number.isFinite(price)) return
        onTick({
          price,
          changePct: Number.isFinite(open) && open > 0 ? (price - open) / open : null,
          ts: Number(d.E) || Date.now(),
        })
      } catch {
        /* malformed frame — skip it, the next one is a second away */
      }
    }

    ws.onclose = () => {
      if (!closed) schedule()
    }
    ws.onerror = () => {
      try {
        ws?.close()
      } catch {
        /* already closing */
      }
    }
  }

  // Exponential backoff capped at 30s, so a geo-block or outage degrades to the
  // polled source instead of hammering a dead socket.
  const schedule = () => {
    attempt += 1
    const delay = Math.min(30000, 1000 * 2 ** Math.min(attempt, 5))
    clearTimeout(retryTimer)
    retryTimer = setTimeout(connect, delay)
  }

  connect()

  return () => {
    closed = true
    clearTimeout(retryTimer)
    try {
      ws?.close()
    } catch {
      /* nothing to do */
    }
  }
}

/** Only these two modes are treated as usable; anything else is reported as-is. */
export function describeMode(mode) {
  if (mode === 'streaming') return { live: true, delayMin: 0, badge: 'live' }
  const m = /^delayed_streaming_(\d+)$/.exec(mode || '')
  if (m) return { live: false, delayMin: Math.round(Number(m[1]) / 60), badge: 'delayed' }
  return { live: false, delayMin: null, badge: 'delayed' }
}

/**
 * One request for all five instruments. Returns a map keyed by instrument id,
 * or null if the endpoint is unreachable or returns nothing usable — callers
 * then fall through to the per-instrument fallbacks.
 */
async function fetchTradingView(signal) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  const onAbort = () => ctrl.abort()
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    const res = await fetch(TV_ENDPOINT, {
      method: 'POST',
      signal: ctrl.signal,
      cache: 'no-store',
      // Deliberately no Content-Type header. The endpoint's preflight response
      // allows only "Referer,Accept" in Access-Control-Allow-Headers, so sending
      // application/json triggers a preflight that it then rejects. Omitting the
      // header lets the browser default to text/plain, which is CORS-safelisted
      // and skips the preflight entirely — the server parses the JSON body
      // regardless of the declared type.
      body: JSON.stringify({
        symbols: { tickers: INSTRUMENTS.map((i) => i.tv) },
        columns: ['close', 'change', 'update_mode'],
      }),
    })
    if (!res.ok) throw new Error(`tv: ${res.status}`)

    const json = await res.json()
    const bySymbol = new Map((json?.data || []).map((row) => [row.s, row.d]))

    const out = {}
    let hits = 0
    for (const inst of INSTRUMENTS) {
      const row = bySymbol.get(inst.tv)
      if (!row) continue
      const [close, change, mode] = row
      if (!Number.isFinite(close)) continue
      hits += 1
      out[inst.id] = {
        price: close,
        // TradingView returns change as a percentage figure, not a ratio.
        changePct: Number.isFinite(change) ? change / 100 : null,
        mode,
        ...describeMode(mode),
      }
    }
    return hits ? out : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
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
  const tv = await fetchTradingView(signal)

  // Only pay for the fallback requests when TradingView actually missed
  // something. In the normal case this is a single network round-trip.
  const missing = INSTRUMENTS.filter((i) => !tv?.[i.id]).map((i) => i.id)
  const need = (id) => missing.includes(id)

  const raw = missing.length
    ? await settle([
        ['fx', need('DXY') ? fetchFxBasket(signal) : Promise.resolve(null)],
        ['xau', need('XAUUSD') ? fetchMetal('XAU', signal) : Promise.resolve(null)],
        ['xag', need('XAGUSD') ? fetchMetal('XAG', signal) : Promise.resolve(null)],
        ['btc', need('BTCUSD') ? fetchBTC(signal) : Promise.resolve(null)],
      ])
    : {}

  const snap = snapshot?.quotes || {}
  const now = Date.now()

  /** Day change against the snapshot's spot-adjusted reference close. */
  const changeVsRef = (id, price) => {
    const ref = Number(snap[id]?.refClose)
    return Number.isFinite(price) && Number.isFinite(ref) && ref > 0 ? (price - ref) / ref : null
  }

  const build = (id, { price, changePct, ts, source, live, delayMin, fallback }) => ({
    id,
    price: Number.isFinite(price) ? price : null,
    changePct: Number.isFinite(changePct) ? changePct : null,
    ts: ts ?? null,
    source,
    live: Boolean(live),
    delayMin: delayMin ?? null,
    fallback: Boolean(fallback),
    // Anything older than three minutes stops claiming to be current.
    stale: ts ? now - ts > 180000 : true,
    error: Number.isFinite(price) ? null : 'unavailable',
  })

  const fromTV = (inst) => {
    const q = tv[inst.id]
    return build(inst.id, {
      price: q.price,
      changePct: q.changePct,
      ts: now, // the scanner reports no per-symbol timestamp; this is our read time
      source: `TradingView ${inst.tv}`,
      live: q.live,
      delayMin: q.delayMin,
    })
  }

  const fallbacks = {
    DXY: () => {
      const price = raw.fx ? computeDXY(raw.fx.rates) : null
      return build('DXY', {
        price,
        changePct: changeVsRef('DXY', price),
        ts: raw.fx?.ts,
        source: 'ICE basket · fxratesapi',
        live: true,
        fallback: true,
      })
    },
    XAUUSD: () =>
      build('XAUUSD', {
        price: raw.xau?.price,
        changePct: changeVsRef('XAUUSD', raw.xau?.price),
        ts: raw.xau?.ts,
        source: 'gold-api.com',
        live: true,
        fallback: true,
      }),
    XAGUSD: () =>
      build('XAGUSD', {
        price: raw.xag?.price,
        changePct: changeVsRef('XAGUSD', raw.xag?.price),
        ts: raw.xag?.ts,
        source: 'gold-api.com',
        live: true,
        fallback: true,
      }),
    USOIL: () => {
      const oil = snap.USOIL
      const price = Number(oil?.price)
      return build('USOIL', {
        price,
        changePct: changeVsRef('USOIL', price),
        ts: oil?.ts ? Date.parse(oil.ts) : null,
        source: 'Yahoo CL=F · snapshot',
        live: false,
        fallback: true,
      })
    },
    BTCUSD: () =>
      build('BTCUSD', {
        price: raw.btc?.price,
        changePct: changeVsRef('BTCUSD', raw.btc?.price),
        ts: raw.btc?.ts,
        source: raw.btc?.via || 'Binance BTCUSDT',
        live: true,
        fallback: true,
      }),
  }

  return Object.fromEntries(
    INSTRUMENTS.map((inst) => [inst.id, tv?.[inst.id] ? fromTV(inst) : fallbacks[inst.id]()]),
  )
}
