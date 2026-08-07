/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    // Deliberately replacing the default palette rather than extending it:
    // nothing in this UI should be able to reach for slate-500 by accident.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#000000',

      void: '#05060A', // page base — near-black, blue-shifted
      panel: '#0B0E14',
      raise: '#10141C', // raised surface inside a panel
      line: '#1A2030', // structural hairline
      lineSoft: '#141926',

      ink: '#E7EBF3',
      dim: '#8B94A8',
      mute: '#5A6478',

      // Accent 1 — metal. The gold layer.
      gold: {
        deep: '#8A6D1F',
        DEFAULT: '#D4AF37',
        lit: '#F4E4A6',
      },
      // Accent 2 — chain. The on-chain layer.
      chain: {
        deep: '#3A2FA8',
        DEFAULT: '#6E5BFF',
        lit: '#A79BFF',
      },
      mint: '#00E5C7',
      danger: '#FF4D6D',
      amber: '#FFB020',
    },
    fontFamily: {
      display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
    },
    extend: {
      borderRadius: {
        // Precision instrument, not a toy: nothing rounder than 6px.
        DEFAULT: '3px',
        sm: '2px',
        md: '4px',
        lg: '6px',
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        terminal: '0.18em',
      },
      boxShadow: {
        'glow-gold': '0 0 0 1px rgba(212,175,55,0.25), 0 0 28px -6px rgba(212,175,55,0.35)',
        'glow-chain': '0 0 0 1px rgba(110,91,255,0.30), 0 0 28px -6px rgba(110,91,255,0.45)',
        'glow-mint': '0 0 0 1px rgba(0,229,199,0.28), 0 0 26px -8px rgba(0,229,199,0.40)',
        panel: '0 24px 60px -30px rgba(0,0,0,0.9)',
      },
      keyframes: {
        'grid-drift': {
          '0%': { transform: 'translate3d(0,0,0)' },
          '100%': { transform: 'translate3d(0,-64px,0)' },
        },
        'node-pulse': {
          '0%, 100%': { opacity: '0.15', r: '1.5' },
          '50%': { opacity: '0.7', r: '2.6' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
        'ticker-flick': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'grid-drift': 'grid-drift 18s linear infinite',
        'node-pulse': 'node-pulse 4s ease-in-out infinite',
        scan: 'scan 7s linear infinite',
        'ticker-flick': 'ticker-flick 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
