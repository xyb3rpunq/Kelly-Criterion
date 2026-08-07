import { useMemo } from 'react'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { useT } from '../hooks/useLanguage.jsx'
import { fmtUSD, fmtUSDCompact, fmtPct } from '../lib/format.js'
import { MotionPanel } from './ui/Panel.jsx'
import { Stat, Pill } from './ui/Stat.jsx'

function ChartTooltip({ active, payload, label, capital, t }) {
  if (!active || !payload?.length) return null
  const med = payload.find((p) => p.dataKey === 'median')?.value
  if (!Number.isFinite(med)) return null

  const delta = (med - capital) / capital
  return (
    <div className="hairline hairline-mute rounded bg-panel/95 px-3 py-2 backdrop-blur">
      <p className="relative z-10 font-mono text-2xs text-mute">{t.mc.tooltipTrade(label)}</p>
      <p className="relative z-10 font-mono text-sm font-semibold text-gold-lit">{fmtUSD(med, 0)}</p>
      <p className={`relative z-10 font-mono text-2xs ${delta >= 0 ? 'text-mint' : 'text-danger'}`}>
        {delta >= 0 ? '+' : ''}
        {(delta * 100).toFixed(1)}% {t.mc.tooltipMedian}
      </p>
    </div>
  )
}

export function MonteCarloChart({ sim, capital, trades, onReroll, seed, fractionKey, busy }) {
  const t = useT()
  const { series, median, stats } = sim

  // Recharts wants row-per-x. Path keys are stable across re-rolls so lines are
  // reconciled rather than remounted, which keeps the redraw cheap.
  const data = useMemo(() => {
    const rows = new Array(trades + 1)
    for (let t = 0; t <= trades; t += 1) {
      const row = { t, median: median[t] }
      for (let i = 0; i < series.length; i += 1) row[`p${i}`] = series[i][t]
      rows[t] = row
    }
    return rows
  }, [series, median, trades])

  const ruinFloor = stats.ruinFloor

  /*
   * Equity curves span orders of magnitude. Compounding half Kelly on a
   * positive edge over 120 trades routinely takes $10k past $10M, at which
   * point a linear axis collapses every interesting path onto the zero line
   * and only the single luckiest run is visible.
   *
   * So the axis switches to log once the spread exceeds two decades — which is
   * how equity curves are conventionally plotted anyway — and says so on the
   * chart rather than silently changing what the reader is looking at.
   */
  const { yDomain, useLog, yTicks } = useMemo(() => {
    let lo = Infinity
    let hi = -Infinity
    for (const curve of series) {
      for (const v of curve) {
        if (!Number.isFinite(v)) continue
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      lo = capital * 0.5
      hi = capital * 1.5
    }

    lo = Math.min(lo, ruinFloor)
    hi = Math.max(hi, capital)
    if (lo <= 0) lo = Math.max(1, Math.min(ruinFloor, capital * 0.01))
    if (hi <= lo) hi = lo * 2 // flat curves (fraction = 0) still need a domain

    const log = hi / lo > 100
    if (!log) return { yDomain: [lo * 0.94, hi * 1.06], useLog: false, yTicks: undefined }

    const domain = [lo * 0.8, hi * 1.4]
    const ticks = []
    for (let e = Math.floor(Math.log10(domain[0])); e <= Math.ceil(Math.log10(domain[1])); e += 1) {
      const t = 10 ** e
      if (t >= domain[0] && t <= domain[1]) ticks.push(t)
    }
    return { yDomain: domain, useLog: true, yTicks: ticks.length >= 2 ? ticks : undefined }
  }, [series, capital, ruinFloor])

  const ruinTone = stats.probRuin >= 0.2 ? 'danger' : stats.probRuin > 0 ? 'amber' : 'mint'

  return (
    <MotionPanel
      id="simulation"
      eyebrow={t.mc.eyebrow}
      title={t.mc.title(series.length, trades)}
      aside={
        <div className="flex items-center gap-2">
          <Pill tone="dim" title={t.mc.seedTitle}>
            {t.mc.seed} {seed}
          </Pill>
          <button
            type="button"
            onClick={onReroll}
            className="rounded border border-chain/40 bg-chain/10 px-2.5 py-1 font-mono text-2xs uppercase tracking-wider text-chain-lit transition-all hover:border-chain/70 hover:shadow-glow-chain"
          >
            {t.mc.reroll}
          </button>
        </div>
      }
    >
      <div className="p-4">
        <div
          className={`h-[300px] w-full transition-opacity duration-200 sm:h-[360px] ${
            busy ? 'opacity-60' : 'opacity-100'
          }`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
              <CartesianGrid stroke="#141926" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="t"
                tick={{ fill: '#5A6478', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#1A2030' }}
                minTickGap={28}
              />
              <YAxis
                scale={useLog ? 'log' : 'linear'}
                domain={yDomain}
                ticks={yTicks}
                allowDataOverflow
                tickFormatter={fmtUSDCompact}
                tick={{ fill: '#5A6478', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={false}
                axisLine={false}
                width={54}
              />
              <Tooltip
                content={<ChartTooltip capital={capital} t={t} />}
                cursor={{ stroke: '#6E5BFF', strokeWidth: 1, strokeDasharray: '3 3' }}
              />

              {/* Simulated paths, deliberately faint — the bundle is the point,
                  not any individual line. */}
              {series.map((_, i) => (
                <Line
                  key={`p${i}`}
                  dataKey={`p${i}`}
                  type="monotone"
                  stroke="#6E5BFF"
                  strokeOpacity={0.22}
                  strokeWidth={1}
                  dot={false}
                  isAnimationActive={false}
                  activeDot={false}
                />
              ))}

              <ReferenceLine
                y={capital}
                stroke="#8B94A8"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: t.mc.start,
                  position: 'insideTopLeft',
                  fill: '#8B94A8',
                  fontSize: 9,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
              <ReferenceLine
                y={ruinFloor}
                stroke="#FF4D6D"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: t.mc.ruin,
                  position: 'insideBottomLeft',
                  fill: '#FF4D6D',
                  fontSize: 9,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />

              <Line
                dataKey="median"
                type="monotone"
                stroke="#D4AF37"
                strokeWidth={2.4}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 3.5, fill: '#F4E4A6', stroke: '#05060A', strokeWidth: 1.5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-2 font-mono text-[0.6rem] text-mute">
          <span className="text-gold">▬</span> {t.mc.legendMedian} ·{' '}
          <span className="text-chain">▬</span> {t.mc.legendPaths} ·{' '}
          {t.mc.legendSizing(t.prob[fractionKey].toLowerCase())} ·{' '}
          <span className={useLog ? 'text-amber' : ''}>
            {useLog ? t.mc.logAxis : t.mc.linearAxis}
          </span>
        </p>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-lineSoft pt-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label={t.mc.medianFinal} value={fmtUSD(stats.medianFinal, 0)} tone="gold" size="sm" />
          <Stat label={t.mc.best} value={fmtUSD(stats.best, 0)} tone="mint" size="sm" />
          <Stat label={t.mc.worst} value={fmtUSD(stats.worst, 0)} tone="danger" size="sm" />
          <Stat
            label={t.mc.pProfit}
            value={fmtPct(stats.probProfit, 0)}
            tone={stats.probProfit >= 0.5 ? 'mint' : 'amber'}
            size="sm"
          />
          <Stat label={t.mc.pRuin} value={fmtPct(stats.probRuin, 0)} tone={ruinTone} size="sm" />
          <Stat
            label={t.mc.avgDD}
            value={fmtPct(stats.avgMaxDrawdown, 0)}
            tone={stats.avgMaxDrawdown > 0.35 ? 'danger' : 'dim'}
            size="sm"
          />
        </div>

        <p className="mt-4 text-2xs leading-relaxed text-mute">{t.mc.note(trades)}</p>
      </div>
    </MotionPanel>
  )
}
