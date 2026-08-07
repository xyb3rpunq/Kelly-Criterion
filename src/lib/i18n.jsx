/**
 * Bilingual copy: English and Bahasa Indonesia.
 *
 * Both dictionaries carry the same key shape. Anything with runtime values is a
 * function rather than a template with placeholders, so each language can put
 * the numbers where its own grammar wants them instead of being forced into
 * English word order.
 *
 * The Indonesian side is written as professional risk-desk register — the same
 * flat, numbers-first tone as the English, not a word-for-word translation.
 */

import { fmtPct, fmtUSD, fmtR } from './format.js'

export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'id', label: 'ID', name: 'Bahasa Indonesia' },
]

export const DEFAULT_LANG = 'en'

const en = {
  meta: {
    title: 'Kelly Terminal — Position Sizing for DXY, Gold, Silver, Oil & Bitcoin',
    description:
      'Kelly Criterion position-sizing calculator and Monte Carlo simulator across five instruments. Educational tool — not financial advice.',
  },

  header: {
    source: 'Source',
    langLabel: 'Language',
    tapeLabel: 'Live price tape',
    status: {
      connecting: 'CONNECTING',
      live: 'LIVE',
      degraded: 'PARTIAL',
      error: 'OFFLINE',
    },
    statusTitle: (age) =>
      age ? `Public market APIs · last refresh ${age}` : 'Contacting public market APIs',
  },

  hero: {
    eyebrow: 'Position sizing · Kelly Criterion · f* = (p·b − q) / b',
    titleLead: 'This tells you',
    titleHow: 'how much',
    titleMid: 'to risk.',
    titleNever: 'It will never tell you',
    titleWhich: 'which way',
    titleTrade: 'to trade.',
    lede: 'Kelly Terminal converts a trade’s reward-to-risk geometry and your own estimate of its win probability into an optimal fraction of capital — then stress-tests that fraction against thousands of simulated outcomes. Direction, entry timing and whether your edge is real remain entirely your problem.',
    ctaCalc: 'Open calculator ↓',
    ctaMemo: 'Jump to risk memo',
    facts: [
      ['5', 'instruments monitored'],
      ['Monte Carlo', 're-runs on every input change'],
      ['p', 'is your assumption, not a forecast'],
      ['Educational', 'tool — not financial advice'],
    ],
  },

  monitor: {
    eyebrow: 'Market monitor · 5 instruments',
    title: 'Select the instrument you are sizing',
    live: 'live',
    cached: 'cached',
    delayed: (m) => (m ? `delayed ${m}m` : 'delayed'),
    fallback: 'fallback',
    unavailable: 'unavailable',
    snapshot: 'snapshot',
    proxyLive: 'proxy live',
    h24: '24h',
    sourcesLabel: 'Sources.',
    sourcesBody:
      'All five instruments come from TradingView’s public scanner in a single request, polled every 3 seconds. DXY, gold, silver and Bitcoin are streaming feeds; WTI crude is a 10-minute delayed futures feed, which is the best available without a paid market-data subscription — so it is labelled DELAYED rather than presented as live. If that endpoint fails, each instrument independently falls back to its own documented public API and is marked FALLBACK. Sparklines show prices observed since this page loaded, not the full trading session.',
  },

  setup: {
    eyebrow: 'Step 01 · Trade geometry',
    title: 'Trade setup',
    invalid: 'invalid',
    direction: 'Direction',
    buy: 'Buy / Long',
    sell: 'Sell / Short',
    instrument: 'Instrument',
    sync: 'Sync entry to market',
    entry: 'Entry price',
    stop: 'Stop loss',
    target: 'Take profit',
    capital: 'Account capital',
    riskUnit: 'Risk / unit',
    rewardUnit: 'Reward / unit',
    netOdds: 'net odds',
    riskHint: (v) => `Risk ${v}`,
    rewardHint: (v) => `Reward ${v}`,
    stopSide: (isBuy) => `Stop must sit ${isBuy ? 'below' : 'above'} entry`,
    targetSide: (isBuy) => `Target must sit ${isBuy ? 'above' : 'below'} entry`,
    capitalHint: (v) => `Sizing is expressed against ${v} of NAV`,
    capitalInvalid: 'Enter a capital figure above zero',
  },

  prob: {
    eyebrow: 'Step 02 · Subjective assumption',
    title: 'Win probability',
    above: 'above break-even',
    below: 'below break-even',
    pLabel: 'p — your estimate',
    breakEven: (v) => `break-even ${v}`,
    readThis: 'Read this.',
    readBody: (
      <>
        This number is <em className="not-italic text-ink">your assumption</em>. Nothing in this app
        measures, backtests or forecasts it. Every figure below — the optimal fraction, the equity
        curves, the verdict — is only as good as this one input, and it is far more sensitive to it
        than most people expect. The sensitivity table in the risk memo shows exactly how much.
      </>
    ),
    fractionLabel: 'Kelly fraction applied',
    full: 'Full',
    half: 'Half',
    quarter: 'Quarter',
    fractionNote:
      'Full Kelly maximises long-run growth rate but produces drawdowns most desks — and most people — cannot sit through. Fractional Kelly gives up a little expected growth for a large reduction in path volatility.',
    edge: 'Edge',
    fFull: 'f* full',
    lossRate: 'Loss rate q',
  },

  gauge: {
    eyebrow: 'Step 03 · Optimal fraction',
    title: 'Kelly gauge',
    kellySuffix: 'kelly',
    fApplied: 'f* applied',
    ofNav: 'of NAV per trade',
    atRisk: 'at risk',
    zones: ['Conservative', 'Optimal band', 'Aggressive', "Gambler's ruin"],
    full: 'Full',
    half: 'Half',
    quarter: 'Quarter',
    capBindsLabel: 'Cap binds.',
    capBinds: (asked, capped, dollars, capital) =>
      `The model asks for ${asked} of NAV. A conventional 2% per-trade house limit would cut the working size to ${capped} (${dollars} on ${capital}).`,
    invalidGeometry:
      'Trade geometry is incomplete — enter an entry, stop and target that sit on the correct sides of each other.',
  },

  mc: {
    eyebrow: 'Step 04 · Path simulation',
    title: (paths, trades) => `Monte Carlo · ${paths} paths × ${trades} trades`,
    seed: 'seed',
    seedTitle: 'Seed for the pseudo-random draw — same seed, same paths.',
    reroll: 'Re-roll',
    start: 'start',
    ruin: 'ruin −50%',
    legendMedian: 'median across paths',
    legendPaths: 'individual simulated paths',
    legendSizing: (k) => `applied sizing: ${k} Kelly`,
    logAxis: 'log₁₀ equity axis',
    linearAxis: 'linear equity axis',
    tooltipTrade: (t) => `Trade ${t}`,
    tooltipMedian: 'median',
    medianFinal: 'Median final',
    best: 'Best path',
    worst: 'Worst path',
    pProfit: 'P(profit)',
    pRuin: 'P(ruin)',
    avgDD: 'Avg max DD',
    note: (trades) =>
      `Each path compounds a fixed fraction of current equity over ${trades} independent trades drawn at the assumed win rate. A path that reaches the ruin line stops trading rather than being allowed to recover, which is how a real risk limit behaves. Independence is an assumption of the model, not a property of markets.`,
  },

  journal: {
    eyebrow: 'Step 02b · Evidence',
    title: 'Trade journal',
    nTrades: (n) => `${n} logged`,
    whyLabel: 'Why this exists.',
    why: 'Everything above rests on a win rate you guessed. Log what actually happened and the tool measures it instead — both the win rate and the realised reward-to-risk, slippage included.',
    rLabel: (inst) => `Result in R · ${inst}`,
    rHint: '+2 = made twice what you risked',
    add: 'Log',
    notePlaceholder: 'Optional note — setup, session, mistake…',
    noteLabel: 'Note',
    measured: 'Measured from your record',
    scopeAll: 'All',
    measuredP: 'Win rate',
    measuredB: 'Realised b',
    decided: (w, l) => `${w}W / ${l}L`,
    needBoth: 'needs a win and a loss',
    expectancy: 'Expectancy',
    totalR: 'Net R',
    streak: 'Worst streak',
    scratches: 'Scratches',
    ledger: 'Ledger',
    removeOne: 'Delete this entry',
    export: 'Export',
    import: 'Import',
    clear: 'Clear all',
    clearConfirm: 'Delete every journal entry? This cannot be undone.',
    privacy:
      'Stored in this browser only. Never uploaded, never sent anywhere — export the file if you want a backup.',
    importErrors: {
      'invalid-json': 'That file is not valid JSON.',
      'not-a-journal': 'That file does not contain a journal.',
      'no-valid-entries': 'No usable entries found in that file.',
    },
  },

  bayes: {
    eyebrow: 'Step 03b · Uncertainty',
    title: 'Posterior on p',
    pEdgePill: (v) => `P(edge) ${v}`,
    needGeometry: 'Enter a valid trade setup to see the posterior.',
    readLabel: 'How to read this.',
    readNoData:
      'With no logged trades this is simply your slider redrawn as a distribution — wide, because a single opinion carries no evidence. Log results in the journal and it will tighten around what actually happens.',
    readWithData: (n, priorWeight) =>
      `Built from ${n} decided trades plus your slider as a weak prior, which still carries ${priorWeight} of the weight. The narrower the hump, the more the record — rather than the opinion — is doing the work.`,
    breakEven: 'break-even',
    axisNote: (level) => `win probability · shaded band = ${level} credible interval`,
    pLo: 'Lower bound',
    pMean: 'Posterior mean',
    pHi: 'Upper bound',
    centralSizing: 'Central sizing',
    centralNote: 'at the posterior mean',
    robustSizing: 'Robust sizing',
    robustNote: (level) => `at the bottom of the ${level} band`,
    linearity:
      'Because f* is linear in p, the interval for the fraction is exactly the image of the interval for the win rate — no simulation needed. It also means the growth-optimal size sits at the posterior mean, so uncertainty does not shift the optimum; it only tells you how much to trust it. Sizing on the lower bound is the conservative response to a thin record.',
    adopt: (v) => `Adopt measured p — set slider to ${v}`,
  },

  memo: {
    eyebrow: 'Internal risk memorandum',
    title: 'Position sizing assessment',
    subject: 'Subject',
    method: 'Method',
    methodValue: 'Kelly criterion, fractional application',
    inputs: 'Inputs',
    inputsValue: (p, b, nav) => `p = ${p} (assumed) · b = ${b} · NAV = ${nav}`,
    sample: 'Sample',
    sampleValue: (paths, trades, seed) => `${paths} paths × ${trades} trades · seed ${seed}`,

    h1: 'Executive summary',
    h2: 'Risk-adjusted sizing',
    h3: 'Scenario sensitivity — ±5pp on p',
    h4: 'Key risk factors',

    thAllocation: 'Allocation',
    thPctNav: '% of NAV',
    thRisk: '$ risk / trade',
    thVsCap: 'vs. house cap',
    applied: '← applied',
    over: (x) => `${x}× over`,
    within: 'within',
    fullKelly: 'Full Kelly',
    halfKelly: 'Half Kelly',
    quarterKelly: 'Quarter Kelly',

    sizingNote: (cap) => (
      <>
        Full Kelly is growth-optimal only in the limit of infinite trials, exact knowledge of p, and
        complete tolerance for the path taken. None of those hold in practice. It also carries
        roughly a <span className="text-dim">1-in-n chance of an n-fold drawdown</span> at some
        point in a long sequence, which is why allocation committees size in fractions and overlay a
        hard per-trade cap — here {cap} of NAV — on top of whatever the model returns. The binding
        constraint is always the lower of the two.
      </>
    ),

    thScenario: 'Scenario',
    thEdge: 'Edge',
    thMedianFinal: 'Median final',
    baseCase: 'Base case',
    scenarioShift: (sign) => `p ${sign}5pp`,

    sensitivityNote: (swing, brittle, edgeLost) => (
      <>
        A five-point error in p — well inside the range of ordinary self-assessment error — moves the
        optimal fraction by{' '}
        <span className={brittle ? 'text-amber' : 'text-dim'}>up to {swing}</span> relative to the
        base case
        {edgeLost ? ', and on the downside removes the edge entirely' : ''}. The output of this model
        is not more precise than the assumption feeding it, and quoting f* to two decimals does not
        make it so.
      </>
    ),
    sensitivityNoEdge:
      'With no positive edge in the base case, the sensitivity grid exists to show what the assumption would have to reach before any allocation is justified.',
    sensitivityMethod:
      'Median-final figures re-run the full simulation at each scenario on the same seed, so differences reflect the change in p rather than a different random draw.',

    risks: (ctx) => [
      {
        head: 'Model risk.',
        body: 'p is an assumption supplied by the user, not an estimate produced by this tool. It has not been backtested, cross-validated, or measured against a trade log. Nothing downstream is more reliable than that single number.',
      },
      {
        head: 'Path dependency.',
        body: `Expected value says nothing about the order in which returns arrive. This simulation shows an average maximum drawdown of ${ctx.avgDD} and a worst observed path of ${ctx.worst}. A sequence that hits its drawdown early can force de-risking before the edge has time to express.`,
      },
      {
        head: 'Regime and correlation risk.',
        body: `The model assumes independent, identically distributed trades. Macro releases — NFP, CPI, FOMC — are not stationary between prints, and ${ctx.instrument} exposure correlates with the broader dollar and rates complex rather than sitting in isolation. Consecutive trades around the same catalyst are one position, not several.`,
      },
      {
        head: 'Execution risk.',
        body: 'Every simulated trade fills exactly at the stop or the target. Live, stops gap through on high-impact news and spreads widen at the rollover and the release. Realised b is systematically worse than modelled b, which biases f* high — before any commission is charged.',
      },
    ],
    riskCapOverride: (asked, capped, cap) => ({
      head: 'Cap override active.',
      body: `The model requests ${asked} of NAV; the ${cap} per-trade limit reduces the working size to ${capped}. The figure below is the capped one.`,
    }),

    verdictLabel: 'VERDICT:',
    verdictTail: (pct, dollars) =>
      ` — position size capped at ${pct} NAV (${dollars}) pending live confirmation of edge.`,

    disclaimerLabel: 'Disclaimer.',
    disclaimer:
      'This document is generated automatically by an educational simulator. It is not financial, investment or trading advice, and it is not a research product. The win probability p is a subjective figure entered by the user; it is not measured, forecast or validated by this tool, and every conclusion above inherits its error. Simulated results are not indicative of future performance. This project is an independent open-source exercise with no affiliation to, endorsement by, or connection with any bank, fund, exchange, brokerage or financial institution — including Citadel or any other firm whose house style the tone of this memo may resemble. Market prices shown elsewhere on this page come from free public APIs, may be delayed or incorrect, and must not be used for execution. Trade your own risk, with your own money, at your own judgement.',

    summary: {
      invalid: (inst) =>
        `Trade geometry for ${inst} is incomplete or inconsistent — entry, stop and target do not describe a valid reward-to-risk structure. No sizing conclusion can be drawn until the setup resolves to a positive b.`,
      noEdge: ({ pPct, b, edge, bePct, gap }) =>
        `At an assumed win rate of ${pPct} against reward-to-risk odds of 1:${b}, expectancy is ${edge} per trade — non-positive. These odds require a win rate above ${bePct} simply to break even, and the stated assumption sits ${gap} percentage points below that threshold. Kelly returns no positive allocation; the correct size is zero. Increasing position size against a negative expectancy accelerates capital loss rather than compensating for it.`,
      edge: ({
        inst,
        pPct,
        b,
        edge,
        gap,
        bePct,
        fullPct,
        fractionKey,
        selectedPct,
        riskUSD,
        capital,
        paths,
        trades,
        medianFinal,
        medianDelta,
        probProfit,
        probRuin,
        avgDD,
        tier,
      }) =>
        `At an assumed win rate of ${pPct} against reward-to-risk odds of 1:${b}, ${inst} carries a positive expectancy of ${edge} per trade — ${gap} percentage points above the ${bePct} break-even win rate these odds demand. Full Kelly implies ${fullPct} of NAV per trade; the selected ${fractionKey} Kelly allocation is ${selectedPct}, or ${riskUSD} of risk on ${capital} of capital. Across ${paths} simulated paths of ${trades} trades, median terminal equity is ${medianFinal} (${medianDelta}), with ${probProfit} of paths finishing profitable, ${probRuin} reaching the −50% ruin threshold, and an average maximum drawdown of ${avgDD}. Classification: ${tier}.`,
    },
  },

  tiers: {
    INVALID: {
      label: 'Incomplete Setup',
      blurb: 'Trade parameters do not describe a valid risk/reward geometry.',
    },
    NO_EDGE: {
      label: 'No Edge — Do Not Size',
      blurb: 'Expected value is zero or negative. Kelly returns no positive allocation.',
    },
    MARGINAL: {
      label: 'Marginal Edge — Fractional Kelly Only',
      blurb: 'Edge is positive but thin enough to be indistinguishable from estimation error.',
    },
    PRESENT: {
      label: 'Edge Present — Standard Fractional Sizing',
      blurb: 'Edge supports a conventional fractional-Kelly allocation.',
    },
    OVERSTATED: {
      label: 'Edge Overstated — Re-examine Inputs',
      blurb:
        'Model output exceeds 25% of NAV per trade. In practice this signals an optimistic p, not an exceptional opportunity.',
    },
  },

  footer: {
    blurb:
      'An educational position-sizing simulator built around the Kelly criterion. It computes how much to risk given a reward-to-risk structure and an assumed win rate. It does not predict direction, does not generate signals, and has no opinion on whether any trade should be taken.',
    notAdvice: 'Not financial advice · No affiliation with any financial institution',
    dataSources: 'Data sources',
    snapshotAt: (t) => `Snapshot ${t} UTC`,
    project: 'Project',
    repo: 'Repository',
    maths: 'Read the maths',
    issues: 'Report an issue',
    rights: (year) => `© ${year} xyb3rpunq · MIT licence · Open source`,
  },

  a11y: {
    skip: 'Skip to calculator',
    gauge: (pct, tier) => `Applied Kelly fraction ${pct} of capital. Risk tier: ${tier}.`,
    pSlider: (pct) => `${pct} percent win probability`,
  },
}

const id = {
  meta: {
    title: 'Kelly Terminal — Position Sizing untuk DXY, Emas, Perak, Minyak & Bitcoin',
    description:
      'Kalkulator position sizing Kelly Criterion dan simulator Monte Carlo untuk lima instrumen. Alat edukasi — bukan nasihat keuangan.',
  },

  header: {
    source: 'Kode',
    langLabel: 'Bahasa',
    tapeLabel: 'Pita harga langsung',
    status: {
      connecting: 'MENYAMBUNG',
      live: 'LANGSUNG',
      degraded: 'SEBAGIAN',
      error: 'TERPUTUS',
    },
    statusTitle: (age) =>
      age ? `API pasar publik · pembaruan terakhir ${age}` : 'Menghubungi API pasar publik',
  },

  hero: {
    eyebrow: 'Position sizing · Kelly Criterion · f* = (p·b − q) / b',
    titleLead: 'Alat ini menghitung',
    titleHow: 'seberapa besar',
    titleMid: 'risiko Anda.',
    titleNever: 'Alat ini tidak pernah menentukan',
    titleWhich: 'arah',
    titleTrade: 'posisi Anda.',
    lede: 'Kelly Terminal mengubah struktur reward-to-risk sebuah setup dan estimasi probabilitas menang versi Anda sendiri menjadi fraksi modal yang optimal — lalu menguji fraksi itu terhadap ribuan hasil simulasi. Arah, waktu masuk, dan apakah edge Anda benar-benar ada tetap sepenuhnya tanggung jawab Anda.',
    ctaCalc: 'Buka kalkulator ↓',
    ctaMemo: 'Lompat ke memo risiko',
    facts: [
      ['5', 'instrumen dipantau'],
      ['Monte Carlo', 'dihitung ulang setiap input berubah'],
      ['p', 'adalah asumsi Anda, bukan prediksi'],
      ['Edukasi', '— bukan nasihat keuangan'],
    ],
  },

  monitor: {
    eyebrow: 'Monitor pasar · 5 instrumen',
    title: 'Pilih instrumen yang akan dihitung',
    live: 'langsung',
    cached: 'tersimpan',
    delayed: (m) => (m ? `tunda ${m}m` : 'tertunda'),
    fallback: 'cadangan',
    unavailable: 'tidak tersedia',
    snapshot: 'snapshot',
    proxyLive: 'proxy langsung',
    h24: '24j',
    sourcesLabel: 'Sumber data.',
    sourcesBody:
      'Kelima instrumen diambil dari scanner publik TradingView dalam satu permintaan, di-polling tiap 3 detik. DXY, emas, perak, dan Bitcoin adalah feed streaming; minyak WTI adalah feed futures dengan penundaan 10 menit — itu yang terbaik yang tersedia tanpa langganan data pasar berbayar, jadi diberi label TERTUNDA, bukan disamarkan sebagai langsung. Bila endpoint itu gagal, tiap instrumen jatuh sendiri-sendiri ke API publik terdokumentasinya masing-masing dan ditandai CADANGAN. Sparkline menampilkan harga yang teramati sejak halaman dibuka, bukan sepanjang sesi perdagangan.',
  },

  setup: {
    eyebrow: 'Langkah 01 · Geometri posisi',
    title: 'Setup posisi',
    invalid: 'tidak valid',
    direction: 'Arah',
    buy: 'Beli / Long',
    sell: 'Jual / Short',
    instrument: 'Instrumen',
    sync: 'Samakan entry dengan pasar',
    entry: 'Harga entry',
    stop: 'Stop loss',
    target: 'Take profit',
    capital: 'Modal akun',
    riskUnit: 'Risiko / unit',
    rewardUnit: 'Imbal / unit',
    netOdds: 'net odds',
    riskHint: (v) => `Risiko ${v}`,
    rewardHint: (v) => `Imbal ${v}`,
    stopSide: (isBuy) => `Stop harus berada di ${isBuy ? 'bawah' : 'atas'} entry`,
    targetSide: (isBuy) => `Target harus berada di ${isBuy ? 'atas' : 'bawah'} entry`,
    capitalHint: (v) => `Sizing dihitung terhadap NAV sebesar ${v}`,
    capitalInvalid: 'Masukkan nilai modal di atas nol',
  },

  prob: {
    eyebrow: 'Langkah 02 · Asumsi subjektif',
    title: 'Probabilitas menang',
    above: 'di atas titik impas',
    below: 'di bawah titik impas',
    pLabel: 'p — estimasi Anda',
    breakEven: (v) => `titik impas ${v}`,
    readThis: 'Baca ini.',
    readBody: (
      <>
        Angka ini adalah <em className="not-italic text-ink">asumsi Anda sendiri</em>. Tidak ada
        bagian dari aplikasi ini yang mengukur, membacktest, atau memprediksinya. Semua angka di
        bawah — fraksi optimal, kurva ekuitas, sampai vonis akhir — hanya sebaik satu input ini, dan
        sensitivitasnya jauh lebih besar daripada yang umumnya diduga. Tabel sensitivitas di memo
        risiko menunjukkan persis seberapa besar.
      </>
    ),
    fractionLabel: 'Fraksi Kelly yang dipakai',
    full: 'Penuh',
    half: 'Separuh',
    quarter: 'Seperempat',
    fractionNote:
      'Full Kelly memaksimalkan laju pertumbuhan jangka panjang, tetapi menghasilkan drawdown yang sebagian besar meja trading — dan sebagian besar orang — tidak sanggup tahan. Fractional Kelly melepas sedikit pertumbuhan demi penurunan volatilitas jalur yang besar.',
    edge: 'Edge',
    fFull: 'f* penuh',
    lossRate: 'Laju rugi q',
  },

  gauge: {
    eyebrow: 'Langkah 03 · Fraksi optimal',
    title: 'Kelly gauge',
    kellySuffix: 'kelly',
    fApplied: 'f* terpakai',
    ofNav: 'dari NAV per posisi',
    atRisk: 'nilai berisiko',
    zones: ['Konservatif', 'Zona optimal', 'Agresif', 'Gambler’s ruin'],
    full: 'Penuh',
    half: 'Separuh',
    quarter: 'Seperempat',
    capBindsLabel: 'Batas atas berlaku.',
    capBinds: (asked, capped, dollars, capital) =>
      `Model meminta ${asked} dari NAV. Batas internal 2% per posisi memotong ukuran kerja menjadi ${capped} (${dollars} atas modal ${capital}).`,
    invalidGeometry:
      'Geometri posisi belum lengkap — isi entry, stop, dan target pada sisi yang benar satu sama lain.',
  },

  mc: {
    eyebrow: 'Langkah 04 · Simulasi jalur',
    title: (paths, trades) => `Monte Carlo · ${paths} jalur × ${trades} posisi`,
    seed: 'seed',
    seedTitle: 'Seed untuk penarikan acak semu — seed sama, jalur sama.',
    reroll: 'Acak ulang',
    start: 'modal awal',
    ruin: 'ruin −50%',
    legendMedian: 'median seluruh jalur',
    legendPaths: 'jalur simulasi individual',
    legendSizing: (k) => `sizing terpakai: ${k} Kelly`,
    logAxis: 'sumbu ekuitas log₁₀',
    linearAxis: 'sumbu ekuitas linear',
    tooltipTrade: (t) => `Posisi ke-${t}`,
    tooltipMedian: 'median',
    medianFinal: 'Median akhir',
    best: 'Jalur terbaik',
    worst: 'Jalur terburuk',
    pProfit: 'P(profit)',
    pRuin: 'P(ruin)',
    avgDD: 'Rata-rata max DD',
    note: (trades) =>
      `Setiap jalur menggandakan fraksi tetap dari ekuitas berjalan selama ${trades} posisi independen yang ditarik pada win rate asumsi. Jalur yang menyentuh garis ruin berhenti bertransaksi, bukan dibiarkan pulih — begitulah batas risiko sungguhan bekerja. Independensi adalah asumsi model, bukan sifat pasar.`,
  },

  journal: {
    eyebrow: 'Langkah 02b · Bukti',
    title: 'Jurnal transaksi',
    nTrades: (n) => `${n} tercatat`,
    whyLabel: 'Kenapa ini ada.',
    why: 'Semua angka di atas bertumpu pada win rate yang Anda tebak. Catat apa yang benar-benar terjadi, dan alat ini akan mengukurnya — baik win rate maupun reward-to-risk yang terealisasi, termasuk slippage.',
    rLabel: (inst) => `Hasil dalam R · ${inst}`,
    rHint: '+2 = untung dua kali nilai risiko',
    add: 'Catat',
    notePlaceholder: 'Catatan opsional — setup, sesi, kesalahan…',
    noteLabel: 'Catatan',
    measured: 'Terukur dari rekam jejak Anda',
    scopeAll: 'Semua',
    measuredP: 'Win rate',
    measuredB: 'b terealisasi',
    decided: (w, l) => `${w}M / ${l}K`,
    needBoth: 'perlu satu menang dan satu kalah',
    expectancy: 'Ekspektasi',
    totalR: 'Net R',
    streak: 'Rentetan rugi',
    scratches: 'Impas',
    ledger: 'Buku catatan',
    removeOne: 'Hapus entri ini',
    export: 'Ekspor',
    import: 'Impor',
    clear: 'Hapus semua',
    clearConfirm: 'Hapus seluruh isi jurnal? Tindakan ini tidak bisa dibatalkan.',
    privacy:
      'Disimpan hanya di browser ini. Tidak pernah diunggah, tidak dikirim ke mana pun — ekspor filenya kalau mau cadangan.',
    importErrors: {
      'invalid-json': 'File itu bukan JSON yang valid.',
      'not-a-journal': 'File itu tidak berisi jurnal.',
      'no-valid-entries': 'Tidak ada entri yang bisa dipakai di file itu.',
    },
  },

  bayes: {
    eyebrow: 'Langkah 03b · Ketidakpastian',
    title: 'Posterior atas p',
    pEdgePill: (v) => `P(edge) ${v}`,
    needGeometry: 'Isi setup posisi yang valid untuk melihat posterior-nya.',
    readLabel: 'Cara membacanya.',
    readNoData:
      'Tanpa transaksi tercatat, ini hanyalah slider Anda yang digambar ulang sebagai distribusi — lebar, karena satu pendapat tidak membawa bukti apa pun. Catat hasil di jurnal dan kurvanya akan menyempit mengikuti kenyataan.',
    readWithData: (n, priorWeight) =>
      `Dibangun dari ${n} transaksi yang menentukan ditambah slider Anda sebagai prior lemah, yang masih memegang ${priorWeight} bobot. Makin sempit bukitnya, makin besar peran rekam jejak — bukan pendapat.`,
    breakEven: 'titik impas',
    axisNote: (level) => `probabilitas menang · pita berarsir = interval kredibel ${level}`,
    pLo: 'Batas bawah',
    pMean: 'Rata-rata posterior',
    pHi: 'Batas atas',
    centralSizing: 'Sizing tengah',
    centralNote: 'pada rata-rata posterior',
    robustSizing: 'Sizing konservatif',
    robustNote: (level) => `pada dasar pita ${level}`,
    linearity:
      'Karena f* linear terhadap p, interval fraksinya persis merupakan pemetaan dari interval win rate — tanpa perlu simulasi. Ini juga berarti ukuran optimal-pertumbuhan berada tepat di rata-rata posterior, jadi ketidakpastian tidak menggeser titik optimumnya; ia hanya memberi tahu seberapa layak angka itu dipercaya. Memakai batas bawah adalah respons konservatif terhadap rekam jejak yang masih tipis.',
    adopt: (v) => `Pakai p terukur — set slider ke ${v}`,
  },

  memo: {
    eyebrow: 'Memorandum risiko internal',
    title: 'Penilaian position sizing',
    subject: 'Subjek',
    method: 'Metode',
    methodValue: 'Kelly criterion, penerapan fraksional',
    inputs: 'Input',
    inputsValue: (p, b, nav) => `p = ${p} (asumsi) · b = ${b} · NAV = ${nav}`,
    sample: 'Sampel',
    sampleValue: (paths, trades, seed) => `${paths} jalur × ${trades} posisi · seed ${seed}`,

    h1: 'Ringkasan eksekutif',
    h2: 'Sizing setelah penyesuaian risiko',
    h3: 'Sensitivitas skenario — ±5pp pada p',
    h4: 'Faktor risiko utama',

    thAllocation: 'Alokasi',
    thPctNav: '% dari NAV',
    thRisk: 'Risiko / posisi',
    thVsCap: 'vs. batas internal',
    applied: '← dipakai',
    over: (x) => `${x}× di atas`,
    within: 'di dalam',
    fullKelly: 'Full Kelly',
    halfKelly: 'Half Kelly',
    quarterKelly: 'Quarter Kelly',

    sizingNote: (cap) => (
      <>
        Full Kelly hanya optimal secara pertumbuhan dalam limit percobaan tak hingga, pengetahuan p
        yang persis, dan toleransi penuh terhadap jalur yang dilalui. Tidak satu pun berlaku dalam
        praktik. Full Kelly juga membawa kira-kira{' '}
        <span className="text-dim">peluang 1-dari-n mengalami drawdown n kali lipat</span> pada suatu
        titik dalam rangkaian panjang. Itulah sebabnya komite alokasi menetapkan ukuran dalam fraksi
        dan menumpangkan batas keras per posisi — di sini {cap} dari NAV — di atas berapa pun angka
        yang dikeluarkan model. Kendala yang mengikat selalu yang lebih rendah di antara keduanya.
      </>
    ),

    thScenario: 'Skenario',
    thEdge: 'Edge',
    thMedianFinal: 'Median akhir',
    baseCase: 'Kasus dasar',
    scenarioShift: (sign) => `p ${sign}5pp`,

    sensitivityNote: (swing, brittle, edgeLost) => (
      <>
        Kesalahan lima poin pada p — masih di dalam rentang kekeliruan penilaian diri yang wajar —
        menggeser fraksi optimal{' '}
        <span className={brittle ? 'text-amber' : 'text-dim'}>hingga {swing}</span> relatif terhadap
        kasus dasar
        {edgeLost ? ', dan pada sisi bawah menghapus edge sepenuhnya' : ''}. Keluaran model ini tidak
        lebih presisi daripada asumsi yang memberinya makan, dan menulis f* sampai dua desimal tidak
        membuatnya jadi presisi.
      </>
    ),
    sensitivityNoEdge:
      'Karena tidak ada edge positif pada kasus dasar, tabel sensitivitas ini menunjukkan sampai di mana asumsi harus naik sebelum alokasi apa pun bisa dibenarkan.',
    sensitivityMethod:
      'Angka median akhir dihitung dengan menjalankan ulang simulasi penuh pada tiap skenario memakai seed yang sama, sehingga perbedaannya mencerminkan perubahan p — bukan penarikan acak yang berbeda.',

    risks: (ctx) => [
      {
        head: 'Risiko model.',
        body: 'p adalah asumsi yang dimasukkan pengguna, bukan estimasi yang dihasilkan alat ini. Angka itu belum dibacktest, belum divalidasi silang, dan belum diukur terhadap jurnal transaksi. Tidak ada satu pun hasil di bawahnya yang lebih andal daripada angka tunggal tersebut.',
      },
      {
        head: 'Ketergantungan jalur.',
        body: `Nilai ekspektasi tidak mengatakan apa pun tentang urutan kedatangan hasil. Simulasi ini menunjukkan rata-rata drawdown maksimum ${ctx.avgDD} dan jalur terburuk ${ctx.worst}. Rangkaian yang mengalami drawdown di awal bisa memaksa pengurangan risiko sebelum edge sempat terwujud.`,
      },
      {
        head: 'Risiko rezim dan korelasi.',
        body: `Model mengasumsikan posisi independen dan terdistribusi identik. Rilis makro — NFP, CPI, FOMC — tidak stasioner antar rilis, dan eksposur ${ctx.instrument} berkorelasi dengan kompleks dolar dan suku bunga yang lebih luas, bukan berdiri sendiri. Beberapa posisi berturut-turut di sekitar katalis yang sama adalah satu posisi, bukan beberapa.`,
      },
      {
        head: 'Risiko eksekusi.',
        body: 'Setiap posisi tersimulasi terisi persis di stop atau target. Di pasar nyata, stop bisa terlewat karena gap saat berita berdampak tinggi, dan spread melebar saat rollover maupun rilis data. Realisasi b secara sistematis lebih buruk daripada b model, yang membuat f* bias ke atas — sebelum komisi diperhitungkan.',
      },
    ],
    riskCapOverride: (asked, capped, cap) => ({
      head: 'Pembatasan aktif.',
      body: `Model meminta ${asked} dari NAV; batas ${cap} per posisi menurunkan ukuran kerja menjadi ${capped}. Angka pada vonis di bawah adalah angka yang sudah dibatasi.`,
    }),

    verdictLabel: 'VONIS:',
    verdictTail: (pct, dollars) =>
      ` — ukuran posisi dibatasi ${pct} dari NAV (${dollars}) sampai edge terkonfirmasi secara live.`,

    disclaimerLabel: 'Sanggahan.',
    disclaimer:
      'Dokumen ini dihasilkan otomatis oleh sebuah simulator edukasi. Ini bukan nasihat keuangan, investasi, atau perdagangan, dan bukan produk riset. Probabilitas menang p adalah angka subjektif yang dimasukkan pengguna; angka itu tidak diukur, tidak diprediksi, dan tidak divalidasi oleh alat ini, sehingga seluruh kesimpulan di atas mewarisi kesalahannya. Hasil simulasi tidak mengindikasikan kinerja di masa depan. Proyek ini adalah karya open-source independen tanpa afiliasi, dukungan, atau hubungan apa pun dengan bank, dana kelolaan, bursa, pialang, atau lembaga keuangan mana pun — termasuk Citadel atau perusahaan lain yang gaya penulisannya mungkin menyerupai nada memo ini. Harga pasar yang ditampilkan di halaman ini berasal dari API publik gratis, bisa tertunda atau keliru, dan tidak boleh dipakai untuk eksekusi. Tanggung risiko Anda sendiri, dengan uang Anda sendiri, atas penilaian Anda sendiri.',

    summary: {
      invalid: (inst) =>
        `Geometri posisi untuk ${inst} belum lengkap atau tidak konsisten — entry, stop, dan target belum membentuk struktur reward-to-risk yang valid. Tidak ada kesimpulan sizing yang bisa ditarik sampai setup menghasilkan b positif.`,
      noEdge: ({ pPct, b, edge, bePct, gap }) =>
        `Pada asumsi win rate ${pPct} terhadap odds reward-to-risk 1:${b}, ekspektasi per posisi adalah ${edge} — tidak positif. Odds sebesar itu menuntut win rate di atas ${bePct} hanya untuk mencapai titik impas, sementara asumsi yang dinyatakan berada ${gap} poin persentase di bawah ambang tersebut. Kelly tidak menghasilkan alokasi positif; ukuran yang benar adalah nol. Memperbesar posisi melawan ekspektasi negatif mempercepat kehilangan modal, bukan mengompensasinya.`,
      edge: ({
        inst,
        pPct,
        b,
        edge,
        gap,
        bePct,
        fullPct,
        fractionKey,
        selectedPct,
        riskUSD,
        capital,
        paths,
        trades,
        medianFinal,
        medianDelta,
        probProfit,
        probRuin,
        avgDD,
        tier,
      }) =>
        `Pada asumsi win rate ${pPct} terhadap odds reward-to-risk 1:${b}, ${inst} memiliki ekspektasi positif ${edge} per posisi — ${gap} poin persentase di atas win rate impas ${bePct} yang dituntut odds tersebut. Full Kelly menyiratkan ${fullPct} dari NAV per posisi; alokasi ${fractionKey} Kelly yang dipilih adalah ${selectedPct}, atau ${riskUSD} risiko atas modal ${capital}. Dari ${paths} jalur simulasi sepanjang ${trades} posisi, median ekuitas akhir berada di ${medianFinal} (${medianDelta}), dengan ${probProfit} jalur berakhir untung, ${probRuin} menyentuh ambang ruin −50%, dan rata-rata drawdown maksimum ${avgDD}. Klasifikasi: ${tier}.`,
    },
  },

  tiers: {
    INVALID: {
      label: 'Setup Belum Lengkap',
      blurb: 'Parameter posisi belum membentuk geometri risiko/imbal yang valid.',
    },
    NO_EDGE: {
      label: 'Tanpa Edge — Jangan Ambil Posisi',
      blurb: 'Nilai ekspektasi nol atau negatif. Kelly tidak menghasilkan alokasi positif.',
    },
    MARGINAL: {
      label: 'Edge Tipis — Hanya Fractional Kelly',
      blurb: 'Edge positif, tetapi setipis itu sulit dibedakan dari kesalahan estimasi.',
    },
    PRESENT: {
      label: 'Edge Ada — Sizing Fraksional Standar',
      blurb: 'Edge mendukung alokasi fractional Kelly yang konvensional.',
    },
    OVERSTATED: {
      label: 'Edge Terlalu Besar — Periksa Ulang Input',
      blurb:
        'Keluaran model melampaui 25% NAV per posisi. Dalam praktik ini menandakan p yang terlalu optimistis, bukan peluang luar biasa.',
    },
  },

  footer: {
    blurb:
      'Simulator position sizing edukatif yang dibangun di atas Kelly criterion. Alat ini menghitung seberapa besar risiko yang diambil berdasarkan struktur reward-to-risk dan win rate asumsi. Ia tidak memprediksi arah, tidak menghasilkan sinyal, dan tidak berpendapat apakah sebuah posisi layak diambil.',
    notAdvice: 'Bukan nasihat keuangan · Tanpa afiliasi dengan lembaga keuangan mana pun',
    dataSources: 'Sumber data',
    snapshotAt: (t) => `Snapshot ${t} UTC`,
    project: 'Proyek',
    repo: 'Repositori',
    maths: 'Baca perhitungannya',
    issues: 'Laporkan masalah',
    rights: (year) => `© ${year} xyb3rpunq · Lisensi MIT · Open source`,
  },

  a11y: {
    skip: 'Lompat ke kalkulator',
    gauge: (pct, tier) => `Fraksi Kelly terpakai ${pct} dari modal. Tingkat risiko: ${tier}.`,
    pSlider: (pct) => `probabilitas menang ${pct} persen`,
  },
}

export const DICTIONARIES = { en, id }

/**
 * Build the executive-summary paragraph in the active language.
 * Kept here rather than in the component so both languages stay side by side
 * and neither can silently drift from the other.
 */
export function buildSummary(t, ctx) {
  const { kelly, rr, p, stats, ladder, fractionKey, capital, tier, instrument } = ctx

  if (!kelly.valid) return t.memo.summary.invalid(instrument.label)

  const pPct = `${(p * 100).toFixed(1)}%`
  const bePct = `${(kelly.breakEvenP * 100).toFixed(1)}%`
  const gap = Math.abs(p * 100 - kelly.breakEvenP * 100).toFixed(1)

  if (kelly.edge <= 0) {
    return t.memo.summary.noEdge({
      pPct,
      b: rr.b.toFixed(2),
      edge: fmtR(kelly.edge),
      bePct,
      gap,
    })
  }

  const delta = (stats.medianFinal - capital) / capital

  return t.memo.summary.edge({
    inst: instrument.label,
    pPct,
    b: rr.b.toFixed(2),
    edge: fmtR(kelly.edge),
    gap,
    bePct,
    fullPct: fmtPct(ladder.full.pct),
    fractionKey: t.prob[fractionKey].toLowerCase(),
    selectedPct: fmtPct(ladder.selectedPct),
    riskUSD: fmtUSD(ladder.selectedPct * capital, 0),
    capital: fmtUSD(capital, 0),
    paths: stats.paths,
    trades: stats.trades,
    medianFinal: fmtUSD(stats.medianFinal, 0),
    medianDelta: `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`,
    probProfit: fmtPct(stats.probProfit, 0),
    probRuin: fmtPct(stats.probRuin, 0),
    avgDD: fmtPct(stats.avgMaxDrawdown, 0),
    tier: t.tiers[tier.id].label.toUpperCase(),
  })
}
