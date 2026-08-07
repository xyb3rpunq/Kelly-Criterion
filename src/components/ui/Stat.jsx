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
    const settle = () => {
      fromRef.current = value
      setShown(value)
    }

    // Skip the tween entirely when it cannot or should not run. document.hidden
    // matters here: requestAnimationFrame does not fire in a backgrounded tab,
    // so animating would leave the figure frozen at a stale number until the
    // user came back. For a position-sizing readout that is not an acceptable
    // failure mode — showing 0.00% when the answer is 49.25% is worse than
    // showing it without a transition.
    if (reduce || !Number.isFinite(value) || !Number.isFinite(fromRef.current) || document.hidden) {
      settle()
      return undefined
    }

    const from = fromRef.current
    const delta = value - from
    if (delta === 0) return undefined

    const start = performance.now()
    let finished = false

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
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        finished = true
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    // Safety net for any environment that throttles or drops frames mid-tween
    // (tab hidden after the animation started, heavily throttled renderer).
    // The displayed figure must always converge on the real one.
    const guard = setTimeout(() => {
      if (!finished) settle()
    }, duration + 150)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(guard)
    }
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
