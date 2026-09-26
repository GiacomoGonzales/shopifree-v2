/**
 * Embedded Signup de Meta como hook: lo usan "Conectar mi WhatsApp"
 * (ConnectWhatsApp) y el banner "Reconectar WhatsApp" (ReconnectWhatsAppBanner)
 * cuando el token vence. El flujo completo está explicado en ConnectWhatsApp.
 *
 * Reconectar es el mismo flujo: el comerciante elige su misma cuenta y número,
 * y el backend ('connect') detecta que es el número que la tienda ya tenía y
 * solo reemplaza el token, sin tocar las conversaciones.
 *
 * Montar UNA sola instancia a la vez: escucha los postMessage del popup.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { connectAccount } from '../../lib/shopichatService'

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

export type EmbeddedSignupPhase = 'idle' | 'popup' | 'connecting' | 'done' | 'error'

export function useEmbeddedSignup(storeId: string) {
  const { t } = useTranslation('dashboard')
  const isNative = Capacitor.isNativePlatform()
  const configured = Boolean(APP_ID && CONFIG_ID)
  const [sdkReady, setSdkReady] = useState(false)
  const [sdkFailed, setSdkFailed] = useState(false)
  const [phase, setPhase] = useState<EmbeddedSignupPhase>('idle')
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

  return { configured, isNative, sdkReady, sdkFailed, phase, error, launch }
}
