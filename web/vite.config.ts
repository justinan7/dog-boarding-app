import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Zoomez PWA front-end. Single React SPA; served as static assets by the
// Node/TS monolith in production (see ../docs/architecture-and-components.md).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Same-origin API in dev: the PWA calls /api/*, Vite proxies to the API on
    // :3000. Cookies + auth "just work" (no cross-origin/CORS). In prod the
    // monolith serves the PWA, so /api/* is same-origin there too.
    proxy: { '/api': 'http://localhost:3000' },
  },
  preview: { port: 4173, host: true },
})
