import { useEffect, useRef, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

const KEY = (storeId: string) => `ordersSeenAt_${storeId}`

// Module-level dedupe so mounting the hook in two sidebars at once (desktop
// DashboardLayout + SharedMobileSidebar) doesn't play the chime twice when a
// single order lands in both snapshots.
let lastChimeAt = 0

/**
 * Short bright chime for a new order. Two descending tones (G6 → D6) to
 * stay distinct from the chat alert, which plays an ascending triad.
 */
function playNewOrderChime() {
  const now = Date.now()
  if (now - lastChimeAt < 500) return
  lastChimeAt = now
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const frequencies = [1568, 1175] // G6 → D6
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.3, now + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.3)
    })
    setTimeout(() => ctx.close(), 1000)
  } catch {
    // Web Audio not available — silent fallback
  }
}

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
  // Bumped whenever the user visits Orders, to force the snapshot listener to
  // re-read the latest cutoff from localStorage. Reading inside the effect
  // (instead of holding seenAt in state) avoids a brief flash of "all orders"
  // on first mount, when storeId arrives async and the listener would otherwise
  // be created with the default 1970 cutoff before state catches up.
  const [seenVersion, setSeenVersion] = useState(0)
  // null = before first snapshot; used to suppress the chime on initial page load.
  const prevCountRef = useRef<number | null>(null)

  useEffect(() => {
    if (!storeId) return
    const onSeen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { storeId?: string } | undefined
      if (detail?.storeId === storeId) setSeenVersion(v => v + 1)
    }
    window.addEventListener('shopifree:ordersSeen', onSeen)
    return () => window.removeEventListener('shopifree:ordersSeen', onSeen)
  }, [storeId])

  useEffect(() => {
    if (!storeId) return
    const seenAt = readSeenAt(storeId)
    // Reset the "last seen count" when the cutoff changes so the first
    // snapshot under the new cutoff is treated as the baseline, not a surge.
    prevCountRef.current = null
    const ordersRef = collection(db, 'stores', storeId, 'orders')
    const q = query(ordersRef, where('createdAt', '>', Timestamp.fromDate(seenAt)))
    const unsub = onSnapshot(q,
      snap => {
        const next = snap.size
        if (prevCountRef.current !== null && next > prevCountRef.current) {
          playNewOrderChime()
        }
        prevCountRef.current = next
        setCount(next)
      },
      () => setCount(0)
    )
    return unsub
  }, [storeId, seenVersion])

  return count
}
