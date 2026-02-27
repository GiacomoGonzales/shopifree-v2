import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Rename the whitelabel HTML to index.html so Capacitor can find it
function renameWhiteLabelHtml(): Plugin {
  return {
    name: 'rename-whitelabel-html',
    enforce: 'post',
    generateBundle(_, bundle) {
      const key = 'index-whitelabel.html'
      if (bundle[key]) {
        bundle[key].fileName = 'index.html'
        bundle['index.html'] = bundle[key]
        delete bundle[key]
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isWhiteLabel = mode === 'whitelabel'

  return {
    plugins: [
      react(),
      ...(isWhiteLabel ? [renameWhiteLabelHtml()] : []),
    ],
    server: {
      headers: {
        // Required for Google Auth popup to work properly
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
    },
    ...(isWhiteLabel && {
      build: {
        rollupOptions: {
          input: resolve(__dirname, 'index-whitelabel.html'),
        },
      },
    }),
  }
})
