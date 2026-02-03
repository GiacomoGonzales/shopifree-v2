import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { Capacitor } from '@capacitor/core'

const MIN_SPLASH_MS = 1800

export default function MobileWelcome() {
  const navigate = useNavigate()
  const { localePath } = useLanguage()
  const { firebaseUser, store, loading } = useAuth()
  const [showContent, setShowContent] = useState(false)
  const mountTime = useRef(Date.now())
  const handled = useRef(false)

  useEffect(() => {
    if (loading || handled.current) return
    handled.current = true

    const setup = async () => {
      // Wait minimum splash time
      const elapsed = Date.now() - mountTime.current
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed)
      if (remaining > 0) {
        await new Promise(r => setTimeout(r, remaining))
      }

      const isNative = Capacitor.isNativePlatform()

      if (firebaseUser) {
        // Authenticated: hide splash over stable white div, then navigate
        if (isNative) {
          const { SplashScreen } = await import('@capacitor/splash-screen')
          SplashScreen.hide({ fadeOutDuration: 300 })

          // Wait for splash fade to complete over our stable white background
          await new Promise(r => setTimeout(r, 350))

          // Configure StatusBar after splash is fully gone
          const { StatusBar, Style } = await import('@capacitor/status-bar')
          StatusBar.setStyle({ style: Style.Light })
          StatusBar.setOverlaysWebView({ overlay: true })
        }

        // Now navigate — splash is gone, user sees white then dashboard
        if (store) {
          navigate(localePath('/dashboard'), { replace: true })
        } else {
          navigate(localePath('/register'), { replace: true })
        }
      } else {
        // Not authenticated: reveal welcome, then hide splash
        setShowContent(true)

        // Small delay so React renders the welcome screen before splash hides
        await new Promise(r => setTimeout(r, 50))

        if (isNative) {
          const { SplashScreen } = await import('@capacitor/splash-screen')
          SplashScreen.hide({ fadeOutDuration: 300 })

          // Configure StatusBar after splash starts fading
          const { StatusBar, Style } = await import('@capacitor/status-bar')
          StatusBar.setStyle({ style: Style.Dark })
          StatusBar.setOverlaysWebView({ overlay: true })
        }
      }
    }

    setup()
  }, [loading, firebaseUser, store, navigate, localePath])

  // While loading or waiting, render nothing (Capacitor splash covers everything)
  if (!showContent) {
    return <div className="fixed inset-0 bg-white" />
  }

  // Welcome screen for unauthenticated users
  return (
    <div className="fixed inset-0 bg-[#0a1628] flex flex-col">
      {/* Background collage */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-3 gap-1 opacity-40">
          <div className="flex flex-col gap-1">
            <div className="flex-1 overflow-hidden">
              <img src="/demos/alienstore.jpg" alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 overflow-hidden">
              <img src="/demos/braseria.jpg" alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 overflow-hidden">
              <img src="/demos/tecnomax.jpg" alt="" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-8">
            <div className="flex-1 overflow-hidden">
              <img src="/demos/braseria.jpg" alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 overflow-hidden">
              <img src="/demos/tecnomax.jpg" alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 overflow-hidden">
              <img src="/demos/alienstore.jpg" alt="" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex flex-col gap-1 -mt-4">
            <div className="flex-1 overflow-hidden">
              <img src="/demos/tecnomax.jpg" alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 overflow-hidden">
              <img src="/demos/alienstore.jpg" alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 overflow-hidden">
              <img src="/demos/braseria.jpg" alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0a1628]/60 to-[#0a1628]" />
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col justify-between px-6 pb-10" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="flex-shrink-0 pt-4">
          <div className="flex items-center justify-center gap-2.5">
            <img
              src="/newlogo.png"
              alt="Shopifree"
              className="h-8 brightness-0 invert"
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center -mt-8">
          <h1 className="text-[2rem] leading-tight font-extrabold text-white text-center tracking-tight">
            Crea tu tienda{'\n'}
            <span className="text-[#38bdf8]">online gratis</span>
          </h1>
          <p className="text-slate-400 text-[15px] text-center mt-3 max-w-[280px] leading-relaxed">
            Catalogo digital + ventas por WhatsApp.
            Sin comisiones. En minutos.
          </p>
        </div>

        <div className="flex-shrink-0 space-y-3" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <button
            onClick={() => navigate(localePath('/register'))}
            className="w-full py-[14px] bg-[#38bdf8] text-[#0a1628] font-bold text-[15px] rounded-2xl active:scale-[0.98] transition-transform"
          >
            Empezar gratis
          </button>

          <button
            onClick={() => navigate(localePath('/login'))}
            className="w-full py-[14px] bg-white/10 text-white font-semibold text-[15px] rounded-2xl border border-white/15 active:bg-white/15 transition-colors backdrop-blur-sm"
          >
            Ya tengo cuenta
          </button>

          <p className="text-center text-[11px] text-slate-500 pt-1">
            Sin tarjeta de credito. Gratis para siempre.
          </p>
        </div>
      </div>
    </div>
  )
}
