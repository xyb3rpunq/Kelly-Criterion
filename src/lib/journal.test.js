import { describe, it, expect } from 'vitest'
import {
  makeEntry,
  isValidEntry,
  journalStats,
  cumulativeR,
  worstLosingStreak,
  exportJournal,
  importJournal,
} from './journal.js'

const e = (r, instrument = 'XAUUSD', ts = Date.now()) => makeEntry({ instrument, r, ts })

describe('makeEntry / isValidEntry', () => {
  it('produces a valid entry with a unique id', () => {
    const a = makeEntry({ instrument: 'XAUUSD', r: 2 })
    const b = makeEntry({ instrument: 'XAUUSD', r: 2 })
    expect(isValidEntry(a)).toBe(true)
    expect(a.id).not.toBe(b.id)
  })

  it('truncates an overlong note', () => {
    expect(makeEntry({ instrument: 'DXY', r: 1, note: 'x'.repeat(400) }).note).toHaveLength(140)
  })

  it('rejects malformed entries', () => {
    expect(isValidEntry(null)).toBe(false)
    expect(isValidEntry({ id: 'a', r: 'abc', ts: 1, instrument: 'X' })).toBe(false)
    expect(isValidEntry({ id: 'a', r: 1, ts: 1 })).toBe(false)
  })
})

describe('journalStats', () => {
  it('measures p and b from realised R-multiples', () => {
    // 3 wins averaging +2R, 2 losses averaging -1R -> p = 0.6, b = 2
    const entries = [e(2), e(2), e(2), e(-1), e(-1)]
    const s = journalStats(entries)
    expect(s.decided).toBe(5)
    expect(s.measuredP).toBeCloseTo(0.6, 10)
    expect(s.measuredB).toBeCloseTo(2, 10)
    expect(s.expectancyR).toBeCloseTo(0.8, 10)
    expect(s.totalR).toBeCloseTo(4, 10)
  })

  it('excludes scratches from p and b but keeps them in the ledger', () => {
    const entries = [e(2), e(-1), e(0), e(0)]
    const s = journalStats(entries)
    expect(s.total).toBe(4)
    expect(s.scratches).toBe(2)
    expect(s.decided).toBe(2)
    expect(s.measuredP).toBeCloseTo(0.5, 10)
    expect(s.measuredB).toBeCloseTo(2, 10)
    // Expectancy still counts the scratches — they used up a slot.
    expect(s.expectancyR).toBeCloseTo(0.25, 10)
  })

  it('accounts for slippage worse than the planned stop', () => {
    // A -1.6R loss is a stop that gapped; b must reflect it.
    const s = journalStats([e(2), e(-1), e(-1.6)])
    expect(s.avgLoss).toBeCloseTo(1.3, 10)
    expect(s.measuredB).toBeCloseTo(2 / 1.3, 10)
  })

  it('filters by instrument', () => {
    const entries = [e(2, 'XAUUSD'), e(-1, 'XAUUSD'), e(5, 'BTCUSD')]
    expect(journalStats(entries, 'XAUUSD').total).toBe(2)
    expect(journalStats(entries, 'BTCUSD').totalR).toBeCloseTo(5, 10)
  })

  it('returns nulls rather than NaN on an empty or one-sided log', () => {
    const empty = journalStats([])
    expect(empty.measuredP).toBeNull()
    expect(empty.measuredB).toBeNull()
    expect(empty.expectancyR).toBeNull()

    const winsOnly = journalStats([e(2), e(3)])
    expect(winsOnly.measuredP).toBeCloseTo(1, 10)
    expect(winsOnly.measuredB).toBeNull() // no losses yet, so b is unmeasurable
  })

  it('ignores malformed rows instead of throwing', () => {
    const s = journalStats([e(2), { id: 'x', r: 'nope', ts: 1, instrument: 'X' }, null])
    expect(s.total).toBe(1)
  })
})

describe('cumulativeR', () => {
  it('starts at zero and accumulates oldest-first', () => {
    const entries = [
      makeEntry({ instrument: 'X', r: -1, ts: 300 }),
      makeEntry({ instrument: 'X', r: 2, ts: 100 }),
      makeEntry({ instrument: 'X', r: 1, ts: 200 }),
    ]
    expect(cumulativeR(entries).map((p) => p.r)).toEqual([0, 2, 3, 2])
  })

  it('handles an empty journal', () => {
    expect(cumulativeR([])).toEqual([{ i: 0, r: 0, ts: null }])
  })
})

describe('worstLosingStreak', () => {
  it('finds the longest consecutive run of losses', () => {
    const mk = (r, ts) => makeEntry({ instrument: 'X', r, ts })
    const entries = [mk(1, 1), mk(-1, 2), mk(-1, 3), mk(-1, 4), mk(2, 5), mk(-1, 6)]
    expect(worstLosingStreak(entries)).toBe(3)
  })

  it('is not broken by a scratch, but is broken by a win', () => {
    const mk = (r, ts) => makeEntry({ instrument: 'X', r, ts })
    expect(worstLosingStreak([mk(-1, 1), mk(0, 2), mk(-1, 3)])).toBe(2)
    expect(worstLosingStreak([mk(-1, 1), mk(1, 2), mk(-1, 3)])).toBe(1)
  })

  it('is zero with no losses', () => {
    expect(worstLosingStreak([e(1), e(2)])).toBe(0)
  })
})

describe('export / import round trip', () => {
  it('survives a round trip', () => {
    const entries = [e(2), e(-1), e(0.5)]
    const { entries: back, error } = importJournal(exportJournal(entries))
    expect(error).toBeNull()
    expect(back).toHaveLength(3)
    expect(back.map((x) => x.r)).toEqual([2, -1, 0.5])
  })

  it('accepts a bare array as well as a wrapped export', () => {
    const { entries } = importJournal(JSON.stringify([e(1)]))
    expect(entries).toHaveLength(1)
  })

  it('reports bad input instead of throwing', () => {
    expect(importJournal('{{{').error).toBe('invalid-json')
    expect(importJournal('{"nope":1}').error).toBe('not-a-journal')
    expect(importJournal('[{"bad":1}]').error).toBe('no-valid-entries')
  })

  it('drops malformed rows from an otherwise good file', () => {
    const mixed = JSON.stringify({ entries: [e(2), { id: 'x' }, e(-1)] })
    expect(importJournal(mixed).entries).toHaveLength(2)
  })
})
