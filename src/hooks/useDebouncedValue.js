import { useEffect, useState } from 'react'

/**
 * Trailing debounce. Used to keep the Monte Carlo re-run off the slider's
 * every-pixel update path — the cheap readouts stay instant, the 24×160-step
 * simulation waits for the drag to settle.
 */
export function useDebouncedValue(value, delay = 140) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])

  return debounced
}
