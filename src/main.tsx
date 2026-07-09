import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { Capacitor } from '@capacitor/core'
import './i18n'
import './index.css'
import App from './App.tsx'
import { captureAttribution } from './lib/attribution'
import { initPlatformTracking } from './lib/platformTracking'

// Prevent iOS WebView bounce on native.
// StatusBar is configured natively via capacitor.config.ts (style DARK,
// bg #1e3a5f matching splash). Per-page effects override as needed.
if (Capacitor.isNativePlatform()) {
  document.body.classList.add('native-app')
}

// Acquisition funnel: record first-touch ad attribution (utm/fbclid/gclid)
// BEFORE the router mounts and can rewrite the URL, then boot the platform
// Meta Pixel (main domains + web only — no-ops on storefronts and native).
captureAttribution()
initPlatformTracking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
