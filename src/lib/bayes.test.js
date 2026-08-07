import { describe, it, expect } from 'vitest'
import {
  logGamma,
  betaCdf,
  betaPdf,
  betaQuantile,
  posterior,
  credibleInterval,
  bayesianKelly,
  posteriorCurve,
  PRIOR_STRENGTH,
} from './bayes.js'

describe('logGamma', () => {
  it('matches factorials: lgamma(n) = ln((n-1)!)', () => {
    expect(Math.exp(logGamma(1))).toBeCloseTo(1, 9)
    expect(Math.exp(logGamma(5))).toBeCloseTo(24, 6)
    expect(Math.exp(logGamma(8))).toBeCloseTo(5040, 3)
  })

  it('handles the reflection branch for z < 0.5', () => {
    // Gamma(1/2) = sqrt(pi)
    expect(Math.exp(logGamma(0.5))).toBeCloseTo(Math.sqrt(Math.PI), 9)
  })
})

describe('betaCdf', () => {
  it('is the identity for Beta(1,1)', () => {
    for (const x of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      expect(betaCdf(x, 1, 1)).toBeCloseTo(x, 10)
    }
  })

  it('matches the closed form for Beta(2,1) and Beta(1,2)', () => {
    // I_x(2,1) = x^2 ; I_x(1,2) = 1-(1-x)^2
    expect(betaCdf(0.3, 2, 1)).toBeCloseTo(0.09, 10)
    expect(betaCdf(0.3, 1, 2)).toBeCloseTo(1 - 0.49, 10)
  })

  it('is 0.5 at the midpoint of a symmetric Beta', () => {
    expect(betaCdf(0.5, 7, 7)).toBeCloseTo(0.5, 10)
    expect(betaCdf(0.5, 0.5, 0.5)).toBeCloseTo(0.5, 10)
  })

  it('converges on both sides of the switch point', () => {
    // Straddles the (a+1)/(a+b+2) branch used to pick the expansion.
    for (const x of [0.05, 0.2, 0.4, 0.45, 0.55, 0.6, 0.8, 0.95]) {
      const v = betaCdf(x, 12, 9)
      expect(Number.isFinite(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('is monotonically increasing', () => {
    let prev = -1
    for (let x = 0.01; x < 1; x += 0.01) {
      const v = betaCdf(x, 5, 3)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })

  it('clamps outside the support', () => {
    expect(betaCdf(0, 3, 4)).toBe(0)
    expect(betaCdf(1, 3, 4)).toBe(1)
    expect(betaCdf(-1, 3, 4)).toBe(0)
    expect(betaCdf(2, 3, 4)).toBe(1)
  })
})

describe('betaPdf', () => {
  it('is flat at 1 for the uniform Beta(1,1)', () => {
    expect(betaPdf(0.2, 1, 1)).toBeCloseTo(1, 10)
    expect(betaPdf(0.8, 1, 1)).toBeCloseTo(1, 10)
  })

  it('peaks at the mode of Beta(a,b)', () => {
    const a = 6
    const b = 3
    const mode = (a - 1) / (a + b - 2)
    const atMode = betaPdf(mode, a, b)
    expect(atMode).toBeGreaterThan(betaPdf(mode - 0.1, a, b))
    expect(atMode).toBeGreaterThan(betaPdf(mode + 0.1, a, b))
  })

  it('is zero outside the open interval', () => {
    expect(betaPdf(0, 2, 2)).toBe(0)
    expect(betaPdf(1, 2, 2)).toBe(0)
  })
})

describe('betaQuantile', () => {
  it('inverts the CDF', () => {
    for (const [a, b] of [[2, 5], [8, 8], [30, 12], [0.5, 0.5]]) {
      for (const q of [0.05, 0.25, 0.5, 0.75, 0.95]) {
        const x = betaQuantile(q, a, b)
        expect(betaCdf(x, a, b)).toBeCloseTo(q, 8)
      }
    }
  })

  it('matches the closed form for Beta(1,1)', () => {
    expect(betaQuantile(0.37, 1, 1)).toBeCloseTo(0.37, 8)
  })

  it('returns the median at q=0.5 for a symmetric posterior', () => {
    expect(betaQuantile(0.5, 9, 9)).toBeCloseTo(0.5, 8)
  })
})

describe('posterior', () => {
  it('returns the prior mean when there is no evidence', () => {
    const post = posterior({ p0: 0.6, wins: 0, losses: 0 })
    expect(post.mean).toBeCloseTo(0.6, 10)
    expect(post.n).toBe(0)
    expect(post.priorWeight).toBe(1)
  })

  it('moves toward the data as trades accumulate', () => {
    const few = posterior({ p0: 0.8, wins: 2, losses: 8 })
    const many = posterior({ p0: 0.8, wins: 20, losses: 80 })
    // Both point below the 0.8 prior; the larger sample gets closer to 0.2.
    expect(few.mean).toBeLessThan(0.8)
    expect(many.mean).toBeLessThan(few.mean)
    expect(many.mean).toBeCloseTo(0.2, 1)
  })

  it('decays the prior weight as 1/(k+n)', () => {
    expect(posterior({ p0: 0.5, wins: 0, losses: 0 }).priorWeight).toBeCloseTo(1, 10)
    const p36 = posterior({ p0: 0.5, wins: 18, losses: 18 })
    expect(p36.priorWeight).toBeCloseTo(PRIOR_STRENGTH / (PRIOR_STRENGTH + 36), 10)
    expect(p36.priorWeight).toBeCloseTo(0.1, 6)
  })

  it('keeps alpha and beta strictly positive at the extremes of the slider', () => {
    for (const p0 of [0, 0.001, 0.999, 1]) {
      const post = posterior({ p0, wins: 0, losses: 0 })
      expect(post.alpha).toBeGreaterThan(0)
      expect(post.beta).toBeGreaterThan(0)
      expect(Number.isFinite(post.mean)).toBe(true)
    }
  })
})

describe('credibleInterval', () => {
  it('brackets the mean and narrows with evidence', () => {
    const wide = posterior({ p0: 0.55, wins: 3, losses: 2 })
    const tight = posterior({ p0: 0.55, wins: 300, losses: 200 })

    const [wLo, wHi] = credibleInterval(wide.alpha, wide.beta)
    const [tLo, tHi] = credibleInterval(tight.alpha, tight.beta)

    expect(wLo).toBeLessThan(wide.mean)
    expect(wHi).toBeGreaterThan(wide.mean)
    expect(tHi - tLo).toBeLessThan(wHi - wLo)
  })

  it('covers the stated mass', () => {
    const [lo, hi] = credibleInterval(14, 9, 0.9)
    expect(betaCdf(hi, 14, 9) - betaCdf(lo, 14, 9)).toBeCloseTo(0.9, 6)
  })
})

describe('bayesianKelly', () => {
  it('maps the p interval straight through, since f* is linear in p', () => {
    const { alpha, beta } = posterior({ p0: 0.55, wins: 30, losses: 20 })
    const r = bayesianKelly({ alpha, beta, b: 2 })
    const f = (p) => ((1 + 2) * p - 1) / 2

    expect(r.fLo).toBeCloseTo(Math.max(0, f(r.pLo)), 10)
    expect(r.fMean).toBeCloseTo(Math.max(0, f(r.pMean)), 10)
    expect(r.fHi).toBeCloseTo(Math.max(0, f(r.pHi)), 10)
    expect(r.fLo).toBeLessThan(r.fMean)
    expect(r.fMean).toBeLessThan(r.fHi)
  })

  it('reports the break-even probability for the odds', () => {
    const { alpha, beta } = posterior({ p0: 0.5, wins: 10, losses: 10 })
    expect(bayesianKelly({ alpha, beta, b: 3 }).breakEven).toBeCloseTo(0.25, 10)
  })

  it('gives a high P(edge) when the record is clearly above break-even', () => {
    const { alpha, beta } = posterior({ p0: 0.5, wins: 60, losses: 40 })
    const r = bayesianKelly({ alpha, beta, b: 2 }) // break-even 33.3%
    expect(r.pEdge).toBeGreaterThan(0.99)
  })

  it('gives a low P(edge) when the record is clearly below break-even', () => {
    const { alpha, beta } = posterior({ p0: 0.5, wins: 10, losses: 90 })
    const r = bayesianKelly({ alpha, beta, b: 2 })
    expect(r.pEdge).toBeLessThan(0.01)
    expect(r.fLo).toBe(0)
    expect(r.fMean).toBe(0)
  })

  it('is uncertain, not confident, on a thin sample straddling break-even', () => {
    const { alpha, beta } = posterior({ p0: 0.4, wins: 2, losses: 3 })
    const r = bayesianKelly({ alpha, beta, b: 2 })
    expect(r.pEdge).toBeGreaterThan(0.2)
    expect(r.pEdge).toBeLessThan(0.95)
    // A thin record cannot justify a confident allocation.
    expect(r.fLo).toBeLessThan(r.fMean)
  })

  it('floors the conservative fraction at zero rather than going negative', () => {
    const { alpha, beta } = posterior({ p0: 0.36, wins: 1, losses: 4 })
    const r = bayesianKelly({ alpha, beta, b: 2 })
    expect(r.fLo).toBe(0)
    expect(r.fLo).toBeLessThanOrEqual(r.fMean)
  })

  it('rejects an invalid b', () => {
    expect(bayesianKelly({ alpha: 5, beta: 5, b: 0 }).valid).toBe(false)
    expect(bayesianKelly({ alpha: 5, beta: 5, b: NaN }).valid).toBe(false)
  })
})

describe('posteriorCurve', () => {
  it('returns a finite curve normalised to a peak of 1', () => {
    const curve = posteriorCurve(12, 7, 120)
    expect(curve).toHaveLength(120)
    expect(curve.every((c) => Number.isFinite(c.d) && c.d >= 0 && c.d <= 1)).toBe(true)
    expect(Math.max(...curve.map((c) => c.d))).toBeCloseTo(1, 10)
  })

  it('peaks near the posterior mode', () => {
    const a = 20
    const b = 10
    const curve = posteriorCurve(a, b, 400)
    const peak = curve.reduce((m, c) => (c.d > m.d ? c : m), curve[0])
    expect(peak.p).toBeCloseTo((a - 1) / (a + b - 2), 1)
  })

  it('survives a sharply peaked posterior without producing NaN', () => {
    const curve = posteriorCurve(500, 300, 100)
    expect(curve.every((c) => Number.isFinite(c.d))).toBe(true)
  })
})
