import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

const TONE = {
  default: 'text-ink',
  gold: 'text-gold-lit',
  chain: 'text-chain-lit',
  mint: 'text-mint',
  danger: 'text-danger',
  amber: 'text-amber',
  dim: 'text-dim',
}

/** A labelled figure. The atom the whole dashboard is built from. */
export function Stat({ label, value, sub, tone = 'default', size = 'md', align = 'left' }) {
  const sizes = {
    sm: 'text-[0.95rem]',
    md: 'text-xl',
    lg: 'text-3xl',
  }

  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <p className="eyebrow mb-1">{label}</p>
      <p className={`font-mono font-semibold leading-none ${sizes[size]} ${TONE[tone]}`}>{value}</p>
      {sub && <p className="mt-1.5 text-2xs leading-snug text-mute">{sub}</p>}
    </div>
  )
}

/**
 * Tweens between numeric values so a changing figure reads as the same number
 * moving rather than a different number appearing. Falls straight through to
 * the final value when the user prefers reduced motion.
 */
export function AnimatedNumber({ value, format, duration = 420, className = '' }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef(0)

  useEffect(() => {
    if (reduce || !Number.isFinite(value) || !Number.isFinite(fromRef.current)) {
      fromRef.current = value
      setShown(value)
      return undefined
    }

    const from = fromRef.current
    const delta = value - from
    if (delta === 0) return undefined

    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutExpo — fast commit, soft settle.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      const current = from + delta * eased
      // Track the live position, not just the endpoint: if a new value arrives
      // mid-tween the next run has to start from where the digits actually are,
      // otherwise the number visibly jumps back before animating forward again.
      fromRef.current = current
      setShown(current)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration, reduce])

  return <span className={className}>{format(shown)}</span>
}

/** Small status pill — used for tiers, source labels and honesty badges. */
export function Pill({ children, tone = 'dim', title, className = '' }) {
  const tones = {
    dim: 'border-line bg-raise text-dim',
    gold: 'border-gold/40 bg-gold/10 text-gold-lit',
    chain: 'border-chain/40 bg-chain/10 text-chain-lit',
    mint: 'border-mint/35 bg-mint/10 text-mint',
    danger: 'border-danger/40 bg-danger/10 text-danger',
    amber: 'border-amber/40 bg-amber/10 text-amber',
  }
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-1 font-mono text-2xs uppercase tracking-wider ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
