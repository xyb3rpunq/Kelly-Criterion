import { motion } from 'framer-motion'
import { HOUSE_CAP } from '../lib/kelly.js'
import { buildSummary } from '../lib/i18n.jsx'
import { useT } from '../hooks/useLanguage.jsx'
import { fmtPct, fmtUSD, fmtR } from '../lib/format.js'

/**
 * Auto-generated risk memo.
 *
 * Every sentence is composed from the live simulation output — there is no
 * static prose describing results anywhere in this component. Tone is
 * deliberately flat: a desk memo states the number and the caveat, and does not
 * sell the trade. Both language variants live in lib/i18n.jsx so neither can
 * silently drift from the other.
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
      <span className="w-[5.5rem] shrink-0 font-mono text-2xs uppercase tracking-wider text-mute">
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
  const t = useT()

  const summary = buildSummary(t, {
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

  const tierCopy = t.tiers[tier.id]
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

  const risks = t.memo.risks({
    avgDD: fmtPct(stats.avgMaxDrawdown, 0),
    worst: fmtUSD(stats.worst, 0),
    instrument: instrument.label,
  })
  if (ladder.houseCapBinds) {
    risks.push(
      t.memo.riskCapOverride(
        fmtPct(ladder.selectedPct),
        fmtPct(ladder.cappedPct),
        fmtPct(HOUSE_CAP, 0),
      ),
    )
  }

  return (
    <motion.section
      id="memo"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div className="hairline hairline-mute rounded-lg bg-panel shadow-panel">
        <div className={`relative z-10 rounded-l-lg border-l-2 ${toneBorder}`}>
          {/* Memo letterhead */}
          <header className="border-b border-lineSoft px-5 py-4 sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow mb-1.5">{t.memo.eyebrow}</p>
                <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                  {t.memo.title}
                </h2>
              </div>
              <span
                className={`rounded border px-2.5 py-1 font-mono text-2xs uppercase tracking-wider ${toneText} ${toneBorder}/50`}
              >
                {tierCopy.label}
              </span>
            </div>

            <div className="mt-4 grid gap-x-8 gap-y-0.5 sm:grid-cols-2">
              <Row label={t.memo.subject}>
                {instrument.label} · {instrument.name}
              </Row>
              <Row label={t.memo.method}>{t.memo.methodValue}</Row>
              <Row label={t.memo.inputs}>
                {t.memo.inputsValue(
                  fmtPct(p, 1),
                  rr.valid ? rr.b.toFixed(3) : '—',
                  fmtUSD(capital, 0),
                )}
              </Row>
              <Row label={t.memo.sample}>{t.memo.sampleValue(stats.paths, trades, seed)}</Row>
            </div>
          </header>

          <div className="space-y-7 px-5 py-6 sm:px-7">
            {/* 1 — Executive summary */}
            <section>
              <Heading n="01">{t.memo.h1}</Heading>
              <p className="max-w-[68ch] font-mono text-xs leading-relaxed text-dim">{summary}</p>
            </section>

            {/* 2 — Risk-adjusted sizing */}
            <section>
              <Heading n="02">{t.memo.h2}</Heading>
              <div className="scroll-x">
                <table className="w-full min-w-[460px] border-collapse font-mono text-2xs">
                  <thead>
                    <tr className="border-b border-line text-left uppercase tracking-wider text-mute">
                      <th className="py-2 pr-4 font-normal">{t.memo.thAllocation}</th>
                      <th className="py-2 pr-4 text-right font-normal">{t.memo.thPctNav}</th>
                      <th className="py-2 pr-4 text-right font-normal">{t.memo.thRisk}</th>
                      <th className="py-2 text-right font-normal">{t.memo.thVsCap}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [t.memo.fullKelly, ladder.full, 'full'],
                      [t.memo.halfKelly, ladder.half, 'half'],
                      [t.memo.quarterKelly, ladder.quarter, 'quarter'],
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
                            {selected && <span className="ml-2 text-mute">{t.memo.applied}</span>}
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
                            {over
                              ? t.memo.over((rung.pct / HOUSE_CAP).toFixed(1))
                              : t.memo.within}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 max-w-[68ch] font-mono text-2xs leading-relaxed text-mute">
                {t.memo.sizingNote(fmtPct(HOUSE_CAP, 0))}
              </p>
            </section>

            {/* 3 — Scenario sensitivity */}
            <section>
              <Heading n="03">{t.memo.h3}</Heading>
              <div className="scroll-x">
                <table className="w-full min-w-[540px] border-collapse font-mono text-2xs">
                  <thead>
                    <tr className="border-b border-line text-left uppercase tracking-wider text-mute">
                      <th className="py-2 pr-4 font-normal">{t.memo.thScenario}</th>
                      <th className="py-2 pr-4 text-right font-normal">p</th>
                      <th className="py-2 pr-4 text-right font-normal">{t.memo.thEdge}</th>
                      <th className="py-2 pr-4 text-right font-normal">f* {t.prob.full}</th>
                      <th className="py-2 pr-4 text-right font-normal">f* {t.prob.half}</th>
                      <th className="py-2 pr-4 text-right font-normal">f* {t.prob.quarter}</th>
                      <th className="py-2 text-right font-normal">{t.memo.thMedianFinal}</th>
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
                              ? t.memo.baseCase
                              : t.memo.scenarioShift(r.delta > 0 ? '+' : '−')}
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
                {swing !== null
                  ? t.memo.sensitivityNote(fmtPct(swing, 0), swing > 0.4, down && !down.viable)
                  : t.memo.sensitivityNoEdge}{' '}
                {t.memo.sensitivityMethod}
              </p>
            </section>

            {/* 4 — Key risk factors */}
            <section>
              <Heading n="04">{t.memo.h4}</Heading>
              <ul className="max-w-[68ch] space-y-2.5 font-mono text-2xs leading-relaxed text-dim">
                {risks.map((risk, i) => (
                  <li key={risk.head} className="flex gap-3">
                    <span className="shrink-0 text-mute">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <span className="text-ink">{risk.head}</span> {risk.body}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 5 — Verdict */}
            <section className={`border-l-2 ${toneBorder} bg-raise/40 py-3 pl-4 pr-3`}>
              <p className="font-mono text-2xs font-semibold leading-relaxed tracking-wide sm:text-xs">
                <span className="text-mute">{t.memo.verdictLabel}</span>{' '}
                <span className={toneText}>{tierCopy.label.toUpperCase()}</span>
                <span className="text-dim">
                  {t.memo.verdictTail(fmtPct(verdictPct), fmtUSD(verdictPct * capital, 0))}
                </span>
              </p>
              <p className="mt-1.5 font-mono text-[0.6rem] leading-relaxed text-mute">
                {tierCopy.blurb}
              </p>
            </section>

            {/* Disclaimer */}
            <section className="border-t border-lineSoft pt-5">
              <p className="max-w-[80ch] font-mono text-[0.6rem] leading-relaxed text-mute">
                <span className="uppercase tracking-wider text-dim">{t.memo.disclaimerLabel}</span>{' '}
                {t.memo.disclaimer}
              </p>
            </section>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
