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
import { posterior, bayesianKelly } from './lib/bayes.js'
import { journalStats } from './lib/journal.js'
import { useMarketData } from './hooks/useMarketData.js'
import { useDebouncedValue } from './hooks/useDebouncedValue.js'
import { useJournal } from './hooks/useJournal.js'
import { LanguageProvider, useT } from './hooks/useLanguage.jsx'

import { BackgroundGrid } from './components/BackgroundGrid.jsx'
import { Header } from './components/Header.jsx'
import { Hero } from './components/Hero.jsx'
import { MarketMonitor } from './components/MarketMonitor.jsx'
import { TradeSetupPanel } from './components/TradeSetupPanel.jsx'
import { ProbabilityPanel } from './components/ProbabilityPanel.jsx'
import { KellyGauge } from './components/KellyGauge.jsx'
import { MonteCarloChart } from './components/MonteCarloChart.jsx'
import { JournalPanel } from './components/JournalPanel.jsx'
import { BayesPanel } from './components/BayesPanel.jsx'
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

  /**
   * Flipping buy/sell would otherwise leave the stop and target on the wrong
   * sides of entry and invalidate the whole setup. Mirroring them around entry
   * preserves the exact risk and reward distances the user already chose, which
   * is what "the same idea, other direction" actually means.
   */
  const handleSetupChange = useCallback(
    (next) => {
      setSetup((prev) => {
        if (next.direction === prev.direction) return next

        const entry = Number(next.entry)
        const stop = Number(next.stop)
        const target = Number(next.target)
        if (![entry, stop, target].every(Number.isFinite)) return next

        const dp = INSTRUMENT_BY_ID[instrumentId].decimals
        return {
          ...next,
          stop: (2 * entry - stop).toFixed(dp),
          target: (2 * entry - target).toFixed(dp),
        }
      })
    },
    [instrumentId],
  )

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

  // --- Journal and the posterior it supports ---
  const journal = useJournal()
  const [journalScope, setJournalScope] = useState('all')

  const journalFilter = journalScope === 'instrument' ? instrumentId : null
  const jStats = useMemo(
    () => journalStats(journal.entries, journalFilter),
    [journal.entries, journalFilter],
  )

  /**
   * The slider is the prior; logged outcomes are the evidence. With an empty
   * journal this collapses to the slider value, so the panel degrades to
   * "your opinion, drawn as a distribution" rather than breaking.
   */
  const post = useMemo(
    () => posterior({ p0: p, wins: jStats.wins, losses: jStats.losses }),
    [p, jStats.wins, jStats.losses],
  )

  const bk = useMemo(
    () => bayesianKelly({ alpha: post.alpha, beta: post.beta, b: rr.b }),
    [post.alpha, post.beta, rr.b],
  )

  // Setting the slider rather than silently overriding it: the user stays the
  // author of the assumption, they just get to accept the measured one.
  const adoptMeasuredP = useCallback(() => {
    if (Number.isFinite(bk.pMean)) setP(Math.min(0.99, Math.max(0.01, bk.pMean)))
  }, [bk.pMean])

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
                onChange={handleSetupChange}
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
              <JournalPanel
                entries={journal.entries}
                onAdd={journal.add}
                onRemove={journal.remove}
                onClear={journal.clear}
                onMerge={journal.merge}
                instrumentId={instrumentId}
                scope={journalScope}
                onScope={setJournalScope}
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
              <BayesPanel
                post={post}
                bk={bk}
                capital={capital}
                multiplier={multiplier}
                hasEdgeData={jStats.decided > 0}
                onAdoptP={adoptMeasuredP}
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
