/**
 * Integración con MercadoPago para Shopifree v2
 * Simplificado para catálogos con pedidos por WhatsApp + pagos opcionales
 */

export interface MercadoPagoConfig {
  enabled: boolean
  publicKey: string
  accessToken: string
  environment: 'sandbox' | 'production'
  webhookUrl?: string
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
  back_urls?: {
    success?: string
    failure?: string
    pending?: string
  }
  auto_return?: 'approved' | 'all'
  external_reference?: string
  notification_url?: string
}

export interface MercadoPagoPreferenceResult {
  id: string
  init_point: string
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
 * Valida si la configuración de MercadoPago es válida
 */
export function validateMercadoPagoConfig(config: MercadoPagoConfig): true | string {
  if (!config.enabled) {
    return 'MercadoPago está deshabilitado'
  }

  if (!config.publicKey?.trim()) {
    return 'Public Key de MercadoPago es requerido'
  }

  if (!config.accessToken?.trim()) {
    return 'Access Token de MercadoPago es requerido'
  }

  if (!['sandbox', 'production'].includes(config.environment)) {
    return 'Environment debe ser sandbox o production'
  }

  return true
}

/**
 * Obtiene la URL de inicialización según el ambiente
 */
export function getInitPoint(
  preferenceResult: MercadoPagoPreferenceResult,
  environment: 'sandbox' | 'production'
): string {
  return environment === 'sandbox'
    ? (preferenceResult.sandbox_init_point || preferenceResult.init_point)
    : preferenceResult.init_point
}

/**
 * Crea una preferencia de pago en MercadoPago
 */
export async function createPreference(
  preference: MercadoPagoPreference,
  config: MercadoPagoConfig
): Promise<MercadoPagoPreferenceResult> {
  const effectiveConfig = {
    ...config,
    environment: config.environment || 'production' as const
  }

  const validation = validateMercadoPagoConfig(effectiveConfig)
  if (validation !== true) {
    throw new Error(validation)
  }

  const isTestToken = effectiveConfig.accessToken.startsWith('TEST-')
  const isProductionToken = effectiveConfig.accessToken.startsWith('APP_USR-')

  console.log('[MercadoPago] Creando preferencia:', {
    environment: effectiveConfig.environment,
    items: preference.items.length,
    total: preference.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0),
    isTestToken,
    isProductionToken
  })

  if (effectiveConfig.environment === 'sandbox' && !isTestToken) {
    console.warn('[MercadoPago] ADVERTENCIA: Environment es sandbox pero el token parece de producción')
  }
  if (effectiveConfig.environment === 'production' && !isProductionToken) {
    console.warn('[MercadoPago] ADVERTENCIA: Environment es production pero el token parece de test')
  }

  const apiUrl = 'https://api.mercadopago.com/checkout/preferences'

  try {
    const payload = {
      ...preference,
      back_urls: {
        success: `${window.location.origin}/payment/success`,
        failure: `${window.location.origin}/payment/failure`,
        pending: `${window.location.origin}/payment/pending`
      },
      auto_return: 'approved',
      ...(config.webhookUrl && { notification_url: config.webhookUrl }),
      statement_descriptor: 'Shopifree',
      expires: false,
      binary_mode: false
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${effectiveConfig.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }))
      console.error('[MercadoPago] Error en API:', {
        status: response.status,
        error: errorData
      })
      throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`)
    }

    const result = await response.json()

    console.log('[MercadoPago] Preferencia creada:', {
      id: result.id,
      hasInitPoint: !!result.init_point
    })

    return {
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point
    }

  } catch (error) {
    console.error('[MercadoPago] Error al crear preferencia:', error)

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Error de conexión. Verifica tu conexión a internet.')
    }

    throw error
  }
}

/**
 * Genera un link de pago de MercadoPago para el carrito actual
 */
export async function generatePaymentLink(
  items: CartItem[],
  config: MercadoPagoConfig,
  currency: string = 'PEN'
): Promise<string> {
  const preference = cartToPreference(items, currency)
  const result = await createPreference(preference, config)
  return getInitPoint(result, config.environment)
}
