import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Zoomez PWA front-end. Single React SPA; served as static assets by the
// Node/TS monolith in production (see ../docs/architecture-and-components.md).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
})
