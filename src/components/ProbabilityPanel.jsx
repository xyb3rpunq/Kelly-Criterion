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
  const pct = p * 100
  const aboveBreakEven = Number.isFinite(breakEvenP) && p > breakEvenP
  const bePct = Number.isFinite(breakEvenP) ? breakEvenP * 100 : null

  // Fill the slider track up to the handle, and mark break-even on it.
  const track = `linear-gradient(to right, rgba(212,175,55,0.75) 0%, rgba(212,175,55,0.75) ${pct}%, #1A2030 ${pct}%, #1A2030 100%)`

  return (
    <MotionPanel
      eyebrow="Step 02 · Subjective assumption"
      title="Win probability"
      aside={
        <Pill tone={aboveBreakEven ? 'mint' : 'danger'}>
          {aboveBreakEven ? 'above break-even' : 'below break-even'}
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
              p — your estimate
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
            aria-valuetext={`${pct.toFixed(1)} percent win probability`}
            aria-describedby="p-help"
          />

          <div className="flex justify-between font-mono text-[0.6rem] text-mute">
            <span>1%</span>
            {bePct !== null && (
              <span className={aboveBreakEven ? 'text-mint' : 'text-danger'}>
                break-even {bePct.toFixed(1)}%
              </span>
            )}
            <span>99%</span>
          </div>

          <p id="p-help" className="mt-3 border-l-2 border-chain/50 pl-3 text-2xs leading-relaxed text-dim">
            <span className="font-mono uppercase tracking-wider text-chain-lit">Read this.</span>{' '}
            This number is <em className="not-italic text-ink">your assumption</em>. Nothing in this
            app measures, backtests or forecasts it. Every figure below — the optimal fraction, the
            equity curves, the verdict — is only as good as this one input, and it is far more
            sensitive to it than most people expect. The sensitivity table in the risk memo shows
            exactly how much.
          </p>
        </div>

        <div className="border-t border-lineSoft pt-4">
          <Segmented
            label="Kelly fraction applied"
            name="fraction"
            tone="chain"
            value={fractionKey}
            onChange={onFraction}
            options={[
              { value: 'full', label: 'Full' },
              { value: 'half', label: 'Half' },
              { value: 'quarter', label: 'Quarter' },
            ]}
          />
          <p className="mt-2.5 text-2xs leading-relaxed text-mute">
            Full Kelly maximises long-run growth rate but produces drawdowns most desks — and most
            people — cannot sit through. Fractional Kelly gives up a little expected growth for a
            large reduction in path volatility.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-lineSoft pt-4">
          <div>
            <p className="eyebrow mb-1">Edge</p>
            <p
              className={`font-mono text-sm ${
                kelly.edge > 0 ? 'text-mint' : kelly.edge < 0 ? 'text-danger' : 'text-mute'
              }`}
            >
              {fmtR(kelly.edge)}
            </p>
          </div>
          <div>
            <p className="eyebrow mb-1">f* full</p>
            <p className="font-mono text-sm text-gold-lit">{fmtPct(kelly.f, 2)}</p>
          </div>
          <div>
            <p className="eyebrow mb-1">Loss rate q</p>
            <p className="font-mono text-sm text-dim">{fmtPct(1 - p, 1)}</p>
          </div>
        </div>
      </div>
    </MotionPanel>
  )
}
