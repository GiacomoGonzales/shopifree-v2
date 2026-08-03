import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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

// ── Recuperación ante un deploy con la pestaña abierta ──────────────────
// Cada build genera nombres de archivo con hash. Al publicar una versión
// nueva, los chunks de la anterior dejan de existir: una pestaña que lleva
// rato abierta y navega a una sección con carga diferida pide un archivo que
// ya no está y se queda en blanco. En Vercel es peor de diagnosticar porque el
// rewrite del SPA devuelve index.html con código 200 en vez de un 404, y el
// navegador se queja del MIME en lugar de decir "no existe".
//
// Vite avisa de esto con `vite:preloadError`. Recargamos una vez para tomar el
// HTML nuevo; el usuario ve un parpadeo en lugar de una pantalla rota.
//
// El guard de tiempo es importante: si el chunk falta por un deploy realmente
// roto, recargar no lo arregla y sin freno quedaría en bucle infinito.
const RELOAD_GUARD_KEY = 'shopifree:chunk-reload-at'
const RELOAD_GUARD_MS = 60_000

function reloadOnceForStaleChunks(reason: string) {
  let last = 0
  try {
    last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0)
  } catch {
    // sessionStorage puede fallar en modo privado; sin guard no recargamos,
    // que es preferible a arriesgar el bucle.
    return
  }
  if (Date.now() - last < RELOAD_GUARD_MS) {
    console.warn(`[chunks] ${reason}: ya se recargó hace poco, no se insiste`)
    return
  }
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
  } catch {
    return
  }
  console.warn(`[chunks] ${reason}: recargando para tomar la versión nueva`)
  window.location.reload()
}

window.addEventListener('vite:preloadError', (event) => {
  // Evita que Vite propague el error sin manejar antes de que recarguemos.
  event.preventDefault()
  reloadOnceForStaleChunks('preload falló')
})

// Red de seguridad: si el import dinámico falla fuera del helper de preload,
// llega como promesa rechazada y no dispara el evento de arriba.
window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event.reason?.message || event.reason || '')
  if (/Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) {
    event.preventDefault()
    reloadOnceForStaleChunks('import dinámico falló')
  }
})

// Acquisition funnel: record first-touch ad attribution (utm/fbclid/gclid)
// BEFORE the router mounts and can rewrite the URL, then boot the platform
// Meta Pixel (main domains + web only — no-ops on storefronts and native).
captureAttribution()
initPlatformTracking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <App />
  </StrictMode>,
)
