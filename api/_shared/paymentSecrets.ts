/**
 * Secretos de pasarelas de pago del comerciante (server-only).
 *
 * Antes los secretos (MP accessToken, Stripe secretKey, PayPal clientSecret,
 * GoCuotas password) vivían en stores/{storeId}.payments.*, que es público
 * ("allow read: if true"). Ahora viven en stores/{storeId}/private/payments,
 * un doc al que solo llega el Admin SDK (las reglas niegan acceso de cliente).
 *
 * En el doc público solo queda `payments.<gateway>.secretConfigured: true`
 * para que el storefront sepa que la pasarela está lista, sin exponer nada.
 *
 * Compatibilidad: getPaymentSecrets() cae a los campos legacy del doc público
 * si el doc privado no los tiene, así las tiendas viejas siguen cobrando hasta
 * que corra scripts/migrate-payment-secrets.mjs.
 */

import type { Firestore } from 'firebase-admin/firestore'

export type PaymentGateway = 'mercadopago' | 'stripe' | 'paypal' | 'gocuotas'

export const PAYMENT_GATEWAYS: PaymentGateway[] = ['mercadopago', 'stripe', 'paypal', 'gocuotas']

// Campo secreto de cada pasarela (mismo nombre en el doc legacy y en el privado)
export const SECRET_FIELD: Record<PaymentGateway, string> = {
  mercadopago: 'accessToken',
  stripe: 'secretKey',
  paypal: 'clientSecret',
  gocuotas: 'password',
}

export interface PaymentSecrets {
  mercadopago?: { accessToken?: string }
  stripe?: { secretKey?: string }
  paypal?: { clientSecret?: string }
  gocuotas?: { password?: string }
}

export function privatePaymentsRef(db: Firestore, storeId: string) {
  return db.collection('stores').doc(storeId).collection('private').doc('payments')
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined
}

/**
 * Lee los secretos de la tienda. Prioriza el doc privado; si falta un secreto
 * ahí, usa el campo legacy del doc público (store.payments.<gw>.<campo>).
 * `store` es el data() del doc de la tienda ya leído por el endpoint (evita
 * otra lectura); si no se pasa, solo se usa el doc privado.
 */
export async function getPaymentSecrets(
  db: Firestore,
  storeId: string,
  store?: { payments?: Record<string, unknown> } | Record<string, unknown> | null
): Promise<PaymentSecrets> {
  let priv: Record<string, unknown> = {}
  try {
    const snap = await privatePaymentsRef(db, storeId).get()
    if (snap.exists) priv = (snap.data() || {}) as Record<string, unknown>
  } catch (err) {
    console.error('[paymentSecrets] error leyendo doc privado:', err)
  }

  const legacyPayments = ((store as { payments?: Record<string, unknown> } | null | undefined)?.payments || {}) as Record<string, unknown>
  const out: PaymentSecrets = {}

  for (const gw of PAYMENT_GATEWAYS) {
    const field = SECRET_FIELD[gw]
    const privGw = (priv[gw] || {}) as Record<string, unknown>
    const legacyGw = (legacyPayments[gw] || {}) as Record<string, unknown>
    const value = str(privGw[field]) ?? str(legacyGw[field])
    if (value) (out as Record<string, Record<string, string>>)[gw] = { [field]: value }
  }

  return out
}

/** "configurada, termina en …1234" — nunca devuelve el secreto. */
export function maskSecret(secret: string | undefined): { configured: boolean; last4: string | null } {
  if (!secret) return { configured: false, last4: null }
  return { configured: true, last4: secret.length >= 8 ? secret.slice(-4) : null }
}
