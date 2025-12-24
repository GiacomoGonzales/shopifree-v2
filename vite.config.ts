import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Required for Google Auth popup to work properly
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
