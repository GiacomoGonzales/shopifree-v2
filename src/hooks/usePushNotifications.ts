import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { apiUrl } from '../utils/apiBase'
import { auth } from '../lib/firebase'

/**
 * Notificaciones push. Hay DOS flujos distintos y no hay que mezclarlos:
 *
 *  - usePushNotifications(storeId)  → dispositivo de un CLIENTE navegando el
 *    catálogo. El token va a `stores/{storeId}/pushTokens` y sirve para que el
 *    dueño mande difusiones desde Mi App.
 *
 *  - useOwnerPushNotifications()    → dispositivo del DUEÑO en el panel. El
 *    token va a `users/{uid}/pushTokens` y sirve para avisarle de pedidos
 *    nuevos. Va aparte a propósito: si compartiera colección con el anterior,
 *    un "tenés un pedido nuevo" le llegaría a toda la clientela.
 */

type TapHandler = (data: Record<string, unknown>) => void

interface PushToken {
  token: string
  platform: 'ios' | 'android'
  /**
   * Bundle id / applicationId de la app que registró el token. En iOS el
   * servidor lo necesita como `apns-topic`: el token es de APNs (no de FCM) y
   * cada tienda tiene su propia app.
   */
  appId?: string
}

/**
 * Núcleo compartido: pide permiso, registra en FCM (Android) / APNs (iOS) y
 * entrega el token. Devuelve una función de limpieza, o undefined si no
 * corresponde registrar.
 */
async function setupPush(
  onToken: (token: PushToken) => Promise<void>,
  onTap?: TapHandler
): Promise<(() => void) | undefined> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const permResult = await PushNotifications.requestPermissions()
    if (permResult.receive !== 'granted') return undefined

    let appId: string | undefined
    try {
      const { App } = await import('@capacitor/app')
      appId = (await App.getInfo()).id
    } catch (err) {
      console.error('[push] App.getInfo failed:', err)
    }

    const regListener = await PushNotifications.addListener('registration', async (token) => {
      try {
        await onToken({
          token: token.value,
          platform: Capacitor.getPlatform() as 'ios' | 'android',
          appId,
        })
      } catch (err) {
        console.error('[push] Failed to register token:', err)
      }
    })

    const errorListener = await PushNotifications.addListener('registrationError', (err) => {
      console.error('[push] Registration error:', err)
    })

    const foregroundListener = await PushNotifications.addListener(
      'pushNotificationReceived',
      () => {
        // Recibida en primer plano — el sistema no la muestra sola.
      }
    )

    const tapListener = await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        onTap?.((action.notification.data || {}) as Record<string, unknown>)
      }
    )

    // Después de los listeners, para no perder el evento `registration`.
    await PushNotifications.register()

    return () => {
      regListener.remove()
      errorListener.remove()
      foregroundListener.remove()
      tapListener.remove()
    }
  } catch (err) {
    console.error('[push] Setup error:', err)
    return undefined
  }
}

/**
 * Android de marca blanca: cada tienda compila con su propio applicationId, y
 * FCM solo arranca si ese paquete está en google-services.json. Lo registra
 * mobile/ci/firebase-android-config.ts antes de compilar y deja la marca
 * VITE_ANDROID_FCM; si esa build no la tiene, el plugin de Firebase se omitió
 * y register() lanza "Default FirebaseApp is not initialized" de forma nativa,
 * matando el proceso antes de que Capacitor pueda mostrar el error.
 *
 * iOS no tiene ese problema: no usa Firebase, el token va directo a APNs.
 */
function pushUnavailable(): boolean {
  if (!Capacitor.isNativePlatform()) return true
  return import.meta.env.VITE_WHITELABEL === 'true'
    && Capacitor.getPlatform() === 'android'
    && import.meta.env.VITE_ANDROID_FCM !== 'true'
}

/** Dispositivo de un cliente del catálogo. */
export function usePushNotifications(storeId?: string) {
  const registered = useRef(false)

  useEffect(() => {
    if (pushUnavailable() || !storeId || registered.current) return

    let cleanup: (() => void) | undefined
    setupPush(async ({ token, platform, appId }) => {
      if (registered.current) return
      registered.current = true
      await fetch(apiUrl('/api/push'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register-token', storeId, token, platform, appId }),
      })
    }).then(fn => { cleanup = fn })

    return () => { cleanup?.() }
  }, [storeId])
}

/**
 * Dispositivo del dueño, para recibir avisos de pedidos nuevos.
 *
 * `onTap` recibe el payload de datos de la notificación (la Cloud Function
 * manda `orderId` y `storeId`), para poder abrir el pedido directamente.
 */
export function useOwnerPushNotifications(ownerId?: string, onTap?: TapHandler) {
  const registered = useRef(false)
  // En una ref para que cambiar el handler no vuelva a disparar el registro.
  const tapRef = useRef(onTap)
  tapRef.current = onTap

  useEffect(() => {
    if (pushUnavailable() || !ownerId || registered.current) return

    let cleanup: (() => void) | undefined
    setupPush(
      async ({ token, platform, appId }) => {
        if (registered.current) return
        registered.current = true
        const idToken = await auth?.currentUser?.getIdToken()
        if (!idToken) {
          console.warn('[push] Sin sesión, no se registra el token del dueño')
          registered.current = false
          return
        }
        await fetch(apiUrl('/api/push'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ action: 'register-owner-token', token, platform, appId }),
        })
      },
      (data) => tapRef.current?.(data)
    ).then(fn => { cleanup = fn })

    return () => { cleanup?.() }
  }, [ownerId])
}
