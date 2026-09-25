/**
 * Colores y nombres de los estados de un pedido. Compartidos por Pedidos y
 * el panel del cliente de ShopiChat para que el mismo estado se vea igual en
 * los dos lados.
 */
import type { Order } from '../types'

export type OrderStatus = Order['status']

export const ORDER_STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  confirmed: { bg: 'bg-[#E0F2FE]', text: 'text-[#075985]', dot: 'bg-[#0284C7]' },
  preparing: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  ready: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  delivered: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' }
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, Record<string, string>> = {
  pending: { es: 'Pendiente', en: 'Pending' },
  confirmed: { es: 'Confirmado', en: 'Confirmed' },
  preparing: { es: 'Preparando', en: 'Preparing' },
  ready: { es: 'Listo', en: 'Ready' },
  delivered: { es: 'Entregado', en: 'Delivered' },
  cancelled: { es: 'Cancelado', en: 'Cancelled' }
}
