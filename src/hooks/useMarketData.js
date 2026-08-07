import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchQuotes, fetchSnapshot } from '../lib/market.js'

const POLL_MS = 20000
const SNAPSHOT_MS = 5 * 60 * 1000

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

    return () => {
      mounted.current = false
      abortRef.current?.abort()
      clearInterval(poll)
      clearInterval(snapPoll)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh, reloadSnapshot])

  return { quotes, snapshot, status, updatedAt, refresh }
}
