/**
 * Integración con MercadoPago para Shopifree v2
 * Las credenciales nunca se exponen al frontend - todo se maneja via API route
 */

import { Capacitor } from '@capacitor/core'
import { apiUrl } from '../utils/apiBase'

/** Get the correct origin for payment redirects (native apps use store subdomain) */
function getPaymentOrigin(): string {
  if (Capacitor.isNativePlatform()) {
    const subdomain = import.meta.env.VITE_STORE_SUBDOMAIN
    if (subdomain) return `https://${subdomain}.shopifree.app`
    return 'https://shopifree.app'
  }
  return window.location.origin
}

export interface MercadoPagoPreference {
  items: Array<{
    id: string
    title: string
    quantity: number
    unit_price: number
    currency_id: string
  }>
  payer?: {
    name?: string
    email?: string
    phone?: {
      number?: string
    }
  }
  external_reference?: string
}

export interface CreatePreferenceResult {
  init_point: string
  preference_id: string
  sandbox_init_point?: string
}

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  variant?: {
    name: string
    price: number
  }
}

/**
 * Convierte items del carrito a formato de preferencia de MercadoPago
 */
export function cartToPreference(
  items: CartItem[],
  currency: string = 'PEN',
  orderId?: string,
  opts?: { discountAmount?: number; shippingCost?: number }
): MercadoPagoPreference {
  // MercadoPago cobra la SUMA de los ítems. Si no aplicamos el cupón/envío
  // aquí, cobra el subtotal sin descuento. Por eso repartimos el descuento
  // entre las líneas y agregamos el envío, para que el total cobrado sea el
  // neto correcto (subtotal − descuento + envío).
  const cents = (n: number) => Math.round(n * 100)
  const discountCents = Math.max(0, cents(opts?.discountAmount || 0))
  const shippingCents = Math.max(0, cents(opts?.shippingCost || 0))

  const lineCents = items.map(item => cents((item.variant?.price ?? item.price) * item.quantity))
  const subtotalCents = lineCents.reduce((a, b) => a + b, 0)
  const targetCents = Math.max(0, subtotalCents - discountCents) // subtotal ya con descuento

  // Cada línea va como un solo ítem (quantity: 1) con su total ya descontado.
  // La última absorbe el redondeo para que el total sea EXACTO.
  let allocated = 0
  const mpItems = items.map((item, index) => {
    const isLast = index === items.length - 1
    const lc = subtotalCents === 0
      ? 0
      : isLast
        ? targetCents - allocated
        : Math.round((lineCents[index] * targetCents) / subtotalCents)
    if (!isLast) allocated += lc
    const base = item.variant?.name ? `${item.name} - ${item.variant.name}` : item.name
    return {
      id: item.id || `item-${index}`,
      title: item.quantity > 1 ? `${base} (x${item.quantity})` : base,
      quantity: 1,
      unit_price: lc / 100,
      currency_id: currency,
    }
  })

  if (shippingCents > 0) {
    mpItems.push({ id: 'shipping', title: 'Envío', quantity: 1, unit_price: shippingCents / 100, currency_id: currency })
  }

  return {
    items: mpItems,
    external_reference: orderId || `order-${Date.now()}`,
  }
}

/**
 * Crea una preferencia de pago via API route (server-side)
 * Las credenciales de MP se obtienen del servidor, nunca se exponen al frontend
 */
export async function createPreference(
  storeId: string,
  orderId: string,
  orderNumber: string,
  preference: MercadoPagoPreference
): Promise<CreatePreferenceResult> {
  const response = await fetch(apiUrl('/api/create-mp-preference'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeId,
      orderId,
      orderNumber,
      items: preference.items,
      payer: preference.payer,
      external_reference: preference.external_reference || orderId,
      origin: getPaymentOrigin()
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(errorData.error || `Error ${response.status}`)
  }

  return response.json()
}

/**
 * Result from processing a card payment via Brick
 */
export interface ProcessPaymentResult {
  status: 'approved' | 'rejected' | 'in_process' | 'pending'
  status_detail: string
  payment_id: string
}

/**
 * Process a card payment from the Payment Brick
 * Sends tokenized form data to the server for processing
 */
export async function processPayment(
  storeId: string,
  orderId: string,
  formData: Record<string, unknown>
): Promise<ProcessPaymentResult> {
  const response = await fetch(apiUrl('/api/process-mp-payment'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeId, orderId, formData })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`)
  }

  return data
}
