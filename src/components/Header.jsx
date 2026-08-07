import { motion } from 'framer-motion'
import { INSTRUMENTS } from '../lib/market.js'
import { fmtNum, fmtSignedPct, fmtAge } from '../lib/format.js'
import { Pill } from './ui/Stat.jsx'

const STATUS = {
  connecting: { tone: 'dim', dot: 'bg-mute', text: 'CONNECTING' },
  live: { tone: 'mint', dot: 'bg-mint', text: 'LIVE' },
  degraded: { tone: 'amber', dot: 'bg-amber', text: 'PARTIAL' },
  error: { tone: 'danger', dot: 'bg-danger', text: 'OFFLINE' },
}

function TickerCell({ instrument, quote, now }) {
  const price = quote?.price
  const change = quote?.changePct
  const up = Number.isFinite(change) && change > 0
  const down = Number.isFinite(change) && change < 0

  return (
    <div className="flex shrink-0 items-baseline gap-2 border-l border-lineSoft px-3.5 first:border-l-0 first:pl-0">
      <span className="font-mono text-2xs uppercase tracking-wider text-mute">
        {instrument.label}
      </span>
      <span
        className={`font-mono text-xs font-semibold tabular-nums ${
          price === null || price === undefined ? 'text-mute' : 'text-ink'
        }`}
        title={
          quote
            ? `${instrument.name} · ${quote.source} · ${fmtAge(quote.ts, now)}`
            : instrument.name
        }
      >
        {fmtNum(price, instrument.decimals)}
      </span>
      <span
        className={`font-mono text-2xs tabular-nums ${
          up ? 'text-mint' : down ? 'text-danger' : 'text-mute'
        }`}
      >
        {fmtSignedPct(change, 2)}
      </span>
    </div>
  )
}

export function Header({ quotes, status, updatedAt, now }) {
  const s = STATUS[status] || STATUS.connecting

  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 border-b border-line bg-void/85 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 sm:px-6">
        {/* Wordmark */}
        <a href="#top" className="flex shrink-0 items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
            <path
              d="M8 5v22M8 17.5L19 5M13 13l10 14"
              stroke="url(#kg)"
              strokeWidth="2.8"
              fill="none"
              strokeLinecap="square"
            />
            <defs>
              <linearGradient id="kg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F4E4A6" />
                <stop offset="60%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#6E5BFF" />
              </linearGradient>
            </defs>
          </svg>
          <span className="font-display text-sm font-bold tracking-[0.14em] text-ink">
            KELLY<span className="text-gold">&nbsp;TERMINAL</span>
          </span>
        </a>

        {/* Ticker strip — DXY, XAU, XAG, USOIL, BTC in that order */}
        <div className="scroll-x hidden min-w-0 flex-1 md:block">
          <div className="flex items-center">
            {INSTRUMENTS.map((inst) => (
              <TickerCell key={inst.id} instrument={inst} quote={quotes?.[inst.id]} now={now} />
            ))}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/*
            No wallet button. This page connects to no chain and holds no keys,
            so a "Connect Wallet" control would be a lie told for decoration.
            What it does connect to is public price APIs — that is what the
            indicator reports.
          */}
          <Pill
            tone={s.tone}
            title={
              updatedAt
                ? `Public market APIs · last refresh ${fmtAge(updatedAt, now)}`
                : 'Contacting public market APIs'
            }
          >
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${status === 'live' ? 'animate-ticker-flick' : ''}`} />
            {s.text}
          </Pill>
          <a
            href="https://github.com/xyb3rpunq/Kelly-Criterion"
            target="_blank"
            rel="noreferrer noopener"
            className="hidden rounded border border-line bg-raise px-2.5 py-1 font-mono text-2xs uppercase tracking-wider text-dim transition-colors hover:border-mute/60 hover:text-ink sm:inline-block"
          >
            Source
          </a>
        </div>
      </div>

      {/* Mobile ticker gets its own row rather than being hidden entirely */}
      <div className="scroll-x border-t border-lineSoft px-4 py-2 md:hidden">
        <div className="flex items-center">
          {INSTRUMENTS.map((inst) => (
            <TickerCell key={inst.id} instrument={inst} quote={quotes?.[inst.id]} now={now} />
          ))}
        </div>
      </div>
    </motion.header>
  )
}
