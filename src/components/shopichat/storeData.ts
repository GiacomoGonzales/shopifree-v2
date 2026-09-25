/**
 * Datos de la tienda que ShopiChat necesita para vender desde el chat
 * (pedidos, productos, cupones), con caché por tienda: abrir la ficha y el
 * hilo de diez conversaciones no son diez consultas.
 *
 * Los pedidos se bajan como en Pedidos y Clientes (los últimos 500, misma
 * consulta que Firestore suele tener en caché) y se filtran por teléfono en el
 * cliente — ver el comentario de CustomerPanel sobre por qué no se consulta
 * por `customer.phone`. Caducan a los 5 minutos o cuando se crea un pedido
 * desde el chat (invalidateStoreOrders).
 */
import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot, Timestamp } from 'firebase/firestore'
import { couponService, db, orderService, productService } from '../../lib/firebase'
import { samePhone } from '../../lib/shopichatService'
import type { Coupon, Order, Product } from '../../types'

const ORDERS_TTL_MS = 5 * 60 * 1000
const ordersCache = new Map<string, { at: number; promise: Promise<Order[]> }>()
const productsCache = new Map<string, { at: number; promise: Promise<Product[]> }>()
const PRODUCTS_TTL_MS = 10 * 60 * 1000

// Avisos de "cambiaron los pedidos de esta tienda" (se creó uno desde el chat).
const listeners = new Set<(storeId: string) => void>()

export function storeOrders(storeId: string): Promise<Order[]> {
  const hit = ordersCache.get(storeId)
  if (hit && Date.now() - hit.at < ORDERS_TTL_MS) return hit.promise
  const promise = orderService.getAll(storeId, 500).catch(() => {
    ordersCache.delete(storeId)
    return [] as Order[]
  })
  ordersCache.set(storeId, { at: Date.now(), promise })
  return promise
}

/** Olvida los pedidos en caché y avisa a quien los esté mostrando. */
export function invalidateStoreOrders(storeId: string) {
  ordersCache.delete(storeId)
  listeners.forEach(fn => fn(storeId))
}

export function storeProducts(storeId: string, fresh = false): Promise<Product[]> {
  const hit = productsCache.get(storeId)
  if (hit && !fresh && Date.now() - hit.at < PRODUCTS_TTL_MS) return hit.promise
  const promise = productService.getAll(storeId).catch(() => {
    productsCache.delete(storeId)
    return [] as Product[]
  })
  productsCache.set(storeId, { at: Date.now(), promise })
  return promise
}

/** Cupones que hoy se pueden usar (activos, sin vencer, con usos disponibles). */
export async function usableCoupons(storeId: string): Promise<Coupon[]> {
  const all = await couponService.getAll(storeId)
  const now = Date.now()
  return all.filter(c => {
    if (!c.active) return false
    if (c.expiresAt) {
      const d = c.expiresAt instanceof Date ? c.expiresAt : new Date(c.expiresAt)
      if (!Number.isNaN(d.getTime()) && d.getTime() < now) return false
    }
    if (c.maxUses && (c.currentUses || 0) >= c.maxUses) return false
    return true
  })
}

/** Los pedidos de la tienda, que se recargan cuando se invalidan. */
export function useStoreOrders(storeId: string): Order[] | null {
  const [state, setState] = useState<{ id: string; version: number; orders: Order[] } | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const fn = (id: string) => { if (id === storeId) setVersion(v => v + 1) }
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [storeId])

  useEffect(() => {
    let alive = true
    storeOrders(storeId).then(orders => { if (alive) setState({ id: storeId, version, orders }) })
    return () => { alive = false }
  }, [storeId, version])

  return state && state.id === storeId ? state.orders : null
}

/** Los pedidos de un cliente (por teléfono), del más nuevo al más viejo. */
export function useCustomerOrders(storeId: string, phone: string): { orders: Order[]; loading: boolean } {
  const all = useStoreOrders(storeId)
  const orders = useMemo(
    () => (all || []).filter(o => !o.isTest && samePhone(o.customer?.phone, phone)),
    [all, phone]
  )
  return { orders, loading: all === null }
}

const toDateLoose = (v: unknown) => (v instanceof Timestamp ? v.toDate() : v)

/**
 * Escucha EN VIVO unos pocos pedidos por id (los recientes del cliente): así
 * un pago confirmado por la pasarela aparece en el chat al instante. Devuelve
 * los pedidos con lo último que dijo Firestore (o lo de la lista mientras
 * tanto).
 */
export function useLiveOrders(storeId: string, base: Order[]): Order[] {
  const [live, setLive] = useState<Record<string, Order>>({})
  const ids = base.map(o => o.id).join(',')

  useEffect(() => {
    if (!ids) return undefined
    const unsubs = ids.split(',').map(id => onSnapshot(
      doc(db, 'stores', storeId, 'orders', id),
      snap => {
        if (!snap.exists()) return
        const data = snap.data() as Record<string, unknown>
        const converted: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(data)) converted[k] = toDateLoose(v)
        setLive(prev => ({ ...prev, [id]: { id, storeId, ...converted } as Order }))
      },
      () => { /* sin permiso o sin red: queda lo de la lista */ }
    ))
    return () => unsubs.forEach(u => u())
  }, [storeId, ids])

  return useMemo(() => base.map(o => live[o.id] || o), [base, live])
}
