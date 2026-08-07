<div align="center">

# ◢ KELLY TERMINAL

**Position sizing for traders who already know their direction.**

A Kelly Criterion calculator and Monte Carlo simulator across five live-monitored instruments,
wrapped in a web3 terminal interface and closed by an auto-generated institutional risk memo.

[![Deploy](https://github.com/xyb3rpunq/Kelly-Criterion/actions/workflows/deploy.yml/badge.svg)](https://github.com/xyb3rpunq/Kelly-Criterion/actions/workflows/deploy.yml)
![React](https://img.shields.io/badge/React-18-05060A?style=flat-square&labelColor=05060A&color=6E5BFF)
![Vite](https://img.shields.io/badge/Vite-8-05060A?style=flat-square&labelColor=05060A&color=D4AF37)
![Tests](https://img.shields.io/badge/tests-23%20passing-05060A?style=flat-square&labelColor=05060A&color=00E5C7)
![Licence](https://img.shields.io/badge/licence-MIT-05060A?style=flat-square&labelColor=05060A&color=8B94A8)

### **[▸ OPEN LIVE TERMINAL](https://xyb3rpunq.github.io/Kelly-Criterion/)**

`English` · **[Bahasa Indonesia](README.id.md)** · **[📄 Implementation Report (PDF)](docs/Kelly-Terminal-Implementation-Report.pdf)**

</div>

---

```
                    f* = (p · b − q) / b

     p  your assumed win probability        q  1 − p
     b  net reward-to-risk odds             f* fraction of capital to risk
```

> This tool computes **how much** to risk. It has no opinion on **which way** to trade,
> and it does not know whether your edge is real.

---

## Contents

| # | Section |
|---|---------|
| 01 | [What this is](#01--what-this-is) |
| 02 | [Feature map](#02--feature-map) |
| 03 | [The mathematics](#03--the-mathematics) |
| 04 | [Live market data](#04--live-market-data) |
| 05 | [The risk memo](#05--the-risk-memo) |
| 06 | [Design system](#06--design-system) |
| 07 | [Honesty rules](#07--honesty-rules) |
| 08 | [Project structure](#08--project-structure) |
| 09 | [Running locally](#09--running-locally) |
| 10 | [Testing](#10--testing) |
| 11 | [Deployment](#11--deployment) |
| 12 | [Disclaimer](#12--disclaimer) |

---

## 01 · What this is

Most position-sizing calculators return a single number and stop. This one returns the number,
then spends the rest of the page arguing with it.

You supply a trade's geometry — entry, stop, target — and your own estimate of how often that
setup wins. The tool derives the reward-to-risk odds, applies the Kelly Criterion, simulates
thousands of possible futures, and issues a written risk assessment that states plainly how
fragile the conclusion is with respect to the one number you guessed.

**Available in English and Bahasa Indonesia.** The interface detects your browser language and
remembers any explicit choice.

---

## 02 · Feature map

```
┌─ MARKET MONITOR ─────────────────────────────────────────────┐
│  DXY  ·  XAU/USD  ·  XAG/USD  ·  USOIL  ·  BTC/USD           │
│  live polling · per-instrument source + age · session spark  │
└──────────────────────────────────────────────────────────────┘
        │
        ▼  select instrument → seeds a volatility-scaled setup
┌─ TRADE SETUP ──────────────┐  ┌─ KELLY GAUGE ─────────────────┐
│  direction · entry         │  │  270° radial arc              │
│  stop · target · capital   │──▶│  4 risk zones                 │
│  → derives b (net odds)    │  │  ghost notches for ½ and ¼    │
└────────────────────────────┘  │  live comet along active arc  │
┌─ PROBABILITY ──────────────┐  └───────────────────────────────┘
│  p slider (your assumption)│              │
│  break-even marker         │──────────────┤
│  Full / Half / Quarter     │              ▼
└────────────────────────────┘  ┌─ MONTE CARLO ─────────────────┐
                                │  24 paths × 120 trades        │
                                │  median · ruin line · re-roll │
                                │  auto log scale               │
                                └───────────────────────────────┘
                                             │
                                             ▼
                        ┌─ RISK MEMO (auto-generated) ──────────┐
                        │  executive summary · sizing ladder    │
                        │  ±5pp sensitivity · risk factors      │
                        │  verdict line                         │
                        └───────────────────────────────────────┘
```

| Capability | Detail |
|---|---|
| **Real-time recalculation** | Every figure updates on input change. The Monte Carlo run is debounced 130ms so slider drags stay smooth. |
| **Five monitored instruments** | Each with its own decimals, volatility-scaled default stop, and data source. |
| **Seeded simulation** | `mulberry32` PRNG — the same seed always reproduces the same paths. Re-roll for a new draw. |
| **Auto log axis** | Switches past two decades of spread, because compounding takes $10k past $10M and a linear axis hides everything. |
| **Bilingual** | EN / ID, including the generated memo prose. |
| **Accessibility** | Visible focus on every control, real radio groups for segmented controls, `prefers-reduced-motion` honoured throughout. |
| **Mobile-first** | Controls stack, tables scroll inside their own container, the page body never scrolls sideways. |

---

## 03 · The mathematics

All of it lives in [`src/lib/kelly.js`](src/lib/kelly.js) — pure functions, no React, no DOM,
no hidden state. Deterministic given their arguments, Monte Carlo included.

### Reward-to-risk odds

```
long:   risk = entry − stop        reward = target − entry
short:  risk = stop − entry        reward = entry − target

b = reward / risk
```

Both must be positive. A stop on the wrong side of entry is flagged as a user error rather than
silently producing a negative `b`.

### The Kelly fraction

```
edge = p·b − q                    expectancy in R-multiples
f*   = edge / b                   optimal fraction of capital
p_be = 1 / (1 + b)                win rate required to break even
```

A negative `f*` is floored at zero — the formula's advice to "bet the other side" is meaningless
for a directional trade you have already chosen.

### Monte Carlo

Each path risks a fixed fraction of **current** equity, which is what Kelly actually assumes —
that is why a losing streak shrinks the next bet instead of marching straight to zero.

```
win  →  equity × (1 + f·b)
loss →  equity × (1 − f)
```

A path reaching the ruin floor (50% of starting capital) **stops trading and flatlines**. A desk
that halves its NAV is shut down, not left to recover. The median line is a genuine
cross-sectional median taken per time-step, not the middle path picked out of the bundle.

### Risk tiers

| Condition | Tier |
|---|---|
| `b` invalid | Incomplete Setup |
| `edge ≤ 0` | No Edge — Do Not Size |
| `f* < 5%` | Marginal Edge — Fractional Kelly Only |
| `5% ≤ f* ≤ 25%` | Edge Present — Standard Fractional Sizing |
| `f* > 25%` | Edge Overstated — Re-examine Inputs |

The top tier exists because a model asking for more than a quarter of NAV per trade is almost
always reporting an optimistic `p`, not an exceptional opportunity.

---

## 04 · Live market data

All five instruments come from **TradingView's public scanner** in a single request — no account,
no API key, no server of our own. It sends CORS headers (it echoes the request `Origin`), so a
static page can call it directly.

| Instrument | TradingView symbol | Feed | Cadence |
|---|---|:---:|---|
| **DXY** | `TVC:DXY` | streaming | ~10s |
| **XAU/USD** | `TVC:GOLD` | streaming | ~10s |
| **XAG/USD** | `TVC:SILVER` | streaming | ~10s |
| **USOIL** | `NYMEX:CL1!` | delayed 10 min | ~10s |
| **BTC/USD** | Binance WebSocket | **push** | **1s** |

Bitcoin additionally runs a Binance `miniTicker` WebSocket, which pushes a frame every second and
overrides the polled value — the one instrument with a free public stream, so the one instrument
that genuinely updates at 1s.

**One CORS gotcha worth recording.** The scanner's preflight allows only `Referer,Accept` in
`Access-Control-Allow-Headers`, so sending `Content-Type: application/json` triggers a preflight
it then rejects. Omitting the header entirely lets the browser default to `text/plain`, which is
CORS-safelisted and skips the preflight — and the server parses the JSON body regardless.

### Fallback chain

The scanner is undocumented, so if it changes shape each instrument independently falls back to
the documented public API it used before, and the card is marked `FALLBACK`:

| Instrument | Fallback |
|---|---|
| **DXY** | Computed in-browser from `api.fxratesapi.com` via the ICE formula |
| **XAU/USD**, **XAG/USD** | `api.gold-api.com` |
| **BTC/USD** | Binance REST, then Coinbase |
| **USOIL** | Build-time Yahoo `CL=F` snapshot |

### DXY is computed, not proxied

```js
DXY = 50.14348112
    × EURUSD^-0.576 × USDJPY^0.136 × GBPUSD^-0.119
    × USDCAD^0.091  × USDSEK^0.042 × USDCHF^0.036
```

This is the index's actual definition, not an approximation.
**Validated during development: 99.956 computed against 99.962 published for `DX-Y.NYB`.**

### Why crude is 10 minutes delayed

There is no free real-time WTI feed. Everything was tested:

| Candidate | Result |
|---|---|
| `TVC:USOIL` + 20 broker CFD tickers | Absent from the scanner index |
| Yahoo Finance | Serves data, sends no CORS headers |
| Stooq | Now gated behind JavaScript bot detection |
| allorigins proxy | HTTP 500 |
| corsproxy.io | Paywalled |
| gold-api.com | No oil symbols |
| fxratesapi | Currencies and metals only |

`NYMEX:CL1!` at ten minutes delayed is the honest ceiling without a paid market-data subscription.
The card says **DELAYED 10M** rather than pretending otherwise.

### Polling cadence is measured, not guessed

The scanner was sampled every two seconds for half a minute: it refreshes roughly every **ten
seconds**. Polling it once per second would therefore return an identical number nine times out of
ten while burning 3,600 requests an hour per open tab. The poll runs at **5s**; the tape crawl and
the UTC clock run at 1s independently, and each cell flashes green or red only when its price
actually changes. Polling pauses entirely while the tab is hidden.

### Day-change is basis-corrected

Yahoo's gold and silver symbols are futures (`GC=F`, `SI=F`) while the browser reads spot. Carrying
the futures close straight over would bake the basis — roughly 1.3% on gold — into every
percentage shown. The build script rescales the previous close into spot terms before writing it.

---

## 05 · The risk memo

The section below the simulator is written in the register of an internal risk memorandum.
**Nothing in it is static prose about results** — every sentence is composed from the live
simulation, in whichever language is active.

```
01  EXECUTIVE SUMMARY      f*, edge, tier, simulation outcome in 3 sentences
02  RISK-ADJUSTED SIZING   Full / Half / Quarter against a 2% house cap
03  SCENARIO SENSITIVITY   p ±5pp, each row re-simulated on the same seed
04  KEY RISK FACTORS       model · path · regime · execution · cap override
05  VERDICT                one line, capped size, stated plainly
```

The sensitivity table is the part that matters. It re-runs the entire simulation at `p−5pp`,
`p`, and `p+5pp` **on the same seed**, so the median-final column isolates the effect of the
assumption rather than a different random draw. A five-point error in a subjective win-rate
estimate is well inside normal human error, and the table shows exactly what that does to the
recommendation.

---

## 06 · Design system

Three defaults were deliberately avoided: cream-and-terracotta, generic neon-on-black, and
broadsheet hairline rules. The identity is built from the subject matter — gold as metal, the
chain layer as electric violet.

| Token | Value | Role |
|---|---|---|
| `void` | `#05060A` | Page base — near-black, blue-shifted |
| `panel` | `#0B0E14` | Panel surface |
| `gold` | `#D4AF37` → `#F4E4A6` | Accent 1 — the metal |
| `chain` | `#6E5BFF` | Accent 2 — the on-chain layer |
| `mint` | `#00E5C7` | Positive signal |
| `danger` | `#FF4D6D` | Ruin, negative edge |

- **Palette is replaced, not extended** — no default Tailwind colour is reachable from the theme.
- **Panel edges are 1px gradients**, painted via a `mask-composite` trick rather than solid
  borders, so an edge reads as metal catching light.
- **Nothing is rounded past 6px.** This should feel like an instrument.
- **Type**: Space Grotesk (display), JetBrains Mono (every figure, tabular-nums so digits don't
  shift the layout), Inter (body).
- **Motion is one orchestrated load sequence** plus hover micro-interactions — not animation
  sprinkled everywhere. All of it disappears under `prefers-reduced-motion`.

### Signature element

The Kelly gauge is a 270° radial arc where everything drawn is real data: the zone boundaries sit
on the same axis as the needle, ghost notches mark where the two unselected fraction presets would
land, and a halo brightens with the applied fraction so the whole instrument responds rather than
just the pointer. A comet runs the live arc via a CSS dash animation on a path carrying
`pathLength="100"` — normalising the cycle so it travels at one speed whether `f*` is 1% or 40%,
at zero per-frame cost in React.

---

## 07 · Honesty rules

The theme is web3. That makes it easy to add elements that lie for decoration. This project
does not:

| Rule | Implementation |
|---|---|
| **No fake wallet button** | The page connects to no chain and holds no keys, so there is no "Connect Wallet" control. The status pill reports what it *does* connect to: public price APIs, and their real state. |
| **No fake live tickers** | Each instrument card carries its own `live` / `cached` badge, the source name, and the observation age in seconds. |
| **Sparklines are labelled** | They show prices observed since page load — session history, not the trading day. |
| **The chart says its own scale** | When the equity axis switches to log, it prints `log₁₀ equity axis` underneath. |
| **`p` is never disguised as analysis** | The probability panel states in the interface that the number is the user's assumption, that nothing in the app measures or forecasts it, and that every downstream figure inherits its error. |
| **No institutional cosplay** | The memo's tone is a writing style. The disclaimer states explicitly that the project has no affiliation with any bank, fund, exchange or brokerage — Citadel included. |

---

## 08 · Project structure

```
Kelly-Criterion/
├── api/
│   └── quotes.js               Vercel serverless proxy (makes USOIL live)
├── scripts/
│   └── fetch-market.mjs        Build-time snapshot → public/market-cache.json
├── src/
│   ├── lib/
│   │   ├── kelly.js            ◆ Pure maths. No React. Fully unit-tested.
│   │   ├── kelly.test.js       23 tests
│   │   ├── market.js           Data layer, sources, DXY computation
│   │   ├── format.js           Display formatting
│   │   └── i18n.jsx            EN + ID dictionaries, memo prose generators
│   ├── hooks/
│   │   ├── useMarketData.js    Polling, visibility-aware, snapshot refresh
│   │   ├── useDebouncedValue.js
│   │   └── useLanguage.jsx     Language context, detection, persistence
│   ├── components/
│   │   ├── Header.jsx          Wordmark, ticker strip, status, EN/ID switch
│   │   ├── Hero.jsx
│   │   ├── MarketMonitor.jsx   Five instrument cards + source disclosure
│   │   ├── TradeSetupPanel.jsx Step 01 — geometry → b
│   │   ├── ProbabilityPanel.jsx Step 02 — p + fraction preset
│   │   ├── KellyGauge.jsx      Step 03 — ◆ signature element
│   │   ├── MonteCarloChart.jsx Step 04 — paths, median, stats
│   │   ├── ConclusionPanel.jsx ◆ Auto-generated risk memo
│   │   ├── BackgroundGrid.jsx  Ledger grid + node mesh
│   │   ├── Footer.jsx
│   │   └── ui/                 Panel, Field, Stat primitives
│   ├── App.jsx
│   └── index.css               Tailwind layers + gradient-edge utilities
├── .github/workflows/deploy.yml
└── vercel.json
```

---

## 09 · Running locally

**Requirements:** Node 20+ (Node 22 or 24 recommended).

```bash
git clone https://github.com/xyb3rpunq/Kelly-Criterion.git
cd Kelly-Criterion
npm install
npm run dev
```

Open <http://localhost:5173>.

`npm run dev` runs `scripts/fetch-market.mjs` first to populate the market snapshot. If you are
offline the script exits cleanly, the app still starts, and USOIL simply reports as unavailable.

| Script | Purpose |
|---|---|
| `npm run dev` | Fetch snapshot, then start the dev server |
| `npm run build` | Fetch snapshot, then production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Run the Kelly maths test suite |
| `npm run test:watch` | Watch mode |
| `npm run fetch:market` | Refresh `public/market-cache.json` only |

---

## 10 · Testing

```bash
npm test
```

23 tests over `src/lib/kelly.js`, covering the parts where a silent error would be most
expensive:

- Textbook Kelly case — `p=0.6, b=1` must return exactly 20%
- Break-even boundary returns exactly zero
- Negative edge floors at zero rather than implying a reverse bet
- Stop on the wrong side of entry is rejected
- Seeded RNG is reproducible, differs across seeds, stays in `[0,1)`
- A ruined path never recovers
- `worst ≤ median ≤ best` always holds
- Full Kelly produces heavier drawdowns than quarter Kelly
- Sensitivity rows stay ordered and clamp `p` inside `[0,1]`
- The 2% house cap binds when the model asks for more

---

## 11 · Deployment

### GitHub Pages *(primary)*

Pushing to `main` triggers [`deploy.yml`](.github/workflows/deploy.yml), which runs the tests,
refreshes the market snapshot, builds with `DEPLOY_TARGET=gh-pages` (setting the base path to
`/Kelly-Criterion/`) and deploys.

The workflow also runs **every 30 minutes** to keep the crude snapshot fresh. It bakes the data
into the deployed artifact rather than committing it, so the schedule never writes to the
repository.

> **Live at → https://xyb3rpunq.github.io/Kelly-Criterion/**

### Vercel *(optional)*

Import the repository; [`vercel.json`](vercel.json) configures the rest. This used to be the only
way to get crude anywhere near live, but since the data layer moved to TradingView the static
Pages build gets the same feeds, so **Vercel is now purely optional** and offers no data
advantage. The `/api/quotes` function remains as a second fallback if you deploy there.

No API keys exist anywhere in this project, on either target.

---

## 12 · Disclaimer

**This is an educational simulator. It is not financial, investment or trading advice, and it is
not a research product.**

The win probability `p` is a subjective figure entered by the user. It is not measured, forecast
or validated by this tool, and every conclusion the app produces inherits its error. Simulated
results are not indicative of future performance.

This project is an independent open-source exercise with **no affiliation to, endorsement by, or
connection with any bank, fund, exchange, brokerage or financial institution** — including Citadel
or any other firm whose house style the tone of the generated memo may resemble.

Market prices come from free public APIs, may be delayed or incorrect, and **must not be used for
execution**.

---

<div align="center">

**MIT Licence** · © 2026 [xyb3rpunq](https://github.com/xyb3rpunq)

`f* = (p·b − q) / b`

</div>
