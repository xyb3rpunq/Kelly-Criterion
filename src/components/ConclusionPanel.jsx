import { motion } from 'framer-motion'
import { HOUSE_CAP } from '../lib/kelly.js'
import { fmtPct, fmtUSD, fmtR, fmtNum } from '../lib/format.js'

/**
 * Auto-generated risk memo.
 *
 * Every sentence below is composed from the live simulation output — there is
 * no static prose describing results anywhere in this component. Tone is
 * deliberately flat: a desk memo states the number and the caveat, and does not
 * sell the trade.
 */

const TONE_TEXT = {
  mint: 'text-mint',
  gold: 'text-gold-lit',
  amber: 'text-amber',
  danger: 'text-danger',
  chain: 'text-chain-lit',
  mute: 'text-dim',
}

const TONE_BORDER = {
  mint: 'border-mint',
  gold: 'border-gold',
  amber: 'border-amber',
  danger: 'border-danger',
  chain: 'border-chain',
  mute: 'border-mute',
}

function Row({ label, children }) {
  return (
    <div className="flex gap-3 py-0.5">
      <span className="w-[4.5rem] shrink-0 font-mono text-2xs uppercase tracking-wider text-mute">
        {label}
      </span>
      <span className="min-w-0 font-mono text-2xs text-dim">{children}</span>
    </div>
  )
}

function Heading({ n, children }) {
  return (
    <h3 className="mb-2.5 flex items-baseline gap-2 font-mono text-2xs uppercase tracking-terminal text-ink">
      <span className="text-mute">{n}</span>
      {children}
    </h3>
  )
}

function executiveSummary({ kelly, rr, p, stats, ladder, fractionKey, capital, tier, instrument }) {
  if (!kelly.valid) {
    return `Trade geometry for ${instrument.label} is incomplete or inconsistent — entry, stop and target do not describe a valid reward-to-risk structure. No sizing conclusion can be drawn until the setup resolves to a positive b.`
  }

  const bePct = kelly.breakEvenP * 100
  const pPct = p * 100
  const gap = pPct - bePct

  if (kelly.edge <= 0) {
    return (
      `At an assumed win rate of ${pPct.toFixed(1)}% against reward-to-risk odds of 1:${rr.b.toFixed(2)}, ` +
      `expectancy is ${fmtR(kelly.edge)} per trade — non-positive. These odds require a win rate above ` +
      `${bePct.toFixed(1)}% simply to break even, and the stated assumption sits ${Math.abs(gap).toFixed(1)} ` +
      `percentage points below that threshold. Kelly returns no positive allocation; the correct size is zero. ` +
      `Increasing position size against a negative expectancy accelerates capital loss rather than compensating for it.`
    )
  }

  const medianDelta = (stats.medianFinal - capital) / capital

  return (
    `At an assumed win rate of ${pPct.toFixed(1)}% against reward-to-risk odds of 1:${rr.b.toFixed(2)}, ` +
    `${instrument.label} carries a positive expectancy of ${fmtR(kelly.edge)} per trade — ` +
    `${gap.toFixed(1)} percentage points above the ${bePct.toFixed(1)}% break-even win rate these odds demand. ` +
    `Full Kelly implies ${fmtPct(ladder.full.pct)} of NAV per trade; the selected ${fractionKey} Kelly allocation ` +
    `is ${fmtPct(ladder.selectedPct)}, or ${fmtUSD(ladder.selectedPct * capital, 0)} of risk on ` +
    `${fmtUSD(capital, 0)} of capital. ` +
    `Across ${stats.paths} simulated paths of ${stats.trades} trades, median terminal equity is ` +
    `${fmtUSD(stats.medianFinal, 0)} (${medianDelta >= 0 ? '+' : ''}${(medianDelta * 100).toFixed(1)}%), ` +
    `with ${fmtPct(stats.probProfit, 0)} of paths finishing profitable, ${fmtPct(stats.probRuin, 0)} reaching ` +
    `the −50% ruin threshold, and an average maximum drawdown of ${fmtPct(stats.avgMaxDrawdown, 0)}. ` +
    `Classification: ${tier.label.toUpperCase()}.`
  )
}

export function ConclusionPanel({
  kelly,
  rr,
  p,
  stats,
  ladder,
  fractionKey,
  capital,
  tier,
  sensitivity,
  instrument,
  trades,
  seed,
}) {
  const summary = executiveSummary({
    kelly,
    rr,
    p,
    stats,
    ladder,
    fractionKey,
    capital,
    tier,
    instrument,
  })

  const toneText = TONE_TEXT[tier.tone] || TONE_TEXT.mute
  const toneBorder = TONE_BORDER[tier.tone] || TONE_BORDER.mute

  const base = sensitivity.find((r) => r.delta === 0)
  const down = sensitivity.find((r) => r.delta < 0)
  const up = sensitivity.find((r) => r.delta > 0)

  // How brittle is the conclusion? Expressed as the swing in f* across ±5pp.
  const swing =
    base && down && up && base.full > 0
      ? Math.max(Math.abs(up.full - base.full), Math.abs(base.full - down.full)) / base.full
      : null

  const verdictPct = kelly.edge > 0 ? ladder.cappedPct : 0

  return (
    <motion.section
      id="memo"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div className={`hairline-mute hairline rounded-lg bg-panel shadow-panel`}>
        <div className={`relative z-10 border-l-2 ${toneBorder} rounded-l-lg`}>
          {/* Memo letterhead */}
          <header className="border-b border-lineSoft px-5 py-4 sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow mb-1.5">Internal risk memorandum</p>
                <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                  Position sizing assessment
                </h2>
              </div>
              <span
                className={`rounded border px-2.5 py-1 font-mono text-2xs uppercase tracking-wider ${toneText} ${toneBorder.replace('border-', 'border-')}/50`}
              >
                {tier.label}
              </span>
            </div>

            <div className="mt-4 grid gap-x-8 gap-y-0.5 sm:grid-cols-2">
              <Row label="Subject">
                {instrument.label} · {instrument.name}
              </Row>
              <Row label="Method">Kelly criterion, fractional application</Row>
              <Row label="Inputs">
                p = {fmtPct(p, 1)} (assumed) · b = {rr.valid ? rr.b.toFixed(3) : '—'} · NAV ={' '}
                {fmtUSD(capital, 0)}
              </Row>
              <Row label="Sample">
                {stats.paths} paths × {trades} trades · seed {seed}
              </Row>
            </div>
          </header>

          <div className="space-y-7 px-5 py-6 sm:px-7">
            {/* 1 — Executive summary */}
            <section>
              <Heading n="01">Executive summary</Heading>
              <p className="max-w-[68ch] font-mono text-xs leading-relaxed text-dim">{summary}</p>
            </section>

            {/* 2 — Risk-adjusted sizing */}
            <section>
              <Heading n="02">Risk-adjusted sizing</Heading>
              <div className="scroll-x">
                <table className="w-full min-w-[440px] border-collapse font-mono text-2xs">
                  <thead>
                    <tr className="border-b border-line text-left uppercase tracking-wider text-mute">
                      <th className="py-2 pr-4 font-normal">Allocation</th>
                      <th className="py-2 pr-4 text-right font-normal">% of NAV</th>
                      <th className="py-2 pr-4 text-right font-normal">$ risk / trade</th>
                      <th className="py-2 text-right font-normal">vs. house cap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Full Kelly', ladder.full, 'full'],
                      ['Half Kelly', ladder.half, 'half'],
                      ['Quarter Kelly', ladder.quarter, 'quarter'],
                    ].map(([label, rung, key]) => {
                      const selected = key === fractionKey
                      const over = rung.pct > HOUSE_CAP
                      return (
                        <tr
                          key={key}
                          className={`border-b border-lineSoft ${selected ? 'bg-gold/[0.05]' : ''}`}
                        >
                          <td className={`py-2 pr-4 ${selected ? 'text-gold-lit' : 'text-dim'}`}>
                            {label}
                            {selected && <span className="ml-2 text-mute">← applied</span>}
                          </td>
                          <td
                            className={`py-2 pr-4 text-right tabular-nums ${selected ? 'text-gold-lit' : 'text-dim'}`}
                          >
                            {fmtPct(rung.pct)}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-dim">
                            {fmtUSD(rung.dollars, 0)}
                          </td>
                          <td
                            className={`py-2 text-right tabular-nums ${over ? 'text-amber' : 'text-mint'}`}
                          >
                            {over ? `${(rung.pct / HOUSE_CAP).toFixed(1)}× over` : 'within'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 max-w-[68ch] font-mono text-2xs leading-relaxed text-mute">
                Full Kelly is growth-optimal only in the limit of infinite trials, exact knowledge of
                p, and complete tolerance for the path taken. None of those hold in practice. It also
                carries roughly a{' '}
                <span className="text-dim">1-in-n chance of an n-fold drawdown</span> at some point
                in a long sequence, which is why allocation committees size in fractions and overlay
                a hard per-trade cap — here {fmtPct(HOUSE_CAP, 0)} of NAV — on top of whatever the
                model returns. The binding constraint is always the lower of the two.
              </p>
            </section>

            {/* 3 — Scenario sensitivity */}
            <section>
              <Heading n="03">Scenario sensitivity — ±5pp on p</Heading>
              <div className="scroll-x">
                <table className="w-full min-w-[520px] border-collapse font-mono text-2xs">
                  <thead>
                    <tr className="border-b border-line text-left uppercase tracking-wider text-mute">
                      <th className="py-2 pr-4 font-normal">Scenario</th>
                      <th className="py-2 pr-4 text-right font-normal">p</th>
                      <th className="py-2 pr-4 text-right font-normal">Edge</th>
                      <th className="py-2 pr-4 text-right font-normal">f* full</th>
                      <th className="py-2 pr-4 text-right font-normal">f* half</th>
                      <th className="py-2 pr-4 text-right font-normal">f* quarter</th>
                      <th className="py-2 text-right font-normal">Median final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivity.map((r) => {
                      const isBase = r.delta === 0
                      return (
                        <tr
                          key={r.delta}
                          className={`border-b border-lineSoft ${isBase ? 'bg-chain/[0.06]' : ''}`}
                        >
                          <td className={`py-2 pr-4 ${isBase ? 'text-chain-lit' : 'text-dim'}`}>
                            {isBase
                              ? 'Base case'
                              : `p ${r.delta > 0 ? '+' : '−'}5pp`}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-dim">
                            {fmtPct(r.p, 1)}
                          </td>
                          <td
                            className={`py-2 pr-4 text-right tabular-nums ${r.edge > 0 ? 'text-mint' : 'text-danger'}`}
                          >
                            {fmtR(r.edge)}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-dim">
                            {fmtPct(r.full)}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-dim">
                            {fmtPct(r.half)}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-dim">
                            {fmtPct(r.quarter)}
                          </td>
                          <td
                            className={`py-2 text-right tabular-nums ${
                              Number.isFinite(r.medianFinal)
                                ? r.medianFinal >= capital
                                  ? 'text-mint'
                                  : 'text-danger'
                                : 'text-mute'
                            }`}
                          >
                            {Number.isFinite(r.medianFinal) ? fmtUSD(r.medianFinal, 0) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 max-w-[68ch] font-mono text-2xs leading-relaxed text-mute">
                {swing !== null ? (
                  <>
                    A five-point error in p — well inside the range of ordinary self-assessment error
                    — moves the optimal fraction by{' '}
                    <span className={swing > 0.4 ? 'text-amber' : 'text-dim'}>
                      up to {fmtPct(swing, 0)}
                    </span>{' '}
                    relative to the base case
                    {down && !down.viable
                      ? ', and on the downside removes the edge entirely'
                      : ''}
                    . The output of this model is not more precise than the assumption feeding it,
                    and quoting f* to two decimals does not make it so.
                  </>
                ) : (
                  <>
                    With no positive edge in the base case, the sensitivity grid exists to show what
                    the assumption would have to reach before any allocation is justified.
                  </>
                )}{' '}
                Median-final figures re-run the full simulation at each scenario on the same seed, so
                differences reflect the change in p rather than a different random draw.
              </p>
            </section>

            {/* 4 — Key risk factors */}
            <section>
              <Heading n="04">Key risk factors</Heading>
              <ul className="max-w-[68ch] space-y-2.5 font-mono text-2xs leading-relaxed text-dim">
                <li className="flex gap-3">
                  <span className="shrink-0 text-mute">01</span>
                  <span>
                    <span className="text-ink">Model risk.</span> p is an assumption supplied by the
                    user, not an estimate produced by this tool. It has not been backtested,
                    cross-validated, or measured against a trade log. Nothing downstream is more
                    reliable than that single number.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 text-mute">02</span>
                  <span>
                    <span className="text-ink">Path dependency.</span> Expected value says nothing
                    about the order in which returns arrive. This simulation shows an average maximum
                    drawdown of {fmtPct(stats.avgMaxDrawdown, 0)} and a worst observed path of{' '}
                    {fmtUSD(stats.worst, 0)}. A sequence that hits its drawdown early can force
                    de-risking before the edge has time to express.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 text-mute">03</span>
                  <span>
                    <span className="text-ink">Regime and correlation risk.</span> The model assumes
                    independent, identically distributed trades. Macro releases — NFP, CPI, FOMC —
                    are not stationary between prints, and {instrument.label} exposure correlates
                    with the broader dollar and rates complex rather than sitting in isolation.
                    Consecutive trades around the same catalyst are one position, not several.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 text-mute">04</span>
                  <span>
                    <span className="text-ink">Execution risk.</span> Every simulated trade fills
                    exactly at the stop or the target. Live, stops gap through on high-impact news
                    and spreads widen at the rollover and the release. Realised b is systematically
                    worse than modelled b, which biases f* high — before any commission is charged.
                  </span>
                </li>
                {ladder.houseCapBinds && (
                  <li className="flex gap-3">
                    <span className="shrink-0 text-mute">05</span>
                    <span>
                      <span className="text-ink">Cap override active.</span> The model requests{' '}
                      {fmtPct(ladder.selectedPct)} of NAV; the {fmtPct(HOUSE_CAP, 0)} per-trade limit
                      reduces the working size to {fmtPct(ladder.cappedPct)}. The figure below is the
                      capped one.
                    </span>
                  </li>
                )}
              </ul>
            </section>

            {/* 5 — Verdict */}
            <section className={`border-l-2 ${toneBorder} bg-raise/40 py-3 pl-4 pr-3`}>
              <p className="font-mono text-2xs font-semibold leading-relaxed tracking-wide sm:text-xs">
                <span className="text-mute">VERDICT:</span>{' '}
                <span className={toneText}>{tier.label.toUpperCase()}</span>
                <span className="text-dim">
                  {' '}
                  — position size capped at {fmtPct(verdictPct)} NAV (
                  {fmtUSD(verdictPct * capital, 0)}) pending live confirmation of edge.
                </span>
              </p>
              <p className="mt-1.5 font-mono text-[0.6rem] leading-relaxed text-mute">
                {tier.blurb}
              </p>
            </section>

            {/* Disclaimer */}
            <section className="border-t border-lineSoft pt-5">
              <p className="max-w-[80ch] font-mono text-[0.6rem] leading-relaxed text-mute">
                <span className="uppercase tracking-wider text-dim">Disclaimer.</span> This document
                is generated automatically by an educational simulator. It is not financial,
                investment or trading advice, and it is not a research product. The win probability{' '}
                <span className="text-dim">p</span> is a subjective figure entered by the user; it is
                not measured, forecast or validated by this tool, and every conclusion above inherits
                its error. Simulated results are not indicative of future performance. This project
                is an independent open-source exercise with no affiliation to, endorsement by, or
                connection with any bank, fund, exchange, brokerage or financial institution —
                including Citadel or any other firm whose house style the tone of this memo may
                resemble. Market prices shown elsewhere on this page come from free public APIs, may
                be delayed or incorrect, and must not be used for execution. Trade your own risk,
                with your own money, at your own judgement.
              </p>
            </section>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
