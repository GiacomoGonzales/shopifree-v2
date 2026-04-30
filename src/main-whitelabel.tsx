import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import WhiteLabelApp from './WhiteLabelApp'

// Splash color is baked into LaunchScreen.storyboard / Android splash drawables
// at build time. We mirror it here so the webview renders the same color from
// the very first paint — that way the native splash fade reveals an identical
// background instead of flashing white/black through to the catalog.
const SPLASH_COLOR = (import.meta.env.VITE_SPLASH_COLOR as string) || '#ffffff'

// Pre-paint: set html/body bg before React mounts so there is no gap between
// the splash hide and the first React frame.
document.documentElement.style.backgroundColor = SPLASH_COLOR
document.body.style.backgroundColor = SPLASH_COLOR
document.documentElement.style.setProperty('--splash-color', SPLASH_COLOR)

// Decide StatusBar text color from the splash background luminance.
function isDarkColor(hex: string): boolean {
  const h = hex.replace('#', '')
  if (h.length < 6) return false
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

// Native platform setup
if (Capacitor.isNativePlatform()) {
  document.body.classList.add('native-app')

  const splashIsDark = isDarkColor(SPLASH_COLOR)

  // StatusBar: light text on dark splash, dark text on light splash.
  // The Catalog re-syncs this once the theme header renders.
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: splashIsDark ? Style.Dark : Style.Light })
    StatusBar.setBackgroundColor({ color: SPLASH_COLOR })
    StatusBar.setOverlaysWebView({ overlay: false })
  }).catch(() => {})

  // Splash stays visible until Catalog hides it after store data loads.
  // Fallback: hide after 8s in case something goes wrong.
  import('@capacitor/splash-screen').then(({ SplashScreen }) => {
    setTimeout(() => SplashScreen.hide({ fadeOutDuration: 400 }), 8000)
  }).catch(() => {})

  // Handle keyboard show/hide
  import('@capacitor/keyboard').then(({ Keyboard }) => {
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-visible')
      // Scroll focused input into view within its scrollable container
      setTimeout(() => {
        const el = document.activeElement as HTMLElement | null
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 150)
    })
    Keyboard.addListener('keyboardDidHide', () => {
      document.body.classList.remove('keyboard-visible')
    })
  }).catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WhiteLabelApp />
  </StrictMode>,
)
