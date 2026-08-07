import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchQuotes, fetchSnapshot, openBTCStream } from '../lib/market.js'

/*
 * Poll cadence is set by how often the source actually changes, not by how
 * often we would like it to. Measured directly: the TradingView scanner
 * refreshes roughly every ten seconds, so polling it every second would return
 * an identical number nine times out of ten while burning 3,600 requests an
 * hour per open tab. Five seconds picks up each refresh promptly without being
 * abusive to an undocumented public endpoint.
 *
 * Bitcoin is the exception — Binance pushes a frame every second over a
 * WebSocket, so BTC genuinely updates at 1s and overrides the polled value.
 */
const POLL_MS = 5000
const SNAPSHOT_MS = 10 * 60 * 1000

/**
 * Polls the five instruments and keeps the server-side snapshot (reference
 * closes, plus crude) refreshed on a slower cadence.
 *
 * Polling pauses while the tab is hidden — there is no reason to keep hitting
 * three public APIs for a page nobody is looking at — and fires immediately on
 * return so the first thing a user sees is current.
 */
export function useMarketData() {
  const [quotes, setQuotes] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [status, setStatus] = useState('connecting') // connecting | live | degraded | error
  const [updatedAt, setUpdatedAt] = useState(null)

  const snapshotRef = useRef(null)
  const abortRef = useRef(null)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const q = await fetchQuotes({ snapshot: snapshotRef.current, signal: ctrl.signal })
      if (!mounted.current || ctrl.signal.aborted) return

      setQuotes(q)
      setUpdatedAt(Date.now())

      const values = Object.values(q)
      const ok = values.filter((v) => v.price !== null).length
      setStatus(ok === 0 ? 'error' : ok < values.length ? 'degraded' : 'live')
    } catch {
      if (mounted.current) setStatus('error')
    }
  }, [])

  const reloadSnapshot = useCallback(async () => {
    const snap = await fetchSnapshot()
    if (!mounted.current) return
    snapshotRef.current = snap
    setSnapshot(snap)
  }, [])

  useEffect(() => {
    mounted.current = true

    // Snapshot first so the very first render already has reference closes and
    // therefore real day-change percentages rather than blanks.
    ;(async () => {
      await reloadSnapshot()
      await refresh()
    })()

    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, POLL_MS)

    const snapPoll = setInterval(() => {
      if (document.visibilityState === 'visible') reloadSnapshot()
    }, SNAPSHOT_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)

    // Bitcoin arrives by push at 1s and supersedes whatever the poll last set.
    // Merged in place so a dropped socket simply leaves the polled value
    // standing rather than blanking the instrument.
    const closeStream = openBTCStream(({ price, changePct, ts }) => {
      if (!mounted.current) return
      setQuotes((prev) =>
        prev
          ? {
              ...prev,
              BTCUSD: {
                ...prev.BTCUSD,
                price,
                changePct: changePct ?? prev.BTCUSD?.changePct ?? null,
                ts,
                source: 'Binance stream · 1s',
                live: true,
                delayMin: 0,
                fallback: false,
                stale: false,
                error: null,
              },
            }
          : prev,
      )
    })

    return () => {
      mounted.current = false
      abortRef.current?.abort()
      clearInterval(poll)
      clearInterval(snapPoll)
      document.removeEventListener('visibilitychange', onVisible)
      closeStream()
    }
  }, [refresh, reloadSnapshot])

  return { quotes, snapshot, status, updatedAt, refresh }
}
