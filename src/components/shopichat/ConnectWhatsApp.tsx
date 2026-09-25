/**
 * "Conectar mi WhatsApp" — Embedded Signup v4 de Meta.
 * ====================================================
 * Flujo (docs de Meta, Embedded Signup → Implementation):
 *  1. Se carga el SDK de Facebook (connect.facebook.net/en_US/sdk.js) y se
 *     llama FB.init con VITE_META_APP_ID y una versión de Graph actual.
 *  2. FB.login con `config_id` (VITE_META_ES_CONFIG_ID), `response_type:
 *     'code'` y `override_default_response_type: true` abre el popup de Meta.
 *     El callback devuelve un `code` de un solo uso (vive ~30 s) que el
 *     backend canjea por el token del negocio.
 *  3. Mientras tanto el popup manda `postMessage` desde facebook.com con
 *     `{ type: 'WA_EMBEDDED_SIGNUP', event, data: { waba_id, phone_number_id } }`.
 *     `event` es FINISH (número nuevo), FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING
 *     (coexistencia: el número de la app WhatsApp Business del celular, que
 *     puede no traer phone_number_id), CANCEL o ERROR.
 *  4. Con el code y el waba_id se llama a la acción 'connect' de /api/whatsapp.
 *
 * Coexistencia: con `featureType: 'whatsapp_business_app_onboarding'` Meta
 * ofrece usar el número que ya está en la app WhatsApp Business; el
 * comerciante sigue usando la app en su celular y los mensajes se ven en los
 * dos lados.
 *
 * Sin las variables de entorno se muestra "próximamente" en vez de romper. En
 * la app nativa el popup del SDK no funciona en el WebView: se pide conectar
 * desde la computadora.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { connectAccount } from '../../lib/shopichatService'
import type { WaAccount } from '../../types/shopichat'
import { IconAlert, IconCheck, IconPhoneDevice, IconWhatsApp } from './icons'

const APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined
const CONFIG_ID = import.meta.env.VITE_META_ES_CONFIG_ID as string | undefined
const GRAPH_VERSION = (import.meta.env.VITE_META_GRAPH_VERSION as string | undefined) || 'v25.0'
const SDK_URL = 'https://connect.facebook.net/en_US/sdk.js'

interface FBLoginResponse {
  authResponse?: { code?: string } | null
  status?: string
}

interface FBStatic {
  init: (opts: Record<string, unknown>) => void
  login: (cb: (r: FBLoginResponse) => void, opts: Record<string, unknown>) => void
}

declare global {
  interface Window {
    FB?: FBStatic
    fbAsyncInit?: () => void
  }
}

let sdkPromise: Promise<FBStatic> | null = null

/** Carga el SDK una sola vez por sesión y lo inicializa. */
function loadFacebookSdk(): Promise<FBStatic> {
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise<FBStatic>((resolve, reject) => {
    const init = () => {
      if (!window.FB) { reject(new Error('FB')); return }
      window.FB.init({ appId: APP_ID, autoLogAppEvents: true, xfbml: false, version: GRAPH_VERSION })
      resolve(window.FB)
    }
    if (window.FB) { init(); return }
    window.fbAsyncInit = init
    const s = document.createElement('script')
    s.src = SDK_URL
    s.async = true
    s.defer = true
    s.crossOrigin = 'anonymous'
    s.onerror = () => { sdkPromise = null; reject(new Error('sdk')) }
    document.body.appendChild(s)
  })
  return sdkPromise
}

interface SessionInfo {
  event: string
  wabaId?: string
  phoneNumberId?: string
}

type Phase = 'idle' | 'popup' | 'connecting' | 'done' | 'error'

export default function ConnectWhatsApp({ storeId, account }: { storeId: string; account: WaAccount | null }) {
  const { t } = useTranslation('dashboard')
  const isNative = Capacitor.isNativePlatform()
  const configured = Boolean(APP_ID && CONFIG_ID)
  const [sdkReady, setSdkReady] = useState(false)
  const [sdkFailed, setSdkFailed] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)

  const code = useRef<string | null>(null)
  const session = useRef<SessionInfo | null>(null)
  const finishing = useRef(false)

  // Se precarga al montar: FB.login tiene que llamarse DENTRO del clic, o el
  // navegador bloquea el popup.
  useEffect(() => {
    if (!configured || isNative) return
    let alive = true
    loadFacebookSdk()
      .then(() => { if (alive) setSdkReady(true) })
      .catch(() => { if (alive) setSdkFailed(true) })
    return () => { alive = false }
  }, [configured, isNative])

  /** Cuando ya están el code y los ids, se llama al backend. */
  const tryFinish = useCallback(async () => {
    const info = session.current
    if (!code.current || !info?.wabaId || finishing.current) return
    finishing.current = true
    setPhase('connecting')
    try {
      await connectAccount(storeId, {
        code: code.current,
        wabaId: info.wabaId,
        phoneNumberId: info.phoneNumberId,
        coexistence: info.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' || undefined,
      })
      // La pantalla cambia sola cuando el backend escribe waSettings/account.
      setPhase('done')
    } catch (e) {
      const err = e as { code?: string; message?: string }
      setError(err.code === 'PLAN_REQUIRED' ? t('shopichat.errors.planRequired') : err.message || t('shopichat.connect.failed'))
      setPhase('error')
    } finally {
      finishing.current = false
      code.current = null
    }
  }, [storeId, t])

  // Los eventos del popup de Meta. Solo se aceptan de facebook.com.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      let host = ''
      try {
        const u = new URL(event.origin)
        if (u.protocol !== 'https:') return
        host = u.hostname
      } catch { return }
      if (host !== 'facebook.com' && !host.endsWith('.facebook.com')) return
      let data: { type?: string; event?: string; data?: Record<string, string> }
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      } catch {
        return
      }
      if (data?.type !== 'WA_EMBEDDED_SIGNUP') return
      const ev = String(data.event || '')
      if (ev === 'FINISH' || ev === 'FINISH_ONLY_WABA' || ev === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
        session.current = { event: ev, wabaId: data.data?.waba_id, phoneNumberId: data.data?.phone_number_id }
        void tryFinish()
      } else if (ev === 'CANCEL') {
        setPhase('idle')
      } else if (ev === 'ERROR') {
        setError(data.data?.error_message || t('shopichat.connect.failed'))
        setPhase('error')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [tryFinish, t])

  const launch = (coexistence: boolean) => {
    const FB = window.FB
    if (!FB) return
    code.current = null
    session.current = null
    setError(null)
    setPhase('popup')
    const extras: Record<string, unknown> = { setup: {}, sessionInfoVersion: '3' }
    if (coexistence) extras.featureType = 'whatsapp_business_app_onboarding'
    // El callback NO puede ser async: el SDK lo rechaza.
    FB.login(response => {
      const c = response?.authResponse?.code
      if (!c) {
        // Cerró el popup sin terminar.
        if (!finishing.current) setPhase(p => (p === 'popup' ? 'idle' : p))
        return
      }
      code.current = c
      void tryFinish()
    }, {
      config_id: CONFIG_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras,
    })
  }

  const benefits = [
    t('shopichat.connect.benefit1'),
    t('shopichat.connect.benefit2'),
    t('shopichat.connect.benefit3'),
    t('shopichat.connect.benefit4'),
  ]

  return (
    <div className="max-w-2xl mx-auto py-2 sm:py-6">
      <div className="bg-white rounded-[14px] border border-[#E6EBF1] overflow-hidden" style={{ boxShadow: '0 10px 28px -22px rgba(30,58,95,.4)' }}>
        <div className="px-5 sm:px-8 pt-7 pb-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#25D366] text-white grid place-items-center">
            <IconWhatsApp className="w-8 h-8" />
          </div>
          <h1 className="mt-4 text-lg sm:text-xl font-semibold tracking-tight text-[#1e3a5f]">{t('shopichat.connect.title')}</h1>
          <p className="mt-1.5 text-[0.85rem] text-[#8898AA] max-w-md mx-auto">{t('shopichat.connect.subtitle')}</p>
        </div>

        <ul className="px-5 sm:px-8 space-y-2.5">
          {benefits.map(b => (
            <li key={b} className="flex items-start gap-2.5 text-[0.85rem] text-[#425466]">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-[#F0F9FF] text-[#0284C7] grid place-items-center flex-none">
                <IconCheck className="w-3 h-3" />
              </span>
              {b}
            </li>
          ))}
        </ul>

        <div className="mx-5 sm:mx-8 mt-5 rounded-xl bg-[#F6F9FC] border border-[#E6EBF1] px-4 py-3 flex items-start gap-3">
          <IconPhoneDevice className="w-5 h-5 text-[#1e3a5f] flex-none mt-0.5" />
          <div>
            <p className="text-[0.82rem] font-semibold text-[#1e3a5f]">{t('shopichat.connect.coexistTitle')}</p>
            <p className="text-[0.78rem] text-[#8898AA] mt-0.5">{t('shopichat.connect.coexistBody')}</p>
          </div>
        </div>

        {account?.status === 'error' && account.lastError && (
          <div className="mx-5 sm:mx-8 mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-2.5">
            <IconAlert className="w-4 h-4 text-red-500 flex-none mt-0.5" />
            <p className="text-[0.8rem] text-red-700">{t('shopichat.connect.lastError', { error: account.lastError })}</p>
          </div>
        )}

        <div className="px-5 sm:px-8 py-6">
          {!configured ? (
            <div className="rounded-xl bg-[#FEF3C7] border border-[#FDE68A] px-4 py-3 text-center">
              <p className="text-[0.85rem] font-semibold text-[#B45309]">{t('shopichat.connect.comingSoonTitle')}</p>
              <p className="text-[0.78rem] text-[#B45309]/80 mt-0.5">{t('shopichat.connect.comingSoonBody')}</p>
            </div>
          ) : isNative ? (
            <div className="rounded-xl bg-[#F0F9FF] border border-[#38bdf8]/30 px-4 py-3 text-center">
              <p className="text-[0.85rem] font-semibold text-[#1e3a5f]">{t('shopichat.connect.desktopTitle')}</p>
              <p className="text-[0.78rem] text-[#8898AA] mt-0.5">{t('shopichat.connect.desktopBody')}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => launch(true)}
                disabled={!sdkReady || phase === 'popup' || phase === 'connecting'}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1e3a5f] text-white text-[0.9rem] font-semibold hover:bg-[#2a4d7a] disabled:opacity-60 transition-colors"
              >
                <IconWhatsApp className="w-5 h-5" />
                {phase === 'connecting' ? t('shopichat.connect.connecting') : t('shopichat.connect.cta')}
              </button>
              <button
                type="button"
                onClick={() => launch(false)}
                disabled={!sdkReady || phase === 'popup' || phase === 'connecting'}
                className="w-full px-5 py-2.5 rounded-xl border border-[#E6EBF1] text-[#425466] text-[0.82rem] font-medium hover:bg-[#F6F9FC] disabled:opacity-60"
              >
                {t('shopichat.connect.ctaNewNumber')}
              </button>
              {!sdkReady && !sdkFailed && <p className="text-center text-[0.75rem] text-[#A9B6C6]">{t('shopichat.connect.loadingSdk')}</p>}
              {sdkFailed && <p className="text-center text-[0.78rem] text-red-600">{t('shopichat.connect.sdkError')}</p>}
              {phase === 'popup' && <p className="text-center text-[0.78rem] text-[#8898AA]">{t('shopichat.connect.followPopup')}</p>}
              {phase === 'done' && <p className="text-center text-[0.78rem] text-[#0284C7]">{t('shopichat.connect.almost')}</p>}
              {error && <p className="text-center text-[0.78rem] text-red-600">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
