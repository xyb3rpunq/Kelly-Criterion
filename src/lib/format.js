/** Display formatting. Pure, and deliberately explicit about missing values. */

const DASH = '—'

export function fmtNum(v, decimals = 2) {
  if (!Number.isFinite(v)) return DASH
  return v.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtPct(v, decimals = 2) {
  if (!Number.isFinite(v)) return DASH
  return `${(v * 100).toFixed(decimals)}%`
}

export function fmtSignedPct(v, decimals = 2) {
  if (!Number.isFinite(v)) return DASH
  const s = (v * 100).toFixed(decimals)
  return `${v > 0 ? '+' : ''}${s}%`
}

export function fmtUSD(v, decimals = 0) {
  if (!Number.isFinite(v)) return DASH
  return `$${v.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

/**
 * Compact money for chart axes: $12.4k, $1.2M, $7.9B.
 * Compounding a positive edge over 120 trades reaches absurd magnitudes very
 * quickly, so this has to stay legible well past the millions.
 */
export function fmtUSDCompact(v) {
  if (!Number.isFinite(v)) return DASH
  const abs = Math.abs(v)
  if (abs >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

export function fmtR(v, decimals = 2) {
  if (!Number.isFinite(v)) return DASH
  return `${v > 0 ? '+' : ''}${v.toFixed(decimals)}R`
}

/** "12s ago" / "4m ago" — used to make quote staleness legible at a glance. */
export function fmtAge(ts, now = Date.now()) {
  if (!Number.isFinite(ts)) return DASH
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function fmtClock(ts) {
  if (!Number.isFinite(ts)) return DASH
  return new Date(ts).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  })
}
