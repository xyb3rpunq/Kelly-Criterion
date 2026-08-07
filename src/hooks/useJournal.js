import { useCallback, useEffect, useState } from 'react'
import { JOURNAL_VERSION, isValidEntry, makeEntry } from '../lib/journal.js'

const STORAGE_KEY = 'kelly-terminal:journal:v1'

/**
 * Trade journal persisted to localStorage.
 *
 * No account, no backend, no network — the log never leaves the machine it was
 * typed on. That is a deliberate constraint rather than a limitation to fix
 * later: a trading record is sensitive, and this project has nowhere to put it
 * that would be safer than the user's own browser.
 */
function load() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const entries = Array.isArray(parsed) ? parsed : parsed?.entries
    return Array.isArray(entries) ? entries.filter(isValidEntry) : []
  } catch {
    // Corrupt or blocked storage must not stop the app from rendering.
    return []
  }
}

export function useJournal() {
  const [entries, setEntries] = useState(load)

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: JOURNAL_VERSION, entries }),
      )
    } catch {
      /* private mode or quota — the session still works, it just will not persist */
    }
  }, [entries])

  const add = useCallback((input) => {
    const entry = makeEntry(input)
    if (!Number.isFinite(entry.r)) return null
    // Newest first: the list is read far more often than it is scrolled.
    setEntries((prev) => [entry, ...prev])
    return entry
  }, [])

  const remove = useCallback((id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const clear = useCallback(() => setEntries([]), [])

  const replaceAll = useCallback((next) => {
    setEntries(Array.isArray(next) ? next.filter(isValidEntry) : [])
  }, [])

  /** Merge imported entries, dropping ids already present. */
  const merge = useCallback((incoming) => {
    setEntries((prev) => {
      const seen = new Set(prev.map((e) => e.id))
      const fresh = incoming.filter((e) => !seen.has(e.id))
      return [...fresh, ...prev].sort((a, b) => b.ts - a.ts)
    })
  }, [])

  return { entries, add, remove, clear, replaceAll, merge }
}
