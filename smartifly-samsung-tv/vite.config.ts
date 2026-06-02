import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // Target ES2017 for compatibility with older Tizen WebKit engines
    // (Samsung TVs from 2017–2020 era). Avoids ES2022+ syntax like
    // optional chaining assignment, class static blocks, etc. that
    // those browsers don't support.
    target: 'es2017',
  },
})
