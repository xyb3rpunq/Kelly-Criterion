import { useT } from '../hooks/useLanguage.jsx'
import { fmtPct, fmtR } from '../lib/format.js'
import { MotionPanel } from './ui/Panel.jsx'
import { Segmented } from './ui/Field.jsx'
import { Pill } from './ui/Stat.jsx'

/**
 * The subjective input. Everything downstream inherits whatever is set here,
 * which is exactly why the panel says so out loud rather than burying it in a
 * footnote.
 */
export function ProbabilityPanel({ p, onP, fractionKey, onFraction, kelly, breakEvenP }) {
  const t = useT()
  const pct = p * 100
  const aboveBreakEven = Number.isFinite(breakEvenP) && p > breakEvenP
  const bePct = Number.isFinite(breakEvenP) ? breakEvenP * 100 : null

  // Fill the slider track up to the handle.
  const track = `linear-gradient(to right, rgba(212,175,55,0.75) 0%, rgba(212,175,55,0.75) ${pct}%, #1A2030 ${pct}%, #1A2030 100%)`

  return (
    <MotionPanel
      eyebrow={t.prob.eyebrow}
      title={t.prob.title}
      aside={
        <Pill tone={aboveBreakEven ? 'mint' : 'danger'}>
          {aboveBreakEven ? t.prob.above : t.prob.below}
        </Pill>
      }
    >
      <div className="space-y-5 p-4">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label
              htmlFor="p-slider"
              className="font-mono text-2xs uppercase tracking-terminal text-mute"
            >
              {t.prob.pLabel}
            </label>
            <span className="font-mono text-2xl font-semibold leading-none text-gold-lit">
              {pct.toFixed(1)}%
            </span>
          </div>

          <input
            id="p-slider"
            type="range"
            className="slider"
            min="1"
            max="99"
            step="0.5"
            value={pct}
            style={{ '--track': track }}
            onChange={(e) => onP(Number(e.target.value) / 100)}
            aria-valuetext={t.a11y.pSlider(pct.toFixed(1))}
            aria-describedby="p-help"
          />

          <div className="flex justify-between font-mono text-[0.6rem] text-mute">
            <span>1%</span>
            {bePct !== null && (
              <span className={aboveBreakEven ? 'text-mint' : 'text-danger'}>
                {t.prob.breakEven(`${bePct.toFixed(1)}%`)}
              </span>
            )}
            <span>99%</span>
          </div>

          <p
            id="p-help"
            className="mt-3 border-l-2 border-chain/50 pl-3 text-2xs leading-relaxed text-dim"
          >
            <span className="font-mono uppercase tracking-wider text-chain-lit">
              {t.prob.readThis}
            </span>{' '}
            {t.prob.readBody}
          </p>
        </div>

        <div className="border-t border-lineSoft pt-4">
          <Segmented
            label={t.prob.fractionLabel}
            name="fraction"
            tone="chain"
            value={fractionKey}
            onChange={onFraction}
            options={[
              { value: 'full', label: t.prob.full },
              { value: 'half', label: t.prob.half },
              { value: 'quarter', label: t.prob.quarter },
            ]}
          />
          <p className="mt-2.5 text-2xs leading-relaxed text-mute">{t.prob.fractionNote}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-lineSoft pt-4">
          <div>
            <p className="eyebrow mb-1">{t.prob.edge}</p>
            <p
              className={`font-mono text-sm ${
                kelly.edge > 0 ? 'text-mint' : kelly.edge < 0 ? 'text-danger' : 'text-mute'
              }`}
            >
              {fmtR(kelly.edge)}
            </p>
          </div>
          <div>
            <p className="eyebrow mb-1">{t.prob.fFull}</p>
            <p className="font-mono text-sm text-gold-lit">{fmtPct(kelly.f, 2)}</p>
          </div>
          <div>
            <p className="eyebrow mb-1">{t.prob.lossRate}</p>
            <p className="font-mono text-sm text-dim">{fmtPct(1 - p, 1)}</p>
          </div>
        </div>
      </div>
    </MotionPanel>
  )
}
