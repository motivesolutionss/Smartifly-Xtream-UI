import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // proxy: {
    //   "/v1": {
    //     target: "https://api.smartifly.co",
    //     changeOrigin: true,
    //     secure: true,
    //   },
    // },
  },
  build: {
    // Target ES2017 for compatibility with older Tizen WebKit engines
    // (Samsung TVs from 2017–2020 era). Avoids ES2022+ syntax like
    // optional chaining assignment, class static blocks, etc. that
    // those browsers don't support.
    target: 'es2017',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (
            id.includes("/react/") ||
            id.includes("\\react\\") ||
            id.includes("/react-dom/") ||
            id.includes("\\react-dom\\") ||
            id.includes("/scheduler/") ||
            id.includes("\\scheduler\\") ||
            id.includes("/@tanstack/react-query/") ||
            id.includes("\\@tanstack\\react-query\\") ||
            id.includes("/zustand/") ||
            id.includes("\\zustand\\")
          ) {
            return "vendor-core";
          }
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
})
