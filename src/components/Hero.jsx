import { motion } from 'framer-motion'
import { useT } from '../hooks/useLanguage.jsx'

const line = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export function Hero() {
  const t = useT()

  return (
    <motion.section
      id="top"
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.09, delayChildren: 0.15 }}
      className="relative mx-auto max-w-[1400px] px-4 pb-10 pt-14 sm:px-6 sm:pt-20"
    >
      <motion.p variants={line} className="eyebrow mb-5">
        {t.hero.eyebrow}
      </motion.p>

      <motion.h1
        variants={line}
        className="max-w-4xl text-balance font-display text-[2.1rem] font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]"
      >
        {t.hero.titleLead} <span className="metal-text">{t.hero.titleHow}</span> {t.hero.titleMid}
        <br />
        {t.hero.titleNever} <span className="text-chain-lit">{t.hero.titleWhich}</span>{' '}
        {t.hero.titleTrade}
      </motion.h1>

      <motion.p variants={line} className="mt-6 max-w-2xl text-[0.95rem] leading-relaxed text-dim">
        {t.hero.lede}
      </motion.p>

      <motion.div variants={line} className="mt-8 flex flex-wrap items-center gap-3">
        <a
          href="#calculator"
          className="group relative overflow-hidden rounded border border-gold/45 bg-gold/10 px-5 py-2.5 font-mono text-2xs uppercase tracking-terminal text-gold-lit transition-all duration-200 hover:border-gold/70 hover:bg-gold/[0.16] hover:shadow-glow-gold"
        >
          <span className="relative z-10">{t.hero.ctaCalc}</span>
        </a>
        <a
          href="#memo"
          className="rounded border border-line bg-raise px-5 py-2.5 font-mono text-2xs uppercase tracking-terminal text-dim transition-colors hover:border-chain/50 hover:text-chain-lit"
        >
          {t.hero.ctaMemo}
        </a>
      </motion.div>

      <motion.div
        variants={line}
        className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-lineSoft pt-6 font-mono text-2xs text-mute"
      >
        {t.hero.facts.map(([lead, rest]) => (
          <span key={lead}>
            <span className="text-dim">{lead}</span> {rest}
          </span>
        ))}
      </motion.div>
    </motion.section>
  )
}
