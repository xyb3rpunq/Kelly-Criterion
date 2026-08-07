import { useId, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useT } from '../hooks/useLanguage.jsx'
import { fmtPct, fmtUSD } from '../lib/format.js'
import { MotionPanel } from './ui/Panel.jsx'
import { AnimatedNumber, Pill } from './ui/Stat.jsx'

/*
 * The signature element.
 *
 * A 270-degree radial arc reading the applied Kelly fraction against four risk
 * zones. Everything on it is real: the zone boundaries are positions on the same
 * axis as the needle, the ghost notches mark where the other two fraction
 * presets would land, and a comet runs the live arc so the element registers as
 * instrument rather than illustration.
 *
 * Geometry: angles are SVG-convention degrees (0 = 3 o'clock, clockwise).
 * Sweeping 135 -> 405 leaves the gap at the bottom.
 */

const START = 135
const SWEEP = 270
const MAX = 0.4 // full-scale deflection: 40% of NAV per trade

const CX = 160
const CY = 150
const R = 112

const ZONES = [
  { from: 0, to: 0.05, color: '#00E5C7' },
  { from: 0.05, to: 0.15, color: '#D4AF37' },
  { from: 0.15, to: 0.25, color: '#FFB020' },
  { from: 0.25, to: MAX, color: '#FF4D6D' },
]

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const toAngle = (f) => START + clamp01(f / MAX) * SWEEP

function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function arcPath(r, a0, a1) {
  const s = polar(CX, CY, r, a0)
  const e = polar(CX, CY, r, a1)
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 <= 180 ? 0 : 1} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

function Notch({ f, label, dim }) {
  if (!Number.isFinite(f) || f <= 0) return null
  const a = toAngle(f)
  const inner = polar(CX, CY, R - 15, a)
  const outer = polar(CX, CY, R + 15, a)
  const text = polar(CX, CY, R + 27, a)

  return (
    <g opacity={dim ? 0.45 : 0.9}>
      <line
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke="#E7EBF3"
        strokeWidth="1"
        strokeDasharray="2 2"
        opacity="0.5"
      />
      <text
        x={text.x}
        y={text.y}
        fill="#5A6478"
        fontSize="8"
        fontFamily="JetBrains Mono, monospace"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {label}
      </text>
    </g>
  )
}

export function KellyGauge({ kelly, ladder, tier, fractionKey, capital, riskPerTradeUSD }) {
  const t = useT()
  const uid = useId().replace(/:/g, '')
  const reduce = useReducedMotion()
  const tierLabel = t.tiers[tier.id].label

  const applied = ladder.selectedPct
  const angle = toAngle(applied)
  const head = polar(CX, CY, R, angle)
  const overscale = applied > MAX

  const ticks = useMemo(
    () =>
      Array.from({ length: 41 }, (_, i) => {
        const a = START + (i / 40) * SWEEP
        const major = i % 5 === 0
        const p1 = polar(CX, CY, R + 4, a)
        const p2 = polar(CX, CY, R + (major ? 11 : 7), a)
        return { a, major, p1, p2, value: (i / 40) * MAX }
      }),
    [],
  )

  const activeArc = applied > 0 ? arcPath(R, START, angle) : null
  const tone = tier.tone === 'mute' ? 'dim' : tier.tone

  return (
    <MotionPanel
      id="gauge"
      eyebrow={t.gauge.eyebrow}
      title={t.gauge.title}
      tone="gold"
      aside={
        <Pill tone={tone}>
          {t.prob[fractionKey]} {t.gauge.kellySuffix}
        </Pill>
      }
    >
      <div className="p-4">
        <div className="relative mx-auto w-full max-w-[340px]">
          <svg
            viewBox="0 0 320 250"
            className="w-full"
            role="img"
            aria-label={t.a11y.gauge(fmtPct(applied), tierLabel)}
          >
            <defs>
              <linearGradient id={`arc-${uid}`} x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#6E5BFF" />
                <stop offset="45%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#F4E4A6" />
              </linearGradient>

              <filter id={`glow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id={`soft-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="8" />
              </filter>

              <radialGradient id={`core-${uid}`}>
                <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.22" />
                <stop offset="70%" stopColor="#D4AF37" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Halo behind the dial — brightens with the applied fraction so the
                whole instrument responds, not just the needle. */}
            <circle
              cx={CX}
              cy={CY}
              r={R - 6}
              fill={`url(#core-${uid})`}
              style={{
                opacity: 0.25 + clamp01(applied / MAX) * 0.75,
                transition: reduce ? 'none' : 'opacity 400ms ease',
              }}
            />

            {/* Tick ring */}
            <g>
              {ticks.map((t, i) => (
                <line
                  key={i}
                  x1={t.p1.x}
                  y1={t.p1.y}
                  x2={t.p2.x}
                  y2={t.p2.y}
                  stroke={t.major ? '#5A6478' : '#1A2030'}
                  strokeWidth={t.major ? 1.2 : 1}
                />
              ))}
            </g>

            {/* Zone bands */}
            <g strokeLinecap="butt" fill="none">
              {ZONES.map((z) => (
                <path
                  key={z.from}
                  d={arcPath(R, toAngle(z.from), toAngle(z.to))}
                  stroke={z.color}
                  strokeWidth="3"
                  opacity="0.22"
                />
              ))}
            </g>

            {/* Track */}
            <path d={arcPath(R, START, START + SWEEP)} stroke="#141926" strokeWidth="13" fill="none" strokeLinecap="round" />

            {/* Applied fraction */}
            {activeArc && (
              <>
                <motion.path
                  d={activeArc}
                  stroke={`url(#arc-${uid})`}
                  strokeWidth="13"
                  fill="none"
                  strokeLinecap="round"
                  filter={`url(#glow-${uid})`}
                  initial={false}
                  animate={{ d: activeArc }}
                  transition={{ duration: reduce ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
                />
                {/* Comet: a short bright dash cycling along the live arc. Pure
                    CSS dash animation, so it costs nothing per frame in React. */}
                {/* pathLength normalises the dash pattern to 100 units, so the comet
                    travels the whole arc at one speed whether f* is 1% or 40% —
                    without it, a short arc would barely show the dash at all. */}
                {!reduce && (
                  <path
                    d={activeArc}
                    stroke="#00E5C7"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.85"
                    filter={`url(#soft-${uid})`}
                    pathLength="100"
                    style={{
                      strokeDasharray: '4 96',
                      animation: 'kelly-comet 2.6s linear infinite',
                    }}
                  />
                )}
              </>
            )}

            {/* Head marker */}
            {applied > 0 && (
              <g style={{ transition: reduce ? 'none' : 'transform 450ms cubic-bezier(.22,1,.36,1)' }}>
                <circle cx={head.x} cy={head.y} r="11" fill="#D4AF37" opacity="0.18" filter={`url(#soft-${uid})`} />
                <circle cx={head.x} cy={head.y} r="4.5" fill="#F4E4A6" filter={`url(#glow-${uid})`} />
              </g>
            )}

            {/* Where the unselected presets would sit */}
            <Notch f={ladder.full.pct} label="F" dim={fractionKey === 'full'} />
            <Notch f={ladder.half.pct} label="½" dim={fractionKey === 'half'} />
            <Notch f={ladder.quarter.pct} label="¼" dim={fractionKey === 'quarter'} />

            {/* Scale ends */}
            <text x="70" y="243" fill="#5A6478" fontSize="9" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
              0%
            </text>
            <text x="250" y="243" fill="#5A6478" fontSize="9" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
              {overscale ? '40%+' : '40%'}
            </text>
          </svg>

          {/* Centre readout, overlaid rather than drawn in SVG so it inherits
              real text rendering and stays selectable. */}
          <div className="pointer-events-none absolute inset-x-0 top-[38%] flex -translate-y-1/2 flex-col items-center">
            <p className="eyebrow mb-1.5">{t.gauge.fApplied}</p>
            <p className="font-mono text-[2.6rem] font-bold leading-none text-gold-lit">
              <AnimatedNumber value={applied * 100} format={(v) => `${v.toFixed(2)}%`} />
            </p>
            <p className="mt-1 font-mono text-2xs text-mute">{t.gauge.ofNav}</p>
            <p className="mt-3 font-mono text-base font-semibold text-ink">
              <AnimatedNumber value={riskPerTradeUSD} format={(v) => fmtUSD(v, 0)} />
            </p>
            <p className="font-mono text-[0.6rem] text-mute">{t.gauge.atRisk}</p>
          </div>
        </div>

        {/* Zone legend */}
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-lineSoft pt-4 sm:grid-cols-4">
          {ZONES.map((z, zi) => {
            const active = applied >= z.from && (applied < z.to || (z.to === MAX && applied >= MAX))
            return (
              <div key={z.from} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{
                    background: z.color,
                    opacity: active ? 1 : 0.3,
                    boxShadow: active ? `0 0 10px ${z.color}` : 'none',
                  }}
                />
                <span
                  className={`font-mono text-[0.6rem] uppercase tracking-wider ${
                    active ? 'text-ink' : 'text-mute'
                  }`}
                >
                  {t.gauge.zones[zi]}
                </span>
              </div>
            )
          })}
        </div>

        {/* Sizing ladder */}
        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-lineSoft pt-4">
          {[
            ['full', ladder.full],
            ['half', ladder.half],
            ['quarter', ladder.quarter],
          ].map(([key, rung]) => {
            const isSel = key === fractionKey
            return (
              <div
                key={key}
                className={`rounded border px-2.5 py-2 transition-colors ${
                  isSel ? 'border-gold/40 bg-gold/[0.07]' : 'border-line bg-raise/50'
                }`}
              >
                <dt className="eyebrow mb-1">{t.gauge[key]}</dt>
                <dd className={`font-mono text-sm ${isSel ? 'text-gold-lit' : 'text-dim'}`}>
                  {fmtPct(rung.pct, 2)}
                </dd>
                <dd className="font-mono text-[0.6rem] text-mute">{fmtUSD(rung.dollars, 0)}</dd>
              </div>
            )
          })}
        </dl>

        {ladder.houseCapBinds && (
          <p className="mt-3 border-l-2 border-amber/60 bg-amber/[0.05] px-3 py-2 text-2xs leading-relaxed text-dim">
            <span className="font-mono uppercase tracking-wider text-amber">
              {t.gauge.capBindsLabel}
            </span>{' '}
            {t.gauge.capBinds(
              fmtPct(ladder.selectedPct, 2),
              fmtPct(ladder.cappedPct, 2),
              fmtUSD(ladder.cappedDollars, 0),
              fmtUSD(capital, 0),
            )}
          </p>
        )}

        {!kelly.valid && (
          <p className="mt-3 border-l-2 border-danger/60 bg-danger/[0.05] px-3 py-2 text-2xs text-dim">
            {t.gauge.invalidGeometry}
          </p>
        )}
      </div>
    </MotionPanel>
  )
}
