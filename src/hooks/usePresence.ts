import { useEffect, useRef } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

const HEARTBEAT_MS = 60 * 1000 // 1 minute

export function usePresence(storeId: string | undefined) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!storeId) return

    console.log('[usePresence] Tracking store:', storeId)

    const ping = () => {
      updateDoc(doc(db, 'stores', storeId), {
        lastOnlineAt: serverTimestamp()
      })
        .then(() => console.log('[usePresence] Ping OK'))
        .catch((err) => console.error('[usePresence] Ping FAILED:', err))
    }

    // Immediate ping on mount
    ping()

    // Heartbeat
    intervalRef.current = setInterval(ping, HEARTBEAT_MS)

    // Ping on tab visibility change (returning from background)
    const onVisible = () => {
      if (document.visibilityState === 'visible') ping()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [storeId])
}
