import { motion } from 'framer-motion'
import { LANGUAGES } from '../lib/i18n.jsx'
import { useLanguage } from '../hooks/useLanguage.jsx'
import { fmtAge, fmtClock } from '../lib/format.js'
import { Pill } from './ui/Stat.jsx'
import { Ticker } from './Ticker.jsx'

const STATUS = {
  connecting: { tone: 'dim', dot: 'bg-mute' },
  live: { tone: 'mint', dot: 'bg-mint' },
  degraded: { tone: 'amber', dot: 'bg-amber' },
  error: { tone: 'danger', dot: 'bg-danger' },
}

function LanguageSwitch({ lang, setLang, label }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex overflow-hidden rounded border border-line bg-raise"
    >
      {LANGUAGES.map((l) => {
        const active = l.code === lang
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLang(l.code)}
            aria-pressed={active}
            title={l.name}
            className={`px-2 py-1 font-mono text-2xs uppercase tracking-wider transition-colors ${
              active ? 'bg-gold/15 text-gold-lit' : 'text-mute hover:text-ink'
            }`}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}

export function Header({ quotes, status, updatedAt, now }) {
  const { lang, setLang, t } = useLanguage()
  const s = STATUS[status] || STATUS.connecting
  const statusText = t.header.status[status] || t.header.status.connecting

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

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* UTC session clock — ticks every second alongside the tape. */}
          <span
            className="hidden font-mono text-2xs tabular-nums text-dim sm:inline"
            title="UTC"
          >
            {fmtClock(now)}
            <span className="ml-1 text-mute">UTC</span>
          </span>

          {/*
            No wallet button. This page connects to no chain and holds no keys,
            so a "Connect Wallet" control would be a lie told for decoration.
            What it does connect to is public price APIs — that is what the
            indicator reports.
          */}
          <Pill tone={s.tone} title={t.header.statusTitle(updatedAt ? fmtAge(updatedAt, now) : null)}>
            <span
              className={`h-1.5 w-1.5 rounded-full ${s.dot} ${status === 'live' ? 'animate-ticker-flick' : ''}`}
            />
            {statusText}
          </Pill>

          <LanguageSwitch lang={lang} setLang={setLang} label={t.header.langLabel} />

          <a
            href="https://github.com/xyb3rpunq/Kelly-Criterion"
            target="_blank"
            rel="noreferrer noopener"
            className="hidden rounded border border-line bg-raise px-2.5 py-1 font-mono text-2xs uppercase tracking-wider text-dim transition-colors hover:border-mute/60 hover:text-ink lg:inline-block"
          >
            {t.header.source}
          </a>
        </div>
      </div>

      {/* The tape runs full width below the nav, at every breakpoint. */}
      <Ticker quotes={quotes} />
    </motion.header>
  )
}
