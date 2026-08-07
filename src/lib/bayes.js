/**
 * Bayesian treatment of the win probability.
 *
 * The whole tool rests on p, and p is a guess. This module replaces the guess
 * with a posterior distribution: the user's slider acts as a weak prior, the
 * logged trade history acts as evidence, and what comes out is a range for f*
 * rather than a single number pretending to precision it does not have.
 *
 * Pure numerics — no React, no DOM, no storage. Deterministic throughout.
 */

/**
 * The slider is treated as a prior worth this many pseudo-trades. Small on
 * purpose: it should anchor the estimate when there is no history and then get
 * out of the way. At 4, thirty-six logged trades reduce its weight to 10%.
 */
export const PRIOR_STRENGTH = 4

/** Default credible level for the reported interval. */
export const CREDIBLE_LEVEL = 0.9

// --------------------------------------------------------------- numerics

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
]

/** Log-gamma via the Lanczos approximation (g=7, n=9). */
export function logGamma(z) {
  if (z < 0.5) {
    // Reflection formula keeps the approximation in its accurate range.
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  }
  let x = LANCZOS[0]
  const zz = z - 1
  for (let i = 1; i < 9; i += 1) x += LANCZOS[i] / (zz + i)
  const t = zz + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x)
}

/** Continued-fraction expansion for the incomplete beta (Lentz's method). */
function betacf(a, b, x) {
  const MAXIT = 300
  const EPS = 3e-16
  const FPMIN = 1e-300

  const qab = a + b
  const qap = a + 1
  const qam = a - 1

  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d

  for (let m = 1; m <= MAXIT; m += 1) {
    const m2 = 2 * m

    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d

    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

/** Regularised incomplete beta I_x(a, b) — the Beta CDF. */
export function betaCdf(x, a, b) {
  if (!(a > 0 && b > 0)) return NaN
  if (x <= 0) return 0
  if (x >= 1) return 1

  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  )
  // The expansion converges quickly only on one side of the mode; use the
  // symmetry relation on the other.
  return x < (a + 1) / (a + b + 2)
    ? (front * betacf(a, b, x)) / a
    : 1 - (front * betacf(b, a, 1 - x)) / b
}

/** Beta probability density. */
export function betaPdf(x, a, b) {
  if (!(a > 0 && b > 0) || x <= 0 || x >= 1) return 0
  return Math.exp(
    (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) + logGamma(a + b) - logGamma(a) - logGamma(b),
  )
}

/**
 * Inverse Beta CDF by bisection. Eighty halvings of [0,1] lands well inside
 * double precision, and the CDF is monotone so bisection cannot get stuck —
 * worth the handful of extra iterations over a Newton step that can overshoot
 * near the boundaries of a sharply peaked posterior.
 */
export function betaQuantile(q, a, b) {
  if (!(a > 0 && b > 0)) return NaN
  if (q <= 0) return 0
  if (q >= 1) return 1

  let lo = 0
  let hi = 1
  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2
    if (betaCdf(mid, a, b) < q) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

// --------------------------------------------------------------- posterior

/**
 * Beta posterior over p, combining the slider prior with observed outcomes.
 *
 * @param {object} o
 * @param {number} o.p0 prior mean — the user's slider, 0..1
 * @param {number} o.wins observed winning trades
 * @param {number} o.losses observed losing trades
 * @param {number} [o.strength] prior weight in pseudo-trades
 */
export function posterior({ p0, wins = 0, losses = 0, strength = PRIOR_STRENGTH }) {
  const mean0 = Math.min(0.999, Math.max(0.001, Number(p0) || 0.5))
  const k = Math.max(0.001, strength)

  const alpha = k * mean0 + Math.max(0, wins)
  const beta = k * (1 - mean0) + Math.max(0, losses)
  const n = Math.max(0, wins) + Math.max(0, losses)

  return {
    alpha,
    beta,
    mean: alpha / (alpha + beta),
    // How much of the answer is still the user's opinion rather than evidence.
    priorWeight: k / (k + n),
    n,
  }
}

/** Central credible interval for p. */
export function credibleInterval(alpha, beta, level = CREDIBLE_LEVEL) {
  const tail = (1 - level) / 2
  return [betaQuantile(tail, alpha, beta), betaQuantile(1 - tail, alpha, beta)]
}

/**
 * Kelly under parameter uncertainty.
 *
 * f*(p) = ((1+b)·p − 1) / b is *linear* in p, which has two consequences worth
 * stating plainly:
 *
 *  1. The interval for f* is exactly the image of the interval for p — no
 *     simulation required, the quantiles map straight through.
 *  2. E[log growth] is linear in p too, so the growth-optimal fraction under
 *     uncertainty is f* evaluated at the posterior *mean*. Uncertainty about p
 *     does not move the optimal point estimate; it only tells you how much to
 *     trust it. That is why the conservative figure here is the lower credible
 *     bound rather than some shrunk version of the mean.
 */
export function bayesianKelly({ alpha, beta, b, level = CREDIBLE_LEVEL }) {
  const valid = alpha > 0 && beta > 0 && Number.isFinite(b) && b > 0
  if (!valid) {
    return {
      valid: false,
      level,
      pLo: NaN, pMean: NaN, pHi: NaN,
      fLo: 0, fMean: 0, fHi: 0,
      pEdge: NaN, breakEven: NaN,
    }
  }

  const f = (p) => Math.min(0.99, Math.max(0, ((1 + b) * p - 1) / b))
  const [pLo, pHi] = credibleInterval(alpha, beta, level)
  const pMean = alpha / (alpha + beta)
  const breakEven = 1 / (1 + b)

  return {
    valid: true,
    level,
    pLo,
    pMean,
    pHi,
    fLo: f(pLo),
    fMean: f(pMean),
    fHi: f(pHi),
    // P(edge > 0) = P(p > break-even) under the posterior.
    pEdge: 1 - betaCdf(breakEven, alpha, beta),
    breakEven,
  }
}

/** Sampled density curve for plotting, normalised to a peak of 1. */
export function posteriorCurve(alpha, beta, points = 160) {
  if (!(alpha > 0 && beta > 0)) return []

  const raw = new Array(points)
  let peak = 0
  for (let i = 0; i < points; i += 1) {
    // Offset off the closed boundaries, where the density can diverge.
    const p = (i + 0.5) / points
    const d = betaPdf(p, alpha, beta)
    raw[i] = { p, d: Number.isFinite(d) ? d : 0 }
    if (raw[i].d > peak) peak = raw[i].d
  }
  if (peak <= 0) return raw.map((r) => ({ ...r, d: 0 }))
  return raw.map((r) => ({ p: r.p, d: r.d / peak }))
}
