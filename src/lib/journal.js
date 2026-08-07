/**
 * Trade journal aggregation.
 *
 * The point of the journal is to replace assumptions with observations: from a
 * list of realised R-multiples it measures the two numbers the Kelly formula
 * needs — the win rate p and the reward-to-risk ratio b — so the user can stop
 * guessing them.
 *
 * Pure functions over plain objects. Storage lives in hooks/useJournal.js.
 */

export const JOURNAL_VERSION = 1

/**
 * A trade is recorded as its realised R-multiple: +2.4 means it returned 2.4×
 * the amount risked, −1 means the stop was hit as planned, −1.6 means it
 * slipped through. R is the right unit here because it is scale-free — it
 * compares a 0.2-lot gold trade with a 3-lot oil trade directly, and it is what
 * b is actually made of.
 */
export function makeEntry({ instrument, direction = 'buy', r, note = '', ts = Date.now() }) {
  return {
    id: `${ts.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ts,
    instrument,
    direction,
    r: Number(r),
    note: String(note || '').slice(0, 140),
  }
}

export function isValidEntry(e) {
  // Boolean() rather than a bare && chain: this is a predicate, and returning
  // null for a null input works in .filter() but lies to anything that checks
  // the result identically.
  return Boolean(
    e &&
      typeof e.id === 'string' &&
      Number.isFinite(Number(e.r)) &&
      Number.isFinite(Number(e.ts)) &&
      typeof e.instrument === 'string',
  )
}

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)

/**
 * Measured statistics over a set of entries.
 *
 * Classification: r > 0 wins, r < 0 loses, r === 0 is a scratch. Scratches are
 * excluded from p and b — a breakeven exit is neither evidence the setup works
 * nor evidence it fails — but they still count in the ledger and in expectancy,
 * because they consumed a slot and they happened.
 *
 * @param {Array} entries
 * @param {string|null} instrument optional filter
 */
export function journalStats(entries, instrument = null) {
  const rows = (entries || [])
    .filter(isValidEntry)
    .filter((e) => !instrument || e.instrument === instrument)

  const rs = rows.map((e) => Number(e.r))
  const wins = rs.filter((r) => r > 0)
  const losses = rs.filter((r) => r < 0)
  const scratches = rs.filter((r) => r === 0)

  const decided = wins.length + losses.length
  const avgWin = mean(wins)
  const avgLoss = losses.length ? mean(losses.map(Math.abs)) : null

  return {
    total: rows.length,
    decided,
    wins: wins.length,
    losses: losses.length,
    scratches: scratches.length,

    // Raw frequency. Deliberately *not* the number fed to Kelly — that is the
    // posterior mean, which accounts for how thin this sample might be.
    measuredP: decided ? wins.length / decided : null,

    // Realised payoff ratio. This is a direct estimate of b from outcomes,
    // including whatever slippage and partial fills actually occurred.
    measuredB: avgWin !== null && avgLoss ? avgWin / avgLoss : null,

    avgWin,
    avgLoss,
    expectancyR: rs.length ? mean(rs) : null,
    totalR: rs.reduce((s, r) => s + r, 0),
    best: rs.length ? Math.max(...rs) : null,
    worst: rs.length ? Math.min(...rs) : null,
  }
}

/**
 * Running cumulative R, oldest first — the equity curve of the journal in
 * risk units rather than currency, so it stays comparable across account sizes.
 */
export function cumulativeR(entries, instrument = null) {
  const rows = (entries || [])
    .filter(isValidEntry)
    .filter((e) => !instrument || e.instrument === instrument)
    .sort((a, b) => a.ts - b.ts)

  let run = 0
  return [
    { i: 0, r: 0, ts: rows[0]?.ts ?? null },
    ...rows.map((e, i) => {
      run += Number(e.r)
      return { i: i + 1, r: run, ts: e.ts }
    }),
  ]
}

/** Longest run of consecutive losses — the streak that actually breaks people. */
export function worstLosingStreak(entries, instrument = null) {
  const rows = (entries || [])
    .filter(isValidEntry)
    .filter((e) => !instrument || e.instrument === instrument)
    .sort((a, b) => a.ts - b.ts)

  let run = 0
  let worst = 0
  for (const e of rows) {
    if (Number(e.r) < 0) {
      run += 1
      if (run > worst) worst = run
    } else if (Number(e.r) > 0) {
      run = 0
    }
  }
  return worst
}

/** Serialise for download. */
export function exportJournal(entries) {
  return JSON.stringify(
    { version: JOURNAL_VERSION, exportedAt: new Date().toISOString(), entries },
    null,
    2,
  )
}

/**
 * Parse an imported file. Returns { entries, error } rather than throwing so the
 * UI can report a bad file without taking the page down.
 */
export function importJournal(text) {
  try {
    const parsed = JSON.parse(text)
    const raw = Array.isArray(parsed) ? parsed : parsed?.entries
    if (!Array.isArray(raw)) return { entries: null, error: 'not-a-journal' }

    const entries = raw.filter(isValidEntry).map((e) => ({
      id: String(e.id),
      ts: Number(e.ts),
      instrument: String(e.instrument),
      direction: e.direction === 'sell' ? 'sell' : 'buy',
      r: Number(e.r),
      note: String(e.note || '').slice(0, 140),
    }))

    if (!entries.length) return { entries: null, error: 'no-valid-entries' }
    return { entries, error: null }
  } catch {
    return { entries: null, error: 'invalid-json' }
  }
}
