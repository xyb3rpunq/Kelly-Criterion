import { INSTRUMENTS } from '../lib/market.js'
import { useT } from '../hooks/useLanguage.jsx'

export function Footer({ snapshot }) {
  const t = useT()
  const built = snapshot?.generatedAt
    ? new Date(snapshot.generatedAt).toISOString().slice(0, 16).replace('T', ' ')
    : null

  return (
    <footer className="relative z-10 mt-16 border-t border-line bg-panel/40">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-display text-sm font-bold tracking-[0.14em] text-ink">
              KELLY<span className="text-gold">&nbsp;TERMINAL</span>
            </p>
            <p className="mt-3 max-w-md text-2xs leading-relaxed text-mute">{t.footer.blurb}</p>
            <p className="mt-4 font-mono text-[0.6rem] uppercase tracking-wider text-mute">
              {t.footer.notAdvice}
            </p>
          </div>

          <div>
            <p className="eyebrow mb-3">{t.footer.dataSources}</p>
            <ul className="space-y-1.5 font-mono text-[0.6rem] text-mute">
              {INSTRUMENTS.map((i) => (
                <li key={i.id} className="flex justify-between gap-3">
                  <span className="text-dim">{i.label}</span>
                  <span className="text-right">{i.sourceLabel}</span>
                </li>
              ))}
            </ul>
            {built && (
              <p className="mt-3 font-mono text-[0.6rem] text-mute">{t.footer.snapshotAt(built)}</p>
            )}
          </div>

          <div>
            <p className="eyebrow mb-3">{t.footer.project}</p>
            <ul className="space-y-2 font-mono text-2xs">
              <li>
                <a
                  href="https://github.com/xyb3rpunq/Kelly-Criterion"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-dim transition-colors hover:text-gold-lit"
                >
                  {t.footer.repo} ↗
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/xyb3rpunq/Kelly-Criterion/blob/main/src/lib/kelly.js"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-dim transition-colors hover:text-gold-lit"
                >
                  {t.footer.maths} ↗
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/xyb3rpunq/Kelly-Criterion/issues"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-dim transition-colors hover:text-gold-lit"
                >
                  {t.footer.issues} ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-lineSoft pt-5">
          <p className="font-mono text-[0.6rem] text-mute">
            {t.footer.rights(new Date().getFullYear())}
          </p>
          <p className="font-mono text-[0.6rem] text-mute">
            f* = (p·b − q) / b
          </p>
        </div>
      </div>
    </footer>
  )
}
