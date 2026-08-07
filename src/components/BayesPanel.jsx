import { useMemo } from 'react'
import { Area, AreaChart, ReferenceArea, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { posteriorCurve } from '../lib/bayes.js'
import { useT } from '../hooks/useLanguage.jsx'
import { fmtPct, fmtUSD } from '../lib/format.js'
import { MotionPanel } from './ui/Panel.jsx'
import { Pill } from './ui/Stat.jsx'

/**
 * Posterior over the win probability, and what it implies for position size.
 *
 * The chart is the argument: a wide hump means the record cannot yet
 * distinguish a good strategy from a lucky one, and the sizing numbers beside
 * it inherit exactly that width. The shaded band is the credible interval; the
 * dashed line is the win rate the current odds need just to break even.
 */
export function BayesPanel({ post, bk, capital, multiplier, hasEdgeData, onAdoptP }) {
  const t = useT()

  const curve = useMemo(() => posteriorCurve(post.alpha, post.beta, 180), [post.alpha, post.beta])

  if (!bk.valid) {
    return (
      <MotionPanel eyebrow={t.bayes.eyebrow} title={t.bayes.title}>
        <p className="p-4 text-2xs text-dim">{t.bayes.needGeometry}</p>
      </MotionPanel>
    )
  }

  const confident = bk.pEdge >= 0.95
  const tone = bk.pEdge >= 0.95 ? 'mint' : bk.pEdge >= 0.75 ? 'amber' : 'danger'

  // The conservative allocation: size on the bottom of the credible range, not
  // the middle of it. Applied through the same fraction preset as everything else.
  const conservative = bk.fLo * multiplier
  const central = bk.fMean * multiplier

  return (
    <MotionPanel
      id="bayes"
      eyebrow={t.bayes.eyebrow}
      title={t.bayes.title}
      aside={<Pill tone={tone}>{t.bayes.pEdgePill(fmtPct(bk.pEdge, 0))}</Pill>}
    >
      <div className="p-4">
        <p className="mb-4 border-l-2 border-chain/50 pl-3 text-2xs leading-relaxed text-dim">
          <span className="font-mono uppercase tracking-wider text-chain-lit">
            {t.bayes.readLabel}
          </span>{' '}
          {hasEdgeData
            ? t.bayes.readWithData(post.n, fmtPct(post.priorWeight, 0))
            : t.bayes.readNoData}
        </p>

        <div className="h-[190px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curve} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="postFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6E5BFF" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#6E5BFF" stopOpacity={0.03} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="p"
                type="number"
                domain={[0, 1]}
                ticks={[0, 0.25, 0.5, 0.75, 1]}
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
                tick={{ fill: '#5A6478', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#1A2030' }}
              />
              <YAxis hide domain={[0, 1.05]} />

              {/* Credible interval */}
              <ReferenceArea
                x1={bk.pLo}
                x2={bk.pHi}
                fill="#D4AF37"
                fillOpacity={0.1}
                stroke="none"
              />

              <Area
                dataKey="d"
                type="monotone"
                stroke="#A79BFF"
                strokeWidth={1.6}
                fill="url(#postFill)"
                isAnimationActive={false}
                dot={false}
              />

              {/* Break-even win rate for the current odds */}
              <ReferenceLine
                x={bk.breakEven}
                stroke="#FF4D6D"
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{
                  value: t.bayes.breakEven,
                  position: 'insideTopRight',
                  fill: '#FF4D6D',
                  fontSize: 9,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
              <ReferenceLine x={bk.pMean} stroke="#D4AF37" strokeWidth={1.4} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-1 text-center font-mono text-[0.6rem] text-mute">
          {t.bayes.axisNote(fmtPct(bk.level, 0))}
        </p>

        {/* Interval readout */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-lineSoft pt-4">
          <div>
            <p className="eyebrow mb-1">{t.bayes.pLo}</p>
            <p className="font-mono text-sm text-danger">{fmtPct(bk.pLo, 1)}</p>
          </div>
          <div className="text-center">
            <p className="eyebrow mb-1">{t.bayes.pMean}</p>
            <p className="font-mono text-sm text-gold-lit">{fmtPct(bk.pMean, 1)}</p>
          </div>
          <div className="text-right">
            <p className="eyebrow mb-1">{t.bayes.pHi}</p>
            <p className="font-mono text-sm text-mint">{fmtPct(bk.pHi, 1)}</p>
          </div>
        </div>

        {/* What it means for sizing */}
        <div className="mt-4 grid gap-2 border-t border-lineSoft pt-4 sm:grid-cols-2">
          <div className="rounded border border-line bg-raise/50 px-3 py-2.5">
            <p className="eyebrow mb-1">{t.bayes.centralSizing}</p>
            <p className="font-mono text-lg leading-none text-gold-lit">{fmtPct(central, 2)}</p>
            <p className="mt-1 font-mono text-[0.6rem] text-mute">
              {fmtUSD(central * capital, 0)} · {t.bayes.centralNote}
            </p>
          </div>
          <div
            className={`rounded border px-3 py-2.5 ${
              confident ? 'border-mint/35 bg-mint/[0.06]' : 'border-amber/35 bg-amber/[0.05]'
            }`}
          >
            <p className="eyebrow mb-1">{t.bayes.robustSizing}</p>
            <p className={`font-mono text-lg leading-none ${confident ? 'text-mint' : 'text-amber'}`}>
              {fmtPct(conservative, 2)}
            </p>
            <p className="mt-1 font-mono text-[0.6rem] text-mute">
              {fmtUSD(conservative * capital, 0)} · {t.bayes.robustNote(fmtPct(bk.level, 0))}
            </p>
          </div>
        </div>

        <p className="mt-3 font-mono text-2xs leading-relaxed text-mute">{t.bayes.linearity}</p>

        {hasEdgeData && (
          <button
            type="button"
            onClick={onAdoptP}
            className="mt-3 w-full rounded border border-chain/40 bg-chain/10 px-3 py-2 font-mono text-2xs uppercase tracking-wider text-chain-lit transition-all hover:border-chain/70 hover:shadow-glow-chain"
          >
            {t.bayes.adopt(fmtPct(bk.pMean, 1))}
          </button>
        )}
      </div>
    </MotionPanel>
  )
}
