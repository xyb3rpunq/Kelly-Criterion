import { describe, it, expect } from 'vitest'
import {
  calculateKelly,
  computeRR,
  makeRng,
  runMonteCarlo,
  sensitivityTable,
  classifyTier,
  sizingLadder,
  TIERS,
} from './kelly.js'

describe('computeRR', () => {
  it('derives b from a long setup', () => {
    const r = computeRR({ entry: 2000, stop: 1990, target: 2020, direction: 'buy' })
    expect(r.risk).toBe(10)
    expect(r.reward).toBe(20)
    expect(r.b).toBe(2)
    expect(r.valid).toBe(true)
  })

  it('mirrors the geometry for a short setup', () => {
    const r = computeRR({ entry: 2000, stop: 2010, target: 1970, direction: 'sell' })
    expect(r.risk).toBe(10)
    expect(r.reward).toBe(30)
    expect(r.b).toBe(3)
  })

  it('flags a stop placed on the wrong side', () => {
    const r = computeRR({ entry: 2000, stop: 2010, target: 2020, direction: 'buy' })
    expect(r.valid).toBe(false)
    expect(r.b).toBe(0)
  })
})

describe('calculateKelly', () => {
  it('matches the textbook coin-flip case (p=0.6, b=1 -> 20%)', () => {
    const k = calculateKelly(0.6, 1)
    expect(k.f).toBeCloseTo(0.2, 10)
    expect(k.edge).toBeCloseTo(0.2, 10)
  })

  it('returns zero at exactly break-even', () => {
    const b = 2
    const k = calculateKelly(1 / (1 + b), b) // p = 1/3
    expect(k.edge).toBeCloseTo(0, 10)
    expect(k.f).toBeCloseTo(0, 10)
  })

  it('floors a negative edge at zero rather than suggesting a reverse bet', () => {
    const k = calculateKelly(0.2, 1)
    expect(k.fRaw).toBeLessThan(0)
    expect(k.f).toBe(0)
  })

  it('reports the break-even probability for the given odds', () => {
    expect(calculateKelly(0.5, 3).breakEvenP).toBeCloseTo(0.25, 10)
  })

  it('rejects a non-positive b', () => {
    expect(calculateKelly(0.6, 0).valid).toBe(false)
  })
})

describe('makeRng', () => {
  it('is deterministic per seed and differs across seeds', () => {
    const a = makeRng(42)
    const b = makeRng(42)
    const c = makeRng(43)
    const draw = (r) => [r(), r(), r()]
    expect(draw(a)).toEqual(draw(b))
    expect(draw(makeRng(42))).not.toEqual(draw(c))
  })

  it('stays inside [0, 1)', () => {
    const r = makeRng(7)
    for (let i = 0; i < 2000; i += 1) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('runMonteCarlo', () => {
  const base = { p: 0.55, b: 2, fraction: 0.1, trades: 50, paths: 20, capital: 10000, seed: 9 }

  it('returns one curve per path with trades+1 points', () => {
    const { series, median } = runMonteCarlo(base)
    expect(series).toHaveLength(20)
    series.forEach((c) => expect(c).toHaveLength(51))
    expect(median).toHaveLength(51)
    expect(median[0]).toBe(10000)
  })

  it('is reproducible for a fixed seed', () => {
    expect(runMonteCarlo(base).stats).toEqual(runMonteCarlo(base).stats)
  })

  it('leaves equity flat when the fraction is zero', () => {
    const { stats, series } = runMonteCarlo({ ...base, fraction: 0 })
    expect(series.every((c) => c.every((v) => v === 10000))).toBe(true)
    expect(stats.probRuin).toBe(0)
    expect(stats.probProfit).toBe(0)
  })

  it('freezes a ruined path instead of letting it recover', () => {
    // Full Kelly on a wide-odds bet: ruin is near-certain somewhere in 200 trades.
    const { series, stats } = runMonteCarlo({
      ...base,
      p: 0.35,
      fraction: 0.6,
      trades: 200,
      seed: 3,
    })
    expect(stats.probRuin).toBeGreaterThan(0)
    series.forEach((curve) => {
      const hit = curve.findIndex((v) => v <= stats.ruinFloor)
      if (hit !== -1) {
        expect(curve.slice(hit).every((v) => v === curve[hit])).toBe(true)
      }
    })
  })

  it('bounds worst <= median <= best', () => {
    const { stats } = runMonteCarlo(base)
    expect(stats.worst).toBeLessThanOrEqual(stats.medianFinal)
    expect(stats.medianFinal).toBeLessThanOrEqual(stats.best)
  })

  it('produces heavier drawdowns at full Kelly than at quarter Kelly', () => {
    const k = calculateKelly(0.55, 2).f
    const full = runMonteCarlo({ ...base, fraction: k, trades: 300, paths: 60 })
    const quarter = runMonteCarlo({ ...base, fraction: k * 0.25, trades: 300, paths: 60 })
    expect(full.stats.avgMaxDrawdown).toBeGreaterThan(quarter.stats.avgMaxDrawdown)
  })
})

describe('sensitivityTable', () => {
  it('shifts p by each delta and stays ordered in f*', () => {
    const rows = sensitivityTable(0.5, 2)
    expect(rows.map((r) => Number(r.p.toFixed(2)))).toEqual([0.45, 0.5, 0.55])
    expect(rows[0].full).toBeLessThan(rows[1].full)
    expect(rows[1].full).toBeLessThan(rows[2].full)
  })

  it('marks a row non-viable once the edge disappears', () => {
    const rows = sensitivityTable(0.36, 2) // break-even p is 0.333…
    expect(rows[0].viable).toBe(false) // p = 0.31
    expect(rows[2].viable).toBe(true)
  })

  it('clamps p inside [0,1]', () => {
    expect(sensitivityTable(0.98, 2)[2].p).toBeLessThanOrEqual(1)
    expect(sensitivityTable(0.02, 2)[0].p).toBeGreaterThanOrEqual(0)
  })
})

describe('classifyTier', () => {
  const t = (p, b) => classifyTier(calculateKelly(p, b)).id

  it('separates the tiers by edge and f*', () => {
    expect(classifyTier({ valid: false }).id).toBe(TIERS.INVALID.id)
    expect(t(0.3, 2)).toBe('NO_EDGE') // p below break-even
    expect(t(0.35, 2)).toBe('MARGINAL') // f* ~ 2.5%
    expect(t(0.5, 2)).toBe('PRESENT') // f* = 25%
    expect(t(0.7, 2)).toBe('OVERSTATED') // f* = 55%
  })
})

describe('sizingLadder', () => {
  it('scales the rungs and converts to dollars', () => {
    const l = sizingLadder({ f: 0.2, capital: 10000, selectedMultiplier: 0.5 })
    expect(l.full.pct).toBeCloseTo(0.2)
    expect(l.half.pct).toBeCloseTo(0.1)
    expect(l.quarter.pct).toBeCloseTo(0.05)
    expect(l.full.dollars).toBeCloseTo(2000)
  })

  it('applies the 2% house cap when the model asks for more', () => {
    const l = sizingLadder({ f: 0.2, capital: 10000, selectedMultiplier: 0.5 })
    expect(l.selectedPct).toBeCloseTo(0.1)
    expect(l.cappedPct).toBeCloseTo(0.02)
    expect(l.cappedDollars).toBeCloseTo(200)
    expect(l.houseCapBinds).toBe(true)
  })

  it('leaves a sub-cap allocation untouched', () => {
    const l = sizingLadder({ f: 0.04, capital: 10000, selectedMultiplier: 0.25 })
    expect(l.cappedPct).toBeCloseTo(0.01)
    expect(l.houseCapBinds).toBe(false)
  })
})
