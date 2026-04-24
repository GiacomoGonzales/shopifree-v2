import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import LanguageSelector from '../../components/common/LanguageSelector'

export default function Login() {
  const { t } = useTranslation('auth')
  const { localePath } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, loginWithGoogle, loginWithApple, firebaseUser, store, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const isNative = Capacitor.isNativePlatform()
  const isIOS = Capacitor.getPlatform() === 'ios'

  // Redirect authenticated users. Native users without a store go to /register
  // so they can finish signing up in-app (Register handles "authenticated but
  // no store" by advancing to step 2). Previously native users landed here
  // with no way forward, which Apple reviewers hit as a stuck spinner — 2.1(a).
  useEffect(() => {
    if (!authLoading && firebaseUser) {
      if (store) {
        navigate(localePath('/dashboard'))
      } else {
        navigate(localePath('/register'))
      }
    }
  }, [authLoading, firebaseUser, store, navigate, localePath])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
    } catch (err: unknown) {
      console.error('Login error:', err)
      setError((err as Error).message || t('login.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle()
    } catch (err: unknown) {
      setError((err as Error).message || t('login.googleError'))
    } finally {
      setLoading(false)
    }
  }

  const handleAppleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await loginWithApple()
    } catch (err: unknown) {
      // Apple's cancel error code — silently dismiss, not a real error.
      const msg = (err as Error).message || ''
      if (!(msg.includes('1001') || msg.toLowerCase().includes('cancel'))) {
        setError(msg || t('login.appleError', { defaultValue: 'Error al iniciar sesión con Apple' }))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-white flex flex-col overflow-y-auto animate-[fadeIn_300ms_ease-out]">
      {/* Top safe area — white */}
      <div style={{ height: 'env(safe-area-inset-top)' }} />

      {/* Header: language selector only (no back button — welcome is underneath via iOS back gesture) */}
      <div className="flex justify-end px-5 pt-3">
        <LanguageSelector />
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#1e3a5f]/20 border-t-[#1e3a5f] rounded-full animate-spin" />
            <p className="text-sm text-[#1e3a5f] font-medium">{t('login.submitting')}</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col px-6">
        {/* Logo — same position as MobileWelcome so transition is seamless */}
        <div className="flex flex-col items-center pt-8">
          <img
            src="/icon-512.png"
            alt="Shopifree"
            className="w-20 h-20 rounded-[22%] shadow-sm"
          />
          <h2 className="mt-6 text-[22px] font-semibold text-[#1e3a5f] tracking-tight">
            {t('login.title')}
          </h2>
        </div>

        {/* Form */}
        <div className="w-full max-w-md mx-auto mt-8 pb-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl text-[16px] focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl text-[16px] focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#1e3a5f] hover:bg-[#2d6cb5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#38bdf8] disabled:opacity-50 transition-all"
            >
              {loading ? t('login.submitting') : t('login.submit')}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{t('login.orContinueWith')}</span>
              </div>
            </div>

            {/* Sign in with Apple — iOS only. Per HIG, Apple button goes on top. */}
            {isIOS && (
              <button
                onClick={handleAppleLogin}
                disabled={loading}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium text-white bg-black hover:bg-gray-900 disabled:opacity-50 transition-all"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                {t('login.apple', { defaultValue: 'Continuar con Apple' })}
              </button>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className={`${isIOS ? 'mt-2' : 'mt-4'} w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('login.google')}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            {t('login.noAccount')}{' '}
            <Link to={localePath('/register')} className="font-semibold text-[#2d6cb5] hover:text-[#38bdf8] transition-colors">
              {t('login.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
