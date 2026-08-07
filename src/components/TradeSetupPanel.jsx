import { INSTRUMENT_BY_ID } from '../lib/market.js'
import { useT } from '../hooks/useLanguage.jsx'
import { fmtNum, fmtUSD } from '../lib/format.js'
import { MotionPanel } from './ui/Panel.jsx'
import { NumberField, Segmented } from './ui/Field.jsx'
import { Pill } from './ui/Stat.jsx'

export function TradeSetupPanel({ setup, onChange, rr, instrumentId, quote, onSyncPrice }) {
  const t = useT()
  const inst = INSTRUMENT_BY_ID[instrumentId]
  const dp = inst.decimals
  const isBuy = setup.direction === 'buy'

  const set = (key) => (value) => onChange({ ...setup, [key]: value })

  const stopWrongSide = rr.risk <= 0 && setup.entry !== '' && setup.stop !== ''
  const targetWrongSide = rr.reward <= 0 && setup.entry !== '' && setup.target !== ''
  // App clamps capital to a floor of 1 so nothing downstream divides by zero;
  // say so here rather than silently reporting a $1 account.
  const capitalInvalid = !(Number(setup.capital) > 0)

  const livePrice = quote?.price

  return (
    <MotionPanel
      eyebrow={t.setup.eyebrow}
      title={t.setup.title}
      aside={
        <Pill tone={rr.valid ? 'gold' : 'danger'}>
          {rr.valid ? `R:R  1 : ${rr.b.toFixed(2)}` : t.setup.invalid}
        </Pill>
      }
    >
      <div className="space-y-4 p-4">
        <Segmented
          label={t.setup.direction}
          name="direction"
          value={setup.direction}
          onChange={set('direction')}
          options={[
            { value: 'buy', label: t.setup.buy },
            { value: 'sell', label: t.setup.sell },
          ]}
        />

        <div>
          <div className="mb-1.5 flex items-end justify-between gap-2">
            <span className="font-mono text-2xs uppercase tracking-terminal text-mute">
              {t.setup.instrument}
            </span>
            <button
              type="button"
              onClick={onSyncPrice}
              disabled={!Number.isFinite(livePrice)}
              className="rounded border border-line bg-raise px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-dim transition-colors hover:border-chain/50 hover:text-chain-lit disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.setup.sync}
            </button>
          </div>
          <div className="flex items-baseline justify-between rounded border border-line bg-raise px-3 py-2.5">
            <span className="font-mono text-sm text-ink">{inst.label}</span>
            <span className="font-mono text-2xs text-mute">
              {Number.isFinite(livePrice) ? fmtNum(livePrice, dp) : '—'}
            </span>
          </div>
        </div>

        <NumberField
          label={t.setup.entry}
          value={setup.entry}
          onChange={set('entry')}
          step={Math.pow(10, -dp).toFixed(dp)}
          suffix={inst.unit}
        />

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label={t.setup.stop}
            value={setup.stop}
            onChange={set('stop')}
            step={Math.pow(10, -dp).toFixed(dp)}
            invalid={stopWrongSide}
            hint={stopWrongSide ? t.setup.stopSide(isBuy) : t.setup.riskHint(fmtNum(rr.risk, dp))}
          />
          <NumberField
            label={t.setup.target}
            value={setup.target}
            onChange={set('target')}
            step={Math.pow(10, -dp).toFixed(dp)}
            invalid={targetWrongSide}
            hint={
              targetWrongSide
                ? t.setup.targetSide(isBuy)
                : t.setup.rewardHint(fmtNum(rr.reward, dp))
            }
          />
        </div>

        <NumberField
          label={t.setup.capital}
          value={setup.capital}
          onChange={set('capital')}
          step="100"
          min="1"
          suffix="USD"
          invalid={capitalInvalid}
          hint={
            capitalInvalid
              ? t.setup.capitalInvalid
              : t.setup.capitalHint(fmtUSD(Number(setup.capital)))
          }
        />

        <div className="grid grid-cols-3 gap-2 border-t border-lineSoft pt-4">
          <div>
            <p className="eyebrow mb-1">{t.setup.riskUnit}</p>
            <p className="font-mono text-sm text-ink">{fmtNum(rr.risk, dp)}</p>
          </div>
          <div>
            <p className="eyebrow mb-1">{t.setup.rewardUnit}</p>
            <p className="font-mono text-sm text-ink">{fmtNum(rr.reward, dp)}</p>
          </div>
          <div>
            <p className="eyebrow mb-1">
              b <span className="normal-case tracking-normal">({t.setup.netOdds})</span>
            </p>
            <p className="font-mono text-sm text-gold-lit">{rr.valid ? rr.b.toFixed(3) : '—'}</p>
          </div>
        </div>
      </div>
    </MotionPanel>
  )
}
