import { motion } from 'framer-motion'

const line = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export function Hero() {
  return (
    <motion.section
      id="top"
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.09, delayChildren: 0.15 }}
      className="relative mx-auto max-w-[1400px] px-4 pb-10 pt-14 sm:px-6 sm:pt-20"
    >
      <motion.p variants={line} className="eyebrow mb-5">
        Position sizing · Kelly Criterion · f* = (p·b − q) / b
      </motion.p>

      <motion.h1
        variants={line}
        className="max-w-4xl text-balance font-display text-[2.1rem] font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]"
      >
        This tells you <span className="metal-text">how much</span> to risk.
        <br />
        It will never tell you <span className="text-chain-lit">which way</span> to trade.
      </motion.h1>

      <motion.p variants={line} className="mt-6 max-w-2xl text-[0.95rem] leading-relaxed text-dim">
        Kelly Terminal converts a trade&apos;s reward-to-risk geometry and your own estimate of its
        win probability into an optimal fraction of capital — then stress-tests that fraction
        against thousands of simulated outcomes. Direction, entry timing and whether your edge is
        real remain entirely your problem.
      </motion.p>

      <motion.div variants={line} className="mt-8 flex flex-wrap items-center gap-3">
        <a
          href="#calculator"
          className="group relative overflow-hidden rounded border border-gold/45 bg-gold/10 px-5 py-2.5 font-mono text-2xs uppercase tracking-terminal text-gold-lit transition-all duration-200 hover:border-gold/70 hover:bg-gold/[0.16] hover:shadow-glow-gold"
        >
          <span className="relative z-10">Open calculator ↓</span>
        </a>
        <a
          href="#memo"
          className="rounded border border-line bg-raise px-5 py-2.5 font-mono text-2xs uppercase tracking-terminal text-dim transition-colors hover:border-chain/50 hover:text-chain-lit"
        >
          Jump to risk memo
        </a>
      </motion.div>

      <motion.div
        variants={line}
        className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-lineSoft pt-6 font-mono text-2xs text-mute"
      >
        <span>
          <span className="text-dim">5</span> instruments monitored
        </span>
        <span>
          <span className="text-dim">Monte Carlo</span> re-runs on every input change
        </span>
        <span>
          <span className="text-dim">p</span> is your assumption, not a forecast
        </span>
        <span>
          <span className="text-dim">Educational</span> tool — not financial advice
        </span>
      </motion.div>
    </motion.section>
  )
}
