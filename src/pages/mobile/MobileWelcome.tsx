import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { Capacitor } from '@capacitor/core'

export default function MobileWelcome() {
  const navigate = useNavigate()
  const { localePath } = useLanguage()
  const { firebaseUser, store, loading } = useAuth()
  const splashHidden = useRef(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [transitionDone, setTransitionDone] = useState(false)

  // Once auth is resolved, set the correct status bar, hide native splash, then fade out web logo
  useEffect(() => {
    if (loading) return
    if (splashHidden.current) return

    const isNative = Capacitor.isNativePlatform()
    if (!isNative) return

    const setup = async () => {
      const { StatusBar, Style } = await import('@capacitor/status-bar')
      const { SplashScreen } = await import('@capacitor/splash-screen')

      if (firebaseUser) {
        // Going to dashboard - dark text status bar
        StatusBar.setStyle({ style: Style.Light })
        StatusBar.setOverlaysWebView({ overlay: false })
        StatusBar.setBackgroundColor({ color: '#ffffff' })
      } else {
        // Staying on welcome - light text status bar
        StatusBar.setStyle({ style: Style.Dark })
        StatusBar.setOverlaysWebView({ overlay: false })
        StatusBar.setBackgroundColor({ color: '#0a1628' })
      }

      await new Promise(r => setTimeout(r, 100))
      splashHidden.current = true
      // Hide native splash - web transition screen is identical underneath
      SplashScreen.hide({ fadeOutDuration: 0 })

      if (firebaseUser) {
        // Start fade-out of the web logo screen
        await new Promise(r => setTimeout(r, 200))
        setFadeOut(true)
        // Wait for fade animation to finish, then navigate
        await new Promise(r => setTimeout(r, 400))
        setTransitionDone(true)
      }
    }

    setup()
  }, [loading, firebaseUser])

  // Redirect authenticated users after transition completes
  useEffect(() => {
    if (!transitionDone) return
    if (store) {
      navigate(localePath('/dashboard'), { replace: true })
    } else {
      navigate(localePath('/register'), { replace: true })
    }
  }, [transitionDone, store, navigate, localePath])

  // Show transition screen: white bg with centered logo (matches splash exactly)
  if (loading || (firebaseUser && !transitionDone)) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <img
          src="/apple-touch-icon.png"
          alt=""
          className={`w-16 h-16 transition-opacity duration-400 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#0a1628] flex flex-col">
      {/* Background collage */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Image grid - 3 columns, fills screen */}
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
        {/* Gradient overlay - dark at top and bottom, lighter in middle */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0a1628]/60 to-[#0a1628]" />
      </div>

      {/* Content - centered vertically */}
      <div className="relative flex-1 flex flex-col justify-between px-6 py-10">
        {/* Top section - Logo */}
        <div className="flex-shrink-0 pt-4">
          <div className="flex items-center justify-center gap-2.5">
            <img
              src="/newlogo.png"
              alt="Shopifree"
              className="h-8 brightness-0 invert"
            />
          </div>
        </div>

        {/* Middle section - Hero text */}
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

        {/* Bottom section - CTAs */}
        <div className="flex-shrink-0 space-y-3 pb-2">
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
