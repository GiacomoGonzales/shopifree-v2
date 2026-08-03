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

/**
 * Núcleo compartido: pide permiso, registra en FCM/APNs y entrega el token.
 * Devuelve una función de limpieza, o undefined si no corresponde registrar.
 */
async function setupPush(
  onToken: (token: string, platform: 'ios' | 'android') => Promise<void>,
  onTap?: TapHandler
): Promise<(() => void) | undefined> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const permResult = await PushNotifications.requestPermissions()
    if (permResult.receive !== 'granted') return undefined

    await PushNotifications.register()

    const regListener = await PushNotifications.addListener('registration', async (token) => {
      try {
        await onToken(token.value, Capacitor.getPlatform() as 'ios' | 'android')
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
 * Las builds white-label corren con un applicationId por tienda que todavía no
 * está en google-services.json, así que el plugin de FCM se omite al compilar.
 * Llamar a register() en esa condición lanza "Default FirebaseApp is not
 * initialized" de forma nativa y mata el proceso antes de que Capacitor pueda
 * mostrar el error. Se salta hasta que cada paquete tenga su propia config.
 */
function pushUnavailable(): boolean {
  return !Capacitor.isNativePlatform() || import.meta.env.VITE_WHITELABEL === 'true'
}

/** Dispositivo de un cliente del catálogo. */
export function usePushNotifications(storeId?: string) {
  const registered = useRef(false)

  useEffect(() => {
    if (pushUnavailable() || !storeId || registered.current) return

    let cleanup: (() => void) | undefined
    setupPush(async (token, platform) => {
      if (registered.current) return
      registered.current = true
      await fetch(apiUrl('/api/push'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register-token', storeId, token, platform }),
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
      async (token, platform) => {
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
          body: JSON.stringify({ action: 'register-owner-token', token, platform }),
        })
      },
      (data) => tapRef.current?.(data)
    ).then(fn => { cleanup = fn })

    return () => { cleanup?.() }
  }, [ownerId])
}
