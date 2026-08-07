import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this project from /Kelly-Criterion/.
// Vercel (and `npm run dev`) serve it from the root, so the base is env-gated:
// the Pages workflow sets DEPLOY_TARGET=gh-pages before building.
const base = process.env.DEPLOY_TARGET === 'gh-pages' ? '/Kelly-Criterion/' : '/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
