import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { INSTRUMENTS } from '../lib/market.js'
import { fmtNum, fmtSignedPct } from '../lib/format.js'
import { useT } from '../hooks/useLanguage.jsx'

const FLASH_MS = 700

/**
 * Wall-street style tape: a continuous right-to-left crawl.
 *
 * Two mechanics make it read as live rather than as a scrolling image:
 *   - each cell flashes green or red for a moment when its price actually
 *     changes, so movement is visible even though the crawl is constant;
 *   - an arrow tracks the direction of the last tick, independent of the
 *     day-change figure beside it, which moves far more slowly.
 *
 * The crawl is one CSS animation on a doubled track. Duplicating the row and
 * translating exactly -50% makes the loop seamless — the copy arrives at the
 * position the original left, so there is no jump to hide.
 */

/** Remembers the previous price of each instrument and reports the tick direction. */
function useTickFlash(quotes) {
  const prev = useRef({})
  const timers = useRef({})
  const [flash, setFlash] = useState({})

  useEffect(() => {
    if (!quotes) return

    const changed = {}
    for (const [id, q] of Object.entries(quotes)) {
      const price = q?.price
      if (!Number.isFinite(price)) continue
      const before = prev.current[id]
      if (Number.isFinite(before) && before !== price) {
        changed[id] = price > before ? 'up' : 'down'
      }
      prev.current[id] = price
    }

    const ids = Object.keys(changed)
    if (!ids.length) return

    setFlash((f) => ({ ...f, ...changed }))
    for (const id of ids) {
      clearTimeout(timers.current[id])
      timers.current[id] = setTimeout(() => {
        setFlash((f) => {
          const next = { ...f }
          delete next[id]
          return next
        })
      }, FLASH_MS)
    }
  }, [quotes])

  // Clearing on unmount only — the timer map is keyed and rewritten above.
  useEffect(() => {
    const map = timers.current
    return () => Object.values(map).forEach(clearTimeout)
  }, [])

  return flash
}

function Cell({ instrument, quote, flash, t }) {
  const price = quote?.price
  const change = quote?.changePct
  const up = Number.isFinite(change) && change > 0
  const down = Number.isFinite(change) && change < 0
  const missing = !Number.isFinite(price)

  const flashCls =
    flash === 'up'
      ? 'bg-mint/15 text-mint'
      : flash === 'down'
        ? 'bg-danger/15 text-danger'
        : 'text-ink'

  return (
    <div className="flex shrink-0 items-baseline gap-2 border-r border-lineSoft px-5 py-1">
      <span className="font-mono text-2xs uppercase tracking-wider text-mute">
        {instrument.label}
      </span>

      <span
        className={`rounded px-1 font-mono text-xs font-semibold tabular-nums transition-colors duration-200 ${
          missing ? 'text-mute' : flashCls
        }`}
      >
        {fmtNum(price, instrument.decimals)}
      </span>

      {/* Direction of the most recent tick — deliberately separate from the
          day change, which barely moves at this cadence. */}
      <span
        className={`w-2 font-mono text-2xs ${
          flash === 'up' ? 'text-mint' : flash === 'down' ? 'text-danger' : 'text-transparent'
        }`}
        aria-hidden="true"
      >
        {flash === 'down' ? '▼' : '▲'}
      </span>

      <span
        className={`font-mono text-2xs tabular-nums ${
          missing ? 'text-mute' : up ? 'text-mint' : down ? 'text-danger' : 'text-dim'
        }`}
      >
        {fmtSignedPct(change, 2)}
      </span>

      {!quote?.live && !missing && (
        <span
          className="font-mono text-[0.55rem] uppercase tracking-wider text-amber/80"
          title={instrument.note}
        >
          {quote?.delayMin ? `${quote.delayMin}m` : t.monitor.cached}
        </span>
      )}
    </div>
  )
}

export function Ticker({ quotes, speedSeconds = 42 }) {
  const t = useT()
  const reduce = useReducedMotion()
  const flash = useTickFlash(quotes)

  const cells = useMemo(
    () =>
      INSTRUMENTS.map((inst) => (
        <Cell key={inst.id} instrument={inst} quote={quotes?.[inst.id]} flash={flash[inst.id]} t={t} />
      )),
    [quotes, flash, t],
  )

  // Reduced motion gets the same data as a static, manually scrollable strip.
  if (reduce) {
    return (
      <div className="scroll-x w-full border-y border-lineSoft bg-panel/40">
        <div className="flex w-max items-center">{cells}</div>
      </div>
    )
  }

  return (
    <div
      className="group relative w-full overflow-hidden border-y border-lineSoft bg-panel/40"
      role="marquee"
      aria-label={t.header.tapeLabel}
    >
      {/* Edge fades so cells dissolve rather than clipping at the boundary. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-void to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-void to-transparent" />

      <div
        className="flex w-max animate-tape items-center group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
        style={{ animationDuration: `${speedSeconds}s` }}
      >
        {/* The track is rendered twice; -50% lands the copy exactly where the
            original started, which is what makes the loop seamless. */}
        <div className="flex items-center">{cells}</div>
        <div className="flex items-center" aria-hidden="true">
          {INSTRUMENTS.map((inst) => (
            <Cell
              key={`dup-${inst.id}`}
              instrument={inst}
              quote={quotes?.[inst.id]}
              flash={flash[inst.id]}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
