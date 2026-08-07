import { useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'
import { makeRng } from '../lib/kelly.js'

/**
 * Ambient backdrop: a ledger grid with a sparse node mesh over it.
 *
 * Deliberately quiet — it is texture behind the panels, not a second thing to
 * look at. The node positions are generated from a fixed seed so the layout is
 * identical on every load rather than reshuffling between visits.
 */
export function BackgroundGrid() {
  const reduce = useReducedMotion()

  const { nodes, links } = useMemo(() => {
    const rng = makeRng(20260807)
    const pts = Array.from({ length: 26 }, () => ({
      x: rng() * 100,
      y: rng() * 100,
      r: 0.9 + rng() * 1.4,
      delay: rng() * 6,
    }))

    // Connect each node to its nearest neighbour only. A full mesh turns into
    // visual noise; nearest-neighbour reads as structure.
    const edges = []
    pts.forEach((a, i) => {
      let best = -1
      let bestD = Infinity
      pts.forEach((b, j) => {
        if (i === j) return
        const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2
        if (d < bestD) {
          bestD = d
          best = j
        }
      })
      if (best > i) edges.push([a, pts[best]])
    })

    return { nodes: pts, links: edges }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Ledger grid */}
      <div
        className={`absolute inset-0 opacity-[0.55] ${reduce ? '' : 'animate-grid-drift'}`}
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(26,32,48,0.55) 1px, transparent 1px),' +
            'linear-gradient(to bottom, rgba(26,32,48,0.55) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 130% 90% at 50% 0%, #000 30%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse 130% 90% at 50% 0%, #000 30%, transparent 78%)',
        }}
      />

      {/* Node mesh */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          maskImage: 'radial-gradient(ellipse 120% 80% at 50% 10%, #000 20%, transparent 72%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 120% 80% at 50% 10%, #000 20%, transparent 72%)',
        }}
      >
        <g stroke="#6E5BFF" strokeWidth="0.06" opacity="0.22">
          {links.map(([a, b], i) => (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
        <g fill="#D4AF37">
          {nodes.map((n, i) => (
            <circle
              key={i}
              cx={n.x}
              cy={n.y}
              r={n.r * 0.14}
              opacity="0.3"
              style={
                reduce
                  ? undefined
                  : { animation: `node-pulse ${5 + (i % 4)}s ease-in-out ${n.delay}s infinite` }
              }
            />
          ))}
        </g>
      </svg>

      {/* Two accent washes — gold low-left, chain high-right — so the page has a
          direction of light instead of a flat black field. */}
      <div className="absolute -left-40 top-1/3 h-[36rem] w-[36rem] rounded-full bg-gold/[0.05] blur-[130px]" />
      <div className="absolute -right-52 -top-32 h-[40rem] w-[40rem] rounded-full bg-chain/[0.07] blur-[140px]" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-void to-transparent" />
    </div>
  )
}
