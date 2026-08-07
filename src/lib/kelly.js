/**
 * Pure Kelly Criterion maths. No React, no DOM, no side effects.
 * Everything here is deterministic given its arguments (Monte Carlo included —
 * it takes an explicit seed) so it can be unit-tested directly.
 */

/** Equity is considered "ruined" once it falls to this share of starting capital. */
export const RUIN_LEVEL = 0.5

/** House cap most desks apply on top of any model output, as a share of NAV. */
export const HOUSE_CAP = 0.02

export const FRACTION_PRESETS = {
  full: { label: 'Full', multiplier: 1 },
  half: { label: 'Half', multiplier: 0.5 },
  quarter: { label: 'Quarter', multiplier: 0.25 },
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/**
 * Reward-to-risk ratio (`b` in the Kelly formula) from a concrete trade setup.
 * `b` is net odds: how many units you win per unit risked.
 *
 * @returns {{ risk: number, reward: number, b: number, valid: boolean }}
 */
export function computeRR({ entry, stop, target, direction }) {
  const e = Number(entry)
  const s = Number(stop)
  const t = Number(target)
  if (![e, s, t].every(Number.isFinite)) {
    return { risk: 0, reward: 0, b: 0, valid: false }
  }

  // A long risks the distance down to the stop and wins the distance up to the
  // target; a short is the mirror image. Both must be positive for the setup to
  // make sense (stop on the wrong side is a user error, not a negative b).
  const risk = direction === 'buy' ? e - s : s - e
  const reward = direction === 'buy' ? t - e : e - t

  const valid = risk > 0 && reward > 0
  return {
    risk: Math.max(risk, 0),
    reward: Math.max(reward, 0),
    b: valid ? reward / risk : 0,
    valid,
  }
}

/**
 * Kelly optimal fraction: f* = (p·b − q) / b, with q = 1 − p.
 *
 * @param {number} p win probability, 0..1 (a user assumption, never a measurement)
 * @param {number} b net reward-to-risk odds
 */
export function calculateKelly(p, b) {
  const q = 1 - p
  const valid = Number.isFinite(p) && Number.isFinite(b) && b > 0 && p >= 0 && p <= 1

  if (!valid) {
    return { f: 0, fRaw: 0, edge: 0, expectancyR: 0, breakEvenP: NaN, valid: false }
  }

  // Edge in R-multiples: the expected number of risk-units gained per trade.
  const edge = p * b - q
  const fRaw = edge / b

  return {
    // A negative f* means "bet the other side" — meaningless here, so it floors
    // at zero. It is capped just under 1 so a full-Kelly path cannot hit exactly
    // -100% and produce a hard zero in the compounding loop.
    f: clamp(fRaw, 0, 0.99),
    fRaw,
    edge,
    expectancyR: edge,
    breakEvenP: 1 / (1 + b),
    valid: true,
  }
}

/** mulberry32 — small, fast, seedable PRNG so "re-roll" is reproducible. */
export function makeRng(seed) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function quantile(sortedAsc, q) {
  if (sortedAsc.length === 0) return 0
  const pos = (sortedAsc.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sortedAsc[lo]
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (pos - lo)
}

/**
 * Monte Carlo over a sequence of independent, identically-sized bets.
 *
 * Sizing is multiplicative (risk a fixed *fraction of current equity* each
 * trade), which is what Kelly actually assumes — that is why a losing streak
 * shrinks the bet rather than marching straight to zero.
 *
 * A path that reaches the ruin level stops trading and flatlines: a desk that
 * halves its NAV is shut down, not left to recover.
 */
export function runMonteCarlo({
  p,
  b,
  fraction,
  trades = 100,
  paths = 24,
  capital = 10000,
  seed = 1,
  ruinLevel = RUIN_LEVEL,
}) {
  const f = clamp(Number(fraction) || 0, 0, 0.99)
  const ruinFloor = capital * ruinLevel
  const rng = makeRng(seed)

  const series = []
  const finals = []
  const maxDrawdowns = []
  let ruinCount = 0
  let profitCount = 0

  for (let i = 0; i < paths; i += 1) {
    const curve = new Array(trades + 1)
    curve[0] = capital

    let equity = capital
    let peak = capital
    let maxDD = 0
    let ruined = false

    for (let t = 1; t <= trades; t += 1) {
      if (!ruined && f > 0) {
        equity *= rng() < p ? 1 + f * b : 1 - f
        if (equity > peak) peak = equity
        const dd = peak > 0 ? (peak - equity) / peak : 0
        if (dd > maxDD) maxDD = dd
        if (equity <= ruinFloor) ruined = true
      }
      curve[t] = equity
    }

    series.push(curve)
    finals.push(equity)
    maxDrawdowns.push(maxDD)
    if (ruined) ruinCount += 1
    if (equity > capital) profitCount += 1
  }

  // Median taken per time-step across paths, so the median line is a genuine
  // cross-sectional median rather than one lucky path picked out of the bundle.
  const median = new Array(trades + 1)
  const column = new Array(paths)
  for (let t = 0; t <= trades; t += 1) {
    for (let i = 0; i < paths; i += 1) column[i] = series[i][t]
    median[t] = quantile([...column].sort((x, y) => x - y), 0.5)
  }

  const sortedFinals = [...finals].sort((x, y) => x - y)

  return {
    series,
    median,
    stats: {
      medianFinal: quantile(sortedFinals, 0.5),
      p05: quantile(sortedFinals, 0.05),
      p95: quantile(sortedFinals, 0.95),
      best: sortedFinals[sortedFinals.length - 1] ?? capital,
      worst: sortedFinals[0] ?? capital,
      probProfit: paths ? profitCount / paths : 0,
      probRuin: paths ? ruinCount / paths : 0,
      avgMaxDrawdown: maxDrawdowns.length
        ? maxDrawdowns.reduce((s, d) => s + d, 0) / maxDrawdowns.length
        : 0,
      capital,
      trades,
      paths,
      ruinFloor,
    },
  }
}

/**
 * How much does the conclusion move if the (subjective) win probability is off?
 * Returns one row per delta — the point being that f* is far more sensitive to p
 * than most people sizing positions assume.
 */
export function sensitivityTable(p, b, deltas = [-0.05, 0, 0.05]) {
  return deltas.map((delta) => {
    const pAdj = clamp(p + delta, 0, 1)
    const k = calculateKelly(pAdj, b)
    return {
      delta,
      p: pAdj,
      edge: k.edge,
      full: k.f,
      half: k.f * 0.5,
      quarter: k.f * 0.25,
      viable: k.edge > 0,
    }
  })
}

export const TIERS = {
  INVALID: {
    id: 'INVALID',
    label: 'Incomplete Setup',
    tone: 'mute',
    blurb: 'Trade parameters do not describe a valid risk/reward geometry.',
  },
  NO_EDGE: {
    id: 'NO_EDGE',
    label: 'No Edge — Do Not Size',
    tone: 'danger',
    blurb: 'Expected value is zero or negative. Kelly returns no positive allocation.',
  },
  MARGINAL: {
    id: 'MARGINAL',
    label: 'Marginal Edge — Fractional Kelly Only',
    tone: 'amber',
    blurb: 'Edge is positive but thin enough to be indistinguishable from estimation error.',
  },
  PRESENT: {
    id: 'PRESENT',
    label: 'Edge Present — Standard Fractional Sizing',
    tone: 'mint',
    blurb: 'Edge supports a conventional fractional-Kelly allocation.',
  },
  OVERSTATED: {
    id: 'OVERSTATED',
    label: 'Edge Overstated — Re-examine Inputs',
    tone: 'chain',
    blurb:
      'Model output exceeds 25% of NAV per trade. In practice this signals an optimistic p, not an exceptional opportunity.',
  },
}

/** Map a Kelly result onto a risk tier the memo can speak in. */
export function classifyTier({ valid, edge, f }) {
  if (!valid) return TIERS.INVALID
  if (edge <= 0) return TIERS.NO_EDGE
  if (f > 0.25) return TIERS.OVERSTATED
  if (f < 0.05) return TIERS.MARGINAL
  return TIERS.PRESENT
}

/**
 * The sizing ladder plus the capped recommendation the verdict line quotes.
 * The cap is the binding constraint of the two: model output vs. house limit.
 */
export function sizingLadder({ f, capital, selectedMultiplier }) {
  const rung = (multiplier) => ({
    multiplier,
    pct: f * multiplier,
    dollars: capital * f * multiplier,
  })

  const selected = f * selectedMultiplier
  const capped = Math.min(selected, HOUSE_CAP)

  return {
    full: rung(1),
    half: rung(0.5),
    quarter: rung(0.25),
    selectedPct: selected,
    cappedPct: capped,
    cappedDollars: capital * capped,
    houseCapBinds: selected > HOUSE_CAP,
  }
}
