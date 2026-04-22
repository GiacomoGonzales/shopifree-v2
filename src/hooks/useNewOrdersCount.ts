import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

const KEY = (storeId: string) => `ordersSeenAt_${storeId}`

function readSeenAt(storeId: string): Date {
  try {
    const raw = localStorage.getItem(KEY(storeId))
    if (!raw) return new Date(0)
    const ts = parseInt(raw, 10)
    return Number.isFinite(ts) ? new Date(ts) : new Date(0)
  } catch {
    return new Date(0)
  }
}

export function markOrdersAsSeen(storeId: string) {
  try {
    localStorage.setItem(KEY(storeId), Date.now().toString())
    // Notify listeners in the same tab (storage event only fires cross-tab).
    window.dispatchEvent(new CustomEvent('shopifree:ordersSeen', { detail: { storeId } }))
  } catch {
    // localStorage disabled — silently ignore.
  }
}

// Realtime count of orders created after the last time the user opened the Orders page
// on this device. Resets when markOrdersAsSeen() is called from Orders.tsx.
export function useNewOrdersCount(storeId: string | undefined): number {
  const [count, setCount] = useState(0)
  const [seenAt, setSeenAt] = useState<Date>(() => storeId ? readSeenAt(storeId) : new Date(0))

  useEffect(() => {
    if (!storeId) return
    setSeenAt(readSeenAt(storeId))
    const onSeen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { storeId?: string } | undefined
      if (detail?.storeId === storeId) setSeenAt(readSeenAt(storeId))
    }
    window.addEventListener('shopifree:ordersSeen', onSeen)
    return () => window.removeEventListener('shopifree:ordersSeen', onSeen)
  }, [storeId])

  useEffect(() => {
    if (!storeId) return
    const ordersRef = collection(db, 'stores', storeId, 'orders')
    const q = query(ordersRef, where('createdAt', '>', Timestamp.fromDate(seenAt)))
    const unsub = onSnapshot(q,
      snap => setCount(snap.size),
      () => setCount(0)
    )
    return unsub
  }, [storeId, seenAt])

  return count
}
