import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { Capacitor } from '@capacitor/core'
import './i18n'
import './index.css'
import App from './App.tsx'

// Prevent iOS WebView bounce on native
if (Capacitor.isNativePlatform()) {
  document.body.classList.add('native-app')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
