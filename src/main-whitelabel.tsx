import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import WhiteLabelApp from './WhiteLabelApp'

// Native platform setup
if (Capacitor.isNativePlatform()) {
  document.body.classList.add('native-app')

  // Configure StatusBar - dark text on light background
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Light })
    StatusBar.setBackgroundColor({ color: '#ffffff' })
    StatusBar.setOverlaysWebView({ overlay: true })
  }).catch(() => {})

  // Splash screen stays visible until Catalog hides it after store data loads.
  // Fallback: hide after 8s in case something goes wrong.
  import('@capacitor/splash-screen').then(({ SplashScreen }) => {
    setTimeout(() => SplashScreen.hide({ fadeOutDuration: 300 }), 8000)
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
