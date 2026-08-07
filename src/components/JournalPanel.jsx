import { useRef, useState } from 'react'
import { INSTRUMENT_BY_ID } from '../lib/market.js'
import { journalStats, worstLosingStreak, exportJournal, importJournal } from '../lib/journal.js'
import { useT } from '../hooks/useLanguage.jsx'
import { fmtNum, fmtPct } from '../lib/format.js'
import { MotionPanel } from './ui/Panel.jsx'
import { Pill } from './ui/Stat.jsx'

const QUICK = [-1, -0.5, 0, 1, 2, 3]

function Figure({ label, value, tone = 'text-ink', hint }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <p className={`font-mono text-sm ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 font-mono text-[0.6rem] text-mute">{hint}</p>}
    </div>
  )
}

export function JournalPanel({ entries, onAdd, onRemove, onClear, onMerge, instrumentId, scope, onScope }) {
  const t = useT()
  const [r, setR] = useState('')
  const [note, setNote] = useState('')
  const [importError, setImportError] = useState(null)
  const fileRef = useRef(null)

  const filterId = scope === 'instrument' ? instrumentId : null
  const stats = journalStats(entries, filterId)
  const streak = worstLosingStreak(entries, filterId)

  const visible = filterId ? entries.filter((e) => e.instrument === filterId) : entries

  const submit = (value) => {
    const num = Number(value)
    if (!Number.isFinite(num)) return
    onAdd({ instrument: instrumentId, r: num, note })
    setR('')
    setNote('')
  }

  const download = () => {
    const blob = new Blob([exportJournal(entries)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kelly-journal-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const upload = async (file) => {
    setImportError(null)
    if (!file) return
    const { entries: parsed, error } = importJournal(await file.text())
    if (error) {
      setImportError(t.journal.importErrors[error] || error)
      return
    }
    onMerge(parsed)
  }

  const expTone =
    stats.expectancyR === null ? 'text-mute' : stats.expectancyR > 0 ? 'text-mint' : 'text-danger'

  return (
    <MotionPanel
      eyebrow={t.journal.eyebrow}
      title={t.journal.title}
      aside={
        <Pill tone={stats.decided >= 30 ? 'mint' : stats.decided > 0 ? 'amber' : 'dim'}>
          {t.journal.nTrades(stats.total)}
        </Pill>
      }
    >
      <div className="space-y-4 p-4">
        <p className="border-l-2 border-mint/50 pl-3 text-2xs leading-relaxed text-dim">
          <span className="font-mono uppercase tracking-wider text-mint">{t.journal.whyLabel}</span>{' '}
          {t.journal.why}
        </p>

        {/* Log a result */}
        <div>
          <div className="mb-1.5 flex items-end justify-between gap-2">
            <label
              htmlFor="journal-r"
              className="font-mono text-2xs uppercase tracking-terminal text-mute"
            >
              {t.journal.rLabel(INSTRUMENT_BY_ID[instrumentId].label)}
            </label>
            <span className="font-mono text-[0.6rem] text-mute">{t.journal.rHint}</span>
          </div>

          <div className="flex gap-2">
            <input
              id="journal-r"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={r}
              placeholder="-1.0"
              onChange={(ev) => setR(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') submit(r)
              }}
              className="no-spin min-w-0 flex-1 rounded border border-line bg-raise px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mint/50"
            />
            <button
              type="button"
              onClick={() => submit(r)}
              disabled={!Number.isFinite(Number(r)) || r === ''}
              className="shrink-0 rounded border border-mint/40 bg-mint/10 px-3 py-2 font-mono text-2xs uppercase tracking-wider text-mint transition-all hover:border-mint/70 hover:shadow-glow-mint disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.journal.add}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => submit(q)}
                className={`rounded border px-2 py-1 font-mono text-[0.6rem] transition-colors ${
                  q > 0
                    ? 'border-line bg-raise text-mint/80 hover:border-mint/50'
                    : q < 0
                      ? 'border-line bg-raise text-danger/80 hover:border-danger/50'
                      : 'border-line bg-raise text-mute hover:border-mute'
                }`}
              >
                {q > 0 ? `+${q}R` : `${q}R`}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={note}
            maxLength={140}
            placeholder={t.journal.notePlaceholder}
            onChange={(ev) => setNote(ev.target.value)}
            aria-label={t.journal.noteLabel}
            className="mt-2 w-full rounded border border-line bg-raise px-3 py-1.5 font-mono text-2xs text-dim outline-none transition-colors placeholder:text-mute focus:border-line"
          />
        </div>

        {/* Measured statistics */}
        <div className="border-t border-lineSoft pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="eyebrow">{t.journal.measured}</p>
            <div className="flex gap-1">
              {['all', 'instrument'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onScope(s)}
                  aria-pressed={scope === s}
                  className={`rounded border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider transition-colors ${
                    scope === s
                      ? 'border-gold/45 bg-gold/10 text-gold-lit'
                      : 'border-line bg-raise text-mute hover:text-dim'
                  }`}
                >
                  {s === 'all' ? t.journal.scopeAll : INSTRUMENT_BY_ID[instrumentId].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-x-3 gap-y-4">
            <Figure
              label={t.journal.measuredP}
              value={stats.measuredP === null ? '—' : fmtPct(stats.measuredP, 1)}
              tone="text-gold-lit"
              hint={t.journal.decided(stats.wins, stats.losses)}
            />
            <Figure
              label={t.journal.measuredB}
              value={stats.measuredB === null ? '—' : stats.measuredB.toFixed(2)}
              tone="text-gold-lit"
              hint={
                stats.avgWin !== null && stats.avgLoss
                  ? `+${stats.avgWin.toFixed(2)} / −${stats.avgLoss.toFixed(2)}`
                  : t.journal.needBoth
              }
            />
            <Figure
              label={t.journal.expectancy}
              value={stats.expectancyR === null ? '—' : `${stats.expectancyR > 0 ? '+' : ''}${stats.expectancyR.toFixed(2)}R`}
              tone={expTone}
            />
            <Figure
              label={t.journal.totalR}
              value={`${stats.totalR > 0 ? '+' : ''}${fmtNum(stats.totalR, 1)}R`}
              tone={stats.totalR >= 0 ? 'text-mint' : 'text-danger'}
            />
            <Figure
              label={t.journal.streak}
              value={streak ? `${streak}` : '—'}
              tone={streak >= 5 ? 'text-danger' : 'text-dim'}
            />
            <Figure
              label={t.journal.scratches}
              value={`${stats.scratches}`}
              tone="text-dim"
            />
          </div>
        </div>

        {/* Ledger */}
        {visible.length > 0 && (
          <div className="border-t border-lineSoft pt-4">
            <p className="eyebrow mb-2">{t.journal.ledger}</p>
            <ul className="max-h-52 space-y-1 overflow-y-auto pr-1">
              {visible.map((e) => (
                <li
                  key={e.id}
                  className="group flex items-center gap-2 rounded border border-line bg-raise/50 px-2.5 py-1.5"
                >
                  <span
                    className={`w-12 shrink-0 font-mono text-2xs font-semibold tabular-nums ${
                      e.r > 0 ? 'text-mint' : e.r < 0 ? 'text-danger' : 'text-mute'
                    }`}
                  >
                    {e.r > 0 ? '+' : ''}
                    {Number(e.r).toFixed(2)}R
                  </span>
                  <span className="shrink-0 font-mono text-[0.6rem] uppercase text-mute">
                    {INSTRUMENT_BY_ID[e.instrument]?.label || e.instrument}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[0.6rem] text-dim">
                    {e.note}
                  </span>
                  <span className="shrink-0 font-mono text-[0.6rem] text-mute">
                    {new Date(e.ts).toISOString().slice(5, 10)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(e.id)}
                    aria-label={t.journal.removeOne}
                    className="shrink-0 rounded px-1 font-mono text-2xs text-mute opacity-0 transition-opacity hover:text-danger focus:opacity-100 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Data controls */}
        <div className="flex flex-wrap items-center gap-2 border-t border-lineSoft pt-4">
          <button
            type="button"
            onClick={download}
            disabled={!entries.length}
            className="rounded border border-line bg-raise px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-dim transition-colors hover:border-chain/50 hover:text-chain-lit disabled:opacity-40"
          >
            {t.journal.export}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded border border-line bg-raise px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-dim transition-colors hover:border-chain/50 hover:text-chain-lit"
          >
            {t.journal.import}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(ev) => {
              upload(ev.target.files?.[0])
              ev.target.value = ''
            }}
          />
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t.journal.clearConfirm)) onClear()
              }}
              className="ml-auto rounded border border-line bg-raise px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-mute transition-colors hover:border-danger/50 hover:text-danger"
            >
              {t.journal.clear}
            </button>
          )}
        </div>

        {importError && <p className="text-2xs text-danger">{importError}</p>}

        <p className="font-mono text-[0.6rem] leading-relaxed text-mute">{t.journal.privacy}</p>
      </div>
    </MotionPanel>
  )
}
