import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { Capacitor } from '@capacitor/core'
import LanguageSelector from '../../components/common/LanguageSelector'

const MIN_SPLASH_MS = 1200

export default function MobileWelcome() {
  const navigate = useNavigate()
  const { t } = useTranslation('landing')
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
        // Authenticated: hide splash, navigate (everything is white — seamless)
        if (isNative) {
          const { SplashScreen } = await import('@capacitor/splash-screen')
          SplashScreen.hide({ fadeOutDuration: 300 })
        }

        if (store) {
          navigate(localePath('/dashboard'), { replace: true })
        } else {
          // Autenticado pero sin tienda: va a /register, que detecta el caso y
          // salta directo al paso 2 (crear la tienda). Antes en nativo se
          // mandaba a /login, que rebotaba de vuelta a /register igual.
          navigate(localePath('/register'), { replace: true })
        }
      } else {
        // Not authenticated: reveal welcome first, then fade splash
        setShowContent(true)

        // Let React render welcome so the splash fade cross-dissolves over it
        await new Promise(r => setTimeout(r, 50))

        if (isNative) {
          const { SplashScreen } = await import('@capacitor/splash-screen')
          SplashScreen.hide({ fadeOutDuration: 400 })
        }
      }
    }

    setup()
  }, [loading, firebaseUser, store, navigate, localePath])

  // While loading or waiting, render white — matches splash background exactly
  if (!showContent) {
    return <div className="fixed inset-0 bg-white" />
  }

  // Welcome screen — logo positioned identically to Login, so navigating between
  // them is just a cross-fade with no element movement.
  return (
    <div className="fixed inset-0 bg-white flex flex-col animate-[fadeIn_400ms_ease-out]">
      {/* Top safe area — white, so the status bar reads naturally */}
      <div style={{ height: 'env(safe-area-inset-top)' }} />

      {/* Language selector (top-right) */}
      <div className="flex justify-end px-5 pt-3">
        <LanguageSelector />
      </div>

      {/* Centered content: logo + tagline */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <img
          src="/icon-512.png"
          alt="Shopifree"
          className="w-20 h-20 rounded-[22%] shadow-sm"
        />
        <h1 className="mt-8 text-[26px] leading-tight font-semibold text-[#1e3a5f] text-center tracking-tight">
          {t('mobile.title', { defaultValue: 'Tu tienda, en tu bolsillo' })}
        </h1>
        <p className="text-slate-500 text-[15px] text-center mt-3 max-w-[260px] leading-relaxed">
          {t('mobile.subtitle', { defaultValue: 'Gestioná productos, pedidos y clientes desde donde estés.' })}
        </p>
      </div>

      {/* Bottom CTA + register link */}
      <div
        className="flex-shrink-0 px-6 space-y-3"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Acción principal: crear cuenta. El registro funciona entero dentro
            de la app (Register.tsx tiene los dos pasos), así que no hay motivo
            para mandar a la web como se hacía antes. */}
        <button
          onClick={() => navigate(localePath('/register'))}
          className="w-full py-[14px] bg-[#1e3a5f] text-white font-semibold text-[15px] rounded-2xl active:scale-[0.98] transition-transform shadow-sm"
        >
          {t('mobile.startFree', { defaultValue: 'Empezar gratis' })}
        </button>

        {/* Secundaria: los que ya tienen cuenta */}
        <button
          onClick={() => navigate(localePath('/login'))}
          className="w-full py-[14px] bg-white text-[#1e3a5f] font-semibold text-[15px] rounded-2xl border border-slate-200 active:scale-[0.98] transition-transform"
        >
          {t('mobile.haveAccount', { defaultValue: 'Ya tengo cuenta' })}
        </button>

        <p className="text-center text-[13px] text-slate-500 leading-snug">
          {t('mobile.noCreditCard', { defaultValue: 'Sin tarjeta de crédito. Gratis para siempre.' })}
        </p>
      </div>
    </div>
  )
}
