import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DICTIONARIES, DEFAULT_LANG, LANGUAGES } from '../lib/i18n.jsx'

const LanguageContext = createContext(null)
const STORAGE_KEY = 'kelly-terminal:lang'

const isSupported = (code) => LANGUAGES.some((l) => l.code === code)

/**
 * Picks the initial language once, in this order: a previous explicit choice,
 * then the browser's preference, then English. Reading navigator.language means
 * an Indonesian visitor lands on Indonesian without having to hunt for a toggle.
 */
function detectLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANG
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && isSupported(stored)) return stored
  } catch {
    /* storage blocked — fall through to detection */
  }
  const nav = (navigator.languages || [navigator.language || '']).map((l) =>
    String(l).toLowerCase(),
  )
  if (nav.some((l) => l.startsWith('id') || l.startsWith('in'))) return 'id'
  return DEFAULT_LANG
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectLanguage)

  const setLang = useCallback((next) => {
    if (!isSupported(next)) return
    setLangState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* non-fatal: the choice just will not persist */
    }
  }, [])

  const t = DICTIONARIES[lang] || DICTIONARIES[DEFAULT_LANG]

  // Keep the document in sync so screen readers announce the right language and
  // the tab/description match what is on screen.
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t.meta.title
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', t.meta.description)
  }, [lang, t])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}

/** Shorthand for components that only need the strings. */
export function useT() {
  return useLanguage().t
}
