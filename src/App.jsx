import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'

import {
  calculateKelly,
  classifyTier,
  computeRR,
  runMonteCarlo,
  sensitivityTable,
  sizingLadder,
  FRACTION_PRESETS,
} from './lib/kelly.js'
import { INSTRUMENT_BY_ID } from './lib/market.js'
import { useMarketData } from './hooks/useMarketData.js'
import { useDebouncedValue } from './hooks/useDebouncedValue.js'
import { LanguageProvider, useT } from './hooks/useLanguage.jsx'

import { BackgroundGrid } from './components/BackgroundGrid.jsx'
import { Header } from './components/Header.jsx'
import { Hero } from './components/Hero.jsx'
import { MarketMonitor } from './components/MarketMonitor.jsx'
import { TradeSetupPanel } from './components/TradeSetupPanel.jsx'
import { ProbabilityPanel } from './components/ProbabilityPanel.jsx'
import { KellyGauge } from './components/KellyGauge.jsx'
import { MonteCarloChart } from './components/MonteCarloChart.jsx'
import { ConclusionPanel } from './components/ConclusionPanel.jsx'
import { Footer } from './components/Footer.jsx'

const TRADES = 120
const PATHS = 24
const HISTORY_LIMIT = 48

/** Volatility-scaled starting setup, so switching instrument gives a sane trade. */
function defaultSetup(instrument, price, capital = '10000') {
  const dp = instrument.decimals
  const px = Number.isFinite(price) ? price : null
  if (px === null) return { direction: 'buy', entry: '', stop: '', target: '', capital }

  const stopDist = px * instrument.stopPct
  return {
    direction: 'buy',
    entry: px.toFixed(dp),
    stop: (px - stopDist).toFixed(dp),
    target: (px + stopDist * 2).toFixed(dp),
    capital,
  }
}

export default function App() {
  return (
    <LanguageProvider>
      <Terminal />
    </LanguageProvider>
  )
}

function Terminal() {
  const t = useT()
  const { quotes, snapshot, status, updatedAt } = useMarketData()

  const [instrumentId, setInstrumentId] = useState('XAUUSD')
  const [setup, setSetup] = useState({
    direction: 'buy',
    entry: '',
    stop: '',
    target: '',
    capital: '10000',
  })
  const [p, setP] = useState(0.55)
  const [fractionKey, setFractionKey] = useState('half')
  const [seed, setSeed] = useState(20260807)

  // A one-second tick drives the "12s ago" staleness labels without coupling
  // them to the polling interval.
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Session price history for the monitor sparklines.
  const [history, setHistory] = useState({})
  useEffect(() => {
    if (!quotes) return
    setHistory((prev) => {
      const next = { ...prev }
      for (const [id, q] of Object.entries(quotes)) {
        if (!Number.isFinite(q.price)) continue
        const arr = next[id] ? [...next[id], q.price] : [q.price]
        next[id] = arr.length > HISTORY_LIMIT ? arr.slice(-HISTORY_LIMIT) : arr
      }
      return next
    })
  }, [quotes])

  const instrument = INSTRUMENT_BY_ID[instrumentId]
  const quote = quotes?.[instrumentId]

  // Seed the form once the first real price for the selected instrument lands.
  const seededFor = useRef(null)
  useEffect(() => {
    if (seededFor.current === instrumentId) return
    if (!Number.isFinite(quote?.price)) return
    seededFor.current = instrumentId
    setSetup((s) => defaultSetup(instrument, quote.price, s.capital))
  }, [instrumentId, instrument, quote?.price])

  const handleSelectInstrument = useCallback((id) => {
    setInstrumentId(id)
    // Force a re-seed of the trade geometry for the newly selected instrument.
    seededFor.current = null
  }, [])

  const handleSyncPrice = useCallback(() => {
    if (!Number.isFinite(quote?.price)) return
    setSetup((s) => defaultSetup(instrument, quote.price, s.capital))
  }, [instrument, quote?.price])

  // --- Derived maths. Cheap enough to run on every keystroke. ---
  const rr = useMemo(
    () =>
      computeRR({
        entry: setup.entry,
        stop: setup.stop,
        target: setup.target,
        direction: setup.direction,
      }),
    [setup],
  )

  const kelly = useMemo(() => calculateKelly(p, rr.b), [p, rr.b])
  const tier = useMemo(() => classifyTier(kelly), [kelly])

  const capital = Math.max(1, Number(setup.capital) || 0)
  const multiplier = FRACTION_PRESETS[fractionKey].multiplier

  const ladder = useMemo(
    () => sizingLadder({ f: kelly.f, capital, selectedMultiplier: multiplier }),
    [kelly.f, capital, multiplier],
  )

  // --- Simulation. Debounced so dragging the slider stays smooth. ---
  const simInput = useMemo(
    () => ({ p, b: rr.b, fraction: ladder.selectedPct, capital, seed }),
    [p, rr.b, ladder.selectedPct, capital, seed],
  )
  const debouncedInput = useDebouncedValue(simInput, 130)
  const busy = debouncedInput !== simInput

  const sim = useMemo(
    () =>
      runMonteCarlo({
        p: debouncedInput.p,
        b: debouncedInput.b,
        fraction: debouncedInput.fraction,
        trades: TRADES,
        paths: PATHS,
        capital: debouncedInput.capital,
        seed: debouncedInput.seed,
      }),
    [debouncedInput],
  )

  /**
   * Sensitivity rows, each re-simulated at its own p on the *same* seed — so the
   * median-final column reflects the shift in probability rather than a
   * different random draw.
   */
  const sensitivity = useMemo(() => {
    const rows = sensitivityTable(debouncedInput.p, debouncedInput.b)
    return rows.map((row) => {
      const fraction = row.full * multiplier
      const { stats } = runMonteCarlo({
        p: row.p,
        b: debouncedInput.b,
        fraction,
        trades: TRADES,
        paths: PATHS,
        capital: debouncedInput.capital,
        seed: debouncedInput.seed,
      })
      return { ...row, medianFinal: stats.medianFinal }
    })
  }, [debouncedInput, multiplier])

  const reroll = useCallback(() => setSeed(Math.floor(Math.random() * 2 ** 31)), [])

  return (
    <>
      <BackgroundGrid />

      <a
        href="#calculator"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:border focus:border-gold/50 focus:bg-panel focus:px-4 focus:py-2 focus:font-mono focus:text-2xs focus:text-gold-lit"
      >
        {t.a11y.skip}
      </a>

      <Header quotes={quotes} status={status} updatedAt={updatedAt} now={now} />

      <main className="relative z-10">
        <Hero />

        <motion.div
          id="calculator"
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.1, delayChildren: 0.35 }}
          className="mx-auto max-w-[1400px] space-y-4 px-4 pb-4 sm:px-6"
        >
          <MarketMonitor
            quotes={quotes}
            history={history}
            selectedId={instrumentId}
            onSelect={handleSelectInstrument}
            snapshot={snapshot}
            now={now}
          />

          {/* Asymmetric split: controls left, instrument right. */}
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-5 xl:col-span-4">
              <TradeSetupPanel
                setup={setup}
                onChange={setSetup}
                rr={rr}
                instrumentId={instrumentId}
                quote={quote}
                onSyncPrice={handleSyncPrice}
              />
              <ProbabilityPanel
                p={p}
                onP={setP}
                fractionKey={fractionKey}
                onFraction={setFractionKey}
                kelly={kelly}
                breakEvenP={kelly.breakEvenP}
              />
            </div>

            <div className="space-y-4 lg:col-span-7 xl:col-span-8">
              <KellyGauge
                kelly={kelly}
                ladder={ladder}
                tier={tier}
                fractionKey={fractionKey}
                capital={capital}
                riskPerTradeUSD={ladder.selectedPct * capital}
              />
              <MonteCarloChart
                sim={sim}
                capital={capital}
                trades={TRADES}
                onReroll={reroll}
                seed={seed}
                fractionKey={fractionKey}
                busy={busy}
              />
            </div>
          </div>
        </motion.div>

        <div className="mx-auto max-w-[1400px] px-4 pb-6 sm:px-6">
          <ConclusionPanel
            kelly={kelly}
            rr={rr}
            p={debouncedInput.p}
            stats={sim.stats}
            ladder={ladder}
            fractionKey={fractionKey}
            capital={capital}
            tier={tier}
            sensitivity={sensitivity}
            instrument={instrument}
            trades={TRADES}
            seed={seed}
          />
        </div>
      </main>

      <Footer snapshot={snapshot} />
    </>
  )
}
