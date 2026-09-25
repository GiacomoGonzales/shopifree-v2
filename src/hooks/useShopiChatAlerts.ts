/**
 * Los avisos de ShopiChat mientras el panel está abierto (portado de Cobrify,
 * hooks/useAvisosDelChat.js):
 *
 *  - el título de la pestaña dice cuántas conversaciones tienen algo sin leer;
 *  - entra un mensaje y suena (lib/shopichatSound): un aviso si entra donde no
 *    estás mirando, una burbuja suave si entra en la conversación abierta;
 *  - con la ventana de lado (solo web), además, una notificación del sistema
 *    con quien escribe y lo que dijo; al tocarla se abre esa conversación.
 *
 * Vive en el DashboardLayout y no en la bandeja: el comerciante tiene que
 * enterarse aunque esté en Productos o en Pedidos. La bandeja avisa cuál es la
 * conversación abierta con `setActiveShopiChat`.
 *
 * Los avisos con la app CERRADA son push nativos (los manda el backend).
 */
import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { formatPhone, subscribeConversations, subscribeUnreadCount, toMillis } from '../lib/shopichatService'
import { playNewMessage, soundEnabled } from '../lib/shopichatSound'
import type { WaConversation } from '../types/shopichat'

// Holgura para el reloj del dispositivo, que no siempre está en hora con el de
// WhatsApp.
const CLOCK_SLACK_MS = 15 * 1000

// La conversación abierta en la bandeja (null = ninguna, o fuera de la bandeja).
let activeWaId: string | null = null
export function setActiveShopiChat(waId: string | null) {
  activeWaId = waId
}

const TITLE_PREFIX = /^\(\d+\)\s+/

export function useShopiChatAlerts(
  storeId: string | undefined,
  enabled: boolean,
  onOpen: (waId: string) => void
): number {
  const [conversations, setConversations] = useState<WaConversation[]>([])
  const lastSeen = useRef<Map<string, number> | null>(null)
  // Lo que llegó antes de abrir el panel no suena ni avisa.
  const openedAt = useRef(0)
  const openRef = useRef(onOpen)
  useEffect(() => { openRef.current = onOpen }, [onOpen])

  useEffect(() => {
    if (!storeId || !enabled) return undefined
    openedAt.current = Date.now()
    lastSeen.current = null
    const stop = subscribeConversations(storeId, setConversations, () => setConversations([]))
    return () => {
      stop()
      setConversations([])
    }
  }, [storeId, enabled])

  // El permiso de notificaciones se pide DESPUÉS del primer clic: Chrome
  // penaliza a quien lo pide apenas carga la página.
  useEffect(() => {
    if (!enabled || Capacitor.isNativePlatform()) return undefined
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return undefined
    const ask = () => { Notification.requestPermission().catch(() => {}) }
    window.addEventListener('pointerdown', ask, { once: true })
    return () => window.removeEventListener('pointerdown', ask)
  }, [enabled])

  // CONVERSACIONES con algo sin leer, no mensajes: cuántas puertas hay que atender.
  const unread = conversations.filter(c => (c.unread || 0) > 0).length

  // Título de la pestaña. Otras pantallas (Helmet) también lo escriben, así
  // que se reaplica cuando cambia y se vigila el <title> por si lo pisan.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return undefined
    const apply = () => {
      const base = document.title.replace(TITLE_PREFIX, '')
      const wanted = unread > 0 ? `(${unread}) ${base}` : base
      if (document.title !== wanted) document.title = wanted
    }
    apply()
    const titleEl = document.querySelector('title')
    const obs = titleEl ? new MutationObserver(apply) : null
    if (titleEl && obs) obs.observe(titleEl, { childList: true, characterData: true, subtree: true })
    return () => {
      obs?.disconnect()
      document.title = document.title.replace(TITLE_PREFIX, '')
    }
  }, [unread])

  useEffect(() => {
    const now = new Map(conversations.map(c => [c.id, toMillis(c.lastMessageAt)]))
    // Primera vuelta: se anota lo que hay, sin avisar de nada.
    if (lastSeen.current === null) {
      if (conversations.length) lastSeen.current = now
      return
    }
    const before = lastSeen.current
    lastSeen.current = now

    const since = openedAt.current - CLOCK_SLACK_MS
    const fresh = conversations.filter(c => {
      if (c.lastDirection !== 'in') return false
      const at = toMillis(c.lastMessageAt)
      return at > since && at > (before.get(c.id) || 0)
    })
    if (fresh.length === 0) return

    // Mirando = la pestaña a la vista y la ventana al frente.
    const looking = !document.hidden && document.hasFocus()
    const shape = fresh.some(c => !looking || c.id !== activeWaId) ? 'alert' : 'bubble'
    const latest = fresh.reduce((a, c) => (toMillis(c.lastMessageAt) > toMillis(a.lastMessageAt) ? c : a))
    const playedHere = playNewMessage(shape, `${latest.id}:${toMillis(latest.lastMessageAt)}`)

    if (Capacitor.isNativePlatform()) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    // Solo con la ventana de lado: si está mirando, la lista ya se lo dice.
    if (looking) return

    for (const c of fresh) {
      try {
        const n = new Notification(c.name || formatPhone(c.waId), {
          body: c.lastMessage || '💬',
          icon: '/icon-192.png',
          // Una notificación POR CONVERSACIÓN: la siguiente reemplaza a la anterior.
          tag: `shopichat-${c.id}`,
          silent: playedHere || !soundEnabled(),
        })
        n.onclick = () => {
          window.focus()
          openRef.current?.(c.id)
          n.close()
        }
      } catch { /* el navegador puede negarse */ }
    }
  }, [conversations])

  return enabled ? unread : 0
}

/**
 * Solo el contador (conversaciones con algo sin leer), para el menú móvil y
 * "Más" de la app nativa. Consulta chica: solo las que tienen `unread > 0`.
 */
export function useShopiChatUnread(storeId: string | undefined, enabled: boolean): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!storeId || !enabled) return undefined
    return subscribeUnreadCount(storeId, setCount)
  }, [storeId, enabled])
  return enabled ? count : 0
}
