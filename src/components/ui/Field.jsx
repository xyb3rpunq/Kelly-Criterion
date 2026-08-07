import { useId } from 'react'

/** Labelled numeric input. Monospace, because these are data, not prose. */
export function NumberField({
  label,
  value,
  onChange,
  step = '0.01',
  min,
  max,
  suffix,
  hint,
  invalid = false,
  disabled = false,
}) {
  const id = useId()
  const hintId = `${id}-hint`

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-2xs uppercase tracking-terminal text-mute"
      >
        {label}
      </label>
      <div
        className={`flex items-center gap-2 rounded border bg-raise px-3 transition-colors ${
          invalid ? 'border-danger/60' : 'border-line focus-within:border-gold/50'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className="no-spin w-full bg-transparent py-2.5 font-mono text-sm text-ink outline-none placeholder:text-mute"
          value={value}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={hint ? hintId : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="shrink-0 font-mono text-2xs text-mute">{suffix}</span>}
      </div>
      {hint && (
        <p id={hintId} className={`mt-1.5 text-2xs ${invalid ? 'text-danger' : 'text-mute'}`}>
          {hint}
        </p>
      )}
    </div>
  )
}

/**
 * Segmented control built from real radio inputs, so arrow-key navigation and
 * screen-reader grouping work without any JavaScript of ours.
 */
export function Segmented({ label, options, value, onChange, name, tone = 'gold' }) {
  const groupName = useId()

  const active =
    tone === 'gold'
      ? 'bg-gold/12 text-gold-lit border-gold/45 shadow-glow-gold'
      : 'bg-chain/12 text-chain-lit border-chain/45 shadow-glow-chain'

  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 font-mono text-2xs uppercase tracking-terminal text-mute">
        {label}
      </legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1.5">
        {options.map((opt) => {
          const checked = value === opt.value
          return (
            <label
              key={opt.value}
              className={`relative cursor-pointer rounded border px-2 py-2 text-center font-mono text-2xs uppercase tracking-wider transition-all duration-150 ${
                checked
                  ? active
                  : 'border-line bg-raise text-dim hover:border-mute/50 hover:text-ink'
              }`}
            >
              <input
                type="radio"
                name={name || groupName}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              {opt.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
