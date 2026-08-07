import { motion } from 'framer-motion'

/**
 * The one surface primitive. Every panel in the app is this: a raised dark
 * plane with a 1px gradient edge and a tracked-out eyebrow above its title.
 */
export function Panel({
  eyebrow,
  title,
  aside,
  children,
  className = '',
  tone = 'default',
  as: Tag = 'section',
  ...rest
}) {
  const edge = tone === 'gold' ? 'hairline-gold' : tone === 'mute' ? 'hairline-mute' : ''

  return (
    <Tag
      className={`hairline ${edge} relative rounded-lg bg-panel shadow-panel ${className}`}
      {...rest}
    >
      {(eyebrow || title || aside) && (
        <header className="relative z-10 flex items-start justify-between gap-4 border-b border-lineSoft px-5 py-4">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
            {title && (
              <h2 className="font-display text-[0.95rem] font-semibold leading-tight text-ink">
                {title}
              </h2>
            )}
          </div>
          {aside && <div className="shrink-0 pt-0.5">{aside}</div>}
        </header>
      )}
      <div className="relative z-10">{children}</div>
    </Tag>
  )
}

/** Panel that participates in the page-load stagger. */
export function MotionPanel({ children, ...props }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      <Panel {...props}>{children}</Panel>
    </motion.div>
  )
}
