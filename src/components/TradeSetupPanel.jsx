import { INSTRUMENT_BY_ID } from '../lib/market.js'
import { fmtNum, fmtUSD } from '../lib/format.js'
import { MotionPanel } from './ui/Panel.jsx'
import { NumberField, Segmented } from './ui/Field.jsx'
import { Pill } from './ui/Stat.jsx'

export function TradeSetupPanel({ setup, onChange, rr, instrumentId, quote, onSyncPrice }) {
  const inst = INSTRUMENT_BY_ID[instrumentId]
  const dp = inst.decimals

  const set = (key) => (value) => onChange({ ...setup, [key]: value })

  const stopWrongSide =
    rr.risk <= 0 && setup.entry !== '' && setup.stop !== ''
  const targetWrongSide =
    rr.reward <= 0 && setup.entry !== '' && setup.target !== ''

  const livePrice = quote?.price

  return (
    <MotionPanel
      eyebrow="Step 01 · Trade geometry"
      title="Trade setup"
      aside={
        <Pill tone={rr.valid ? 'gold' : 'danger'}>
          {rr.valid ? `R:R  1 : ${rr.b.toFixed(2)}` : 'invalid'}
        </Pill>
      }
    >
      <div className="space-y-4 p-4">
        <Segmented
          label="Direction"
          name="direction"
          value={setup.direction}
          onChange={set('direction')}
          options={[
            { value: 'buy', label: 'Buy / Long' },
            { value: 'sell', label: 'Sell / Short' },
          ]}
        />

        <div>
          <div className="mb-1.5 flex items-end justify-between gap-2">
            <span className="font-mono text-2xs uppercase tracking-terminal text-mute">
              Instrument
            </span>
            <button
              type="button"
              onClick={onSyncPrice}
              disabled={!Number.isFinite(livePrice)}
              className="rounded border border-line bg-raise px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-dim transition-colors hover:border-chain/50 hover:text-chain-lit disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sync entry to market
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
          label="Entry price"
          value={setup.entry}
          onChange={set('entry')}
          step={Math.pow(10, -dp).toFixed(dp)}
          suffix={inst.unit}
        />

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Stop loss"
            value={setup.stop}
            onChange={set('stop')}
            step={Math.pow(10, -dp).toFixed(dp)}
            invalid={stopWrongSide}
            hint={
              stopWrongSide
                ? `Stop must sit ${setup.direction === 'buy' ? 'below' : 'above'} entry`
                : `Risk ${fmtNum(rr.risk, dp)}`
            }
          />
          <NumberField
            label="Take profit"
            value={setup.target}
            onChange={set('target')}
            step={Math.pow(10, -dp).toFixed(dp)}
            invalid={targetWrongSide}
            hint={
              targetWrongSide
                ? `Target must sit ${setup.direction === 'buy' ? 'above' : 'below'} entry`
                : `Reward ${fmtNum(rr.reward, dp)}`
            }
          />
        </div>

        <NumberField
          label="Account capital"
          value={setup.capital}
          onChange={set('capital')}
          step="100"
          min="1"
          suffix="USD"
          hint={`Sizing is expressed against ${fmtUSD(Number(setup.capital) || 0)} of NAV`}
        />

        <div className="grid grid-cols-3 gap-2 border-t border-lineSoft pt-4">
          <div>
            <p className="eyebrow mb-1">Risk / unit</p>
            <p className="font-mono text-sm text-ink">{fmtNum(rr.risk, dp)}</p>
          </div>
          <div>
            <p className="eyebrow mb-1">Reward / unit</p>
            <p className="font-mono text-sm text-ink">{fmtNum(rr.reward, dp)}</p>
          </div>
          <div>
            <p className="eyebrow mb-1">
              b <span className="normal-case tracking-normal">(net odds)</span>
            </p>
            <p className="font-mono text-sm text-gold-lit">{rr.valid ? rr.b.toFixed(3) : '—'}</p>
          </div>
        </div>
      </div>
    </MotionPanel>
  )
}
