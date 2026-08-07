import { INSTRUMENTS } from '../lib/market.js'
import { useT } from '../hooks/useLanguage.jsx'
import { fmtNum, fmtSignedPct, fmtAge } from '../lib/format.js'
import { MotionPanel } from './ui/Panel.jsx'
import { Pill } from './ui/Stat.jsx'

/**
 * Sparkline over prices observed since page load. It is explicitly *session*
 * history, not a chart of the trading day — the app keeps no price archive and
 * does not pretend to.
 */
function Spark({ points, up }) {
  if (!points || points.length < 3) {
    return <div className="h-7 w-full" aria-hidden="true" />
  }

  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const step = 100 / (points.length - 1)
  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${(26 - ((v - min) / span) * 22).toFixed(2)}`)
    .join(' ')

  const stroke = up ? '#00E5C7' : '#FF4D6D'

  return (
    <svg
      className="h-7 w-full"
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function InstrumentCard({ instrument, quote, history, selected, onSelect, now, t }) {
  const price = quote?.price
  const change = quote?.changePct
  const up = Number.isFinite(change) && change >= 0
  const unavailable = price === null || price === undefined

  return (
    <button
      type="button"
      onClick={() => onSelect(instrument.id)}
      aria-pressed={selected}
      title={instrument.note}
      className={`hairline group relative rounded-lg p-4 text-left transition-all duration-200 ${
        selected
          ? 'bg-gold/[0.07] shadow-glow-gold'
          : 'bg-raise/60 hover:bg-raise'
      }`}
    >
      <div className="relative z-10">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className={`font-mono text-2xs uppercase tracking-wider ${
              selected ? 'text-gold-lit' : 'text-dim'
            }`}
          >
            {instrument.label}
          </span>
          {/* Honesty badge. LIVE only for a genuinely streaming feed; a delayed
              feed states its delay in minutes; a source that had to fall back
              off the primary says so rather than hiding it. */}
          <span
            className={`font-mono text-[0.6rem] uppercase tracking-wider ${
              quote?.live ? 'text-mint/70' : 'text-amber/80'
            }`}
            title={instrument.note}
          >
            {quote?.live
              ? t.monitor.live
              : quote?.delayMin
                ? t.monitor.delayed(quote.delayMin)
                : t.monitor.cached}
            {quote?.fallback && <span className="ml-1 text-chain-lit/70">·{t.monitor.fallback}</span>}
          </span>
        </div>

        <p
          className={`font-mono text-lg font-semibold leading-none tabular-nums ${
            unavailable ? 'text-mute' : 'text-ink'
          }`}
        >
          {fmtNum(price, instrument.decimals)}
        </p>

        <p
          className={`mt-1.5 font-mono text-2xs tabular-nums ${
            unavailable ? 'text-mute' : up ? 'text-mint' : 'text-danger'
          }`}
        >
          {fmtSignedPct(change, 2)} <span className="text-mute">{t.monitor.h24}</span>
        </p>

        <div className="mt-2 -mx-1">
          <Spark points={history} up={up} />
        </div>

        <p className="mt-1 truncate font-mono text-[0.6rem] text-mute" title={quote?.source}>
          {unavailable ? t.monitor.unavailable : `${quote?.source} · ${fmtAge(quote?.ts, now)}`}
        </p>
      </div>
    </button>
  )
}

export function MarketMonitor({ quotes, history, selectedId, onSelect, snapshot, now }) {
  const t = useT()
  const snapAge = snapshot?.generatedAt ? fmtAge(Date.parse(snapshot.generatedAt), now) : null

  return (
    <MotionPanel
      id="monitor"
      eyebrow={t.monitor.eyebrow}
      title={t.monitor.title}
      aside={
        <Pill tone={snapshot?.origin === 'api' ? 'mint' : 'dim'}>
          {snapshot?.origin === 'api' ? t.monitor.proxyLive : t.monitor.snapshot}
          {snapAge ? ` · ${snapAge}` : ''}
        </Pill>
      }
    >
      <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-3 lg:grid-cols-5">
        {INSTRUMENTS.map((inst) => (
          <InstrumentCard
            key={inst.id}
            instrument={inst}
            quote={quotes?.[inst.id]}
            history={history?.[inst.id]}
            selected={selectedId === inst.id}
            onSelect={onSelect}
            now={now}
            t={t}
          />
        ))}
      </div>

      <div className="border-t border-lineSoft px-4 py-3">
        <p className="text-2xs leading-relaxed text-mute">
          <span className="text-dim">{t.monitor.sourcesLabel}</span> {t.monitor.sourcesBody}
        </p>
      </div>
    </MotionPanel>
  )
}
