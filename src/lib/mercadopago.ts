/**
 * Integración con MercadoPago para Shopifree v2
 * Las credenciales nunca se exponen al frontend - todo se maneja via API route
 */

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
  orderId?: string
): MercadoPagoPreference {
  const mpItems = items.map((item, index) => ({
    id: item.id || `item-${index}`,
    title: item.variant?.name ? `${item.name} - ${item.variant.name}` : item.name,
    quantity: item.quantity,
    unit_price: Math.round((item.variant?.price || item.price) * 100) / 100,
    currency_id: currency
  }))

  return {
    items: mpItems,
    external_reference: orderId || `order-${Date.now()}`
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
  const response = await fetch('/api/create-mp-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeId,
      orderId,
      orderNumber,
      items: preference.items,
      payer: preference.payer,
      external_reference: preference.external_reference || orderId,
      origin: window.location.origin
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
  const response = await fetch('/api/process-mp-payment', {
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
