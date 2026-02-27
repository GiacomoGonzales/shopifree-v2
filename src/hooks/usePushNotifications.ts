import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'

export function usePushNotifications(storeId?: string) {
  const registered = useRef(false)

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform() || !storeId || registered.current) return

    let cleanup: (() => void) | undefined

    async function setup() {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')

        // Request permission
        const permResult = await PushNotifications.requestPermissions()
        if (permResult.receive !== 'granted') return

        // Register with APNs/FCM
        await PushNotifications.register()

        // Listen for registration token
        const regListener = await PushNotifications.addListener('registration', async (token) => {
          if (registered.current) return
          registered.current = true

          try {
            await fetch('/api/register-push-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                storeId,
                token: token.value,
                platform: Capacitor.getPlatform() as 'ios' | 'android'
              })
            })
          } catch (err) {
            console.error('[push] Failed to register token:', err)
          }
        })

        // Listen for registration errors
        const errorListener = await PushNotifications.addListener('registrationError', (err) => {
          console.error('[push] Registration error:', err)
        })

        // Handle foreground notifications
        const foregroundListener = await PushNotifications.addListener(
          'pushNotificationReceived',
          (_notification) => {
            // Notification received in foreground - could show in-app toast
          }
        )

        // Handle notification tap
        const tapListener = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (_action) => {
            // User tapped the notification - could navigate to a specific page
          }
        )

        cleanup = () => {
          regListener.remove()
          errorListener.remove()
          foregroundListener.remove()
          tapListener.remove()
        }
      } catch (err) {
        console.error('[push] Setup error:', err)
      }
    }

    setup()

    return () => {
      cleanup?.()
    }
  }, [storeId])
}
