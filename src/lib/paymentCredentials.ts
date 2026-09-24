import type { User as FirebaseUser } from 'firebase/auth'
import { apiUrl } from '../utils/apiBase'

/**
 * Cliente de /api/payment-credentials. Los secretos de las pasarelas
 * (MP accessToken, Stripe secretKey, PayPal clientSecret, GoCuotas password)
 * ya NO se escriben en el doc público de la tienda: se mandan a este endpoint,
 * que los guarda en stores/{id}/private/payments (solo Admin SDK).
 * El dashboard solo recibe el estado enmascarado ("configurada, termina en …1234").
 */

export type PaymentGatewayId = 'mercadopago' | 'stripe' | 'paypal' | 'gocuotas'

export interface SecretStatus {
  configured: boolean
  last4: string | null
}

export type SecretStatusMap = Partial<Record<PaymentGatewayId, SecretStatus>>

async function call<T>(user: FirebaseUser, body: Record<string, unknown>): Promise<T> {
  const token = await user.getIdToken()
  const res = await fetch(apiUrl('/api/payment-credentials'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: Record<string, unknown> = {}
  try { if (text) data = JSON.parse(text) } catch { /* respuesta no JSON */ }
  if (!res.ok) throw new Error((data.error as string) || `HTTP ${res.status}`)
  return data as T
}

export async function getSecretStatus(user: FirebaseUser, storeId: string): Promise<SecretStatusMap> {
  const data = await call<{ gateways?: SecretStatusMap }>(user, { action: 'status', storeId })
  return data.gateways || {}
}

export async function saveGatewaySecret(
  user: FirebaseUser,
  storeId: string,
  gateway: PaymentGatewayId,
  secret: string
): Promise<SecretStatus> {
  const data = await call<{ status: SecretStatus }>(user, { action: 'save', storeId, gateway, secret })
  return data.status
}

export async function clearGatewaySecret(
  user: FirebaseUser,
  storeId: string,
  gateway: PaymentGatewayId
): Promise<void> {
  await call(user, { action: 'clear', storeId, gateway })
}

/** Valida credenciales PayPal server-side. Si `secret` va vacío usa el guardado. */
export async function validatePayPalCredentials(
  user: FirebaseUser,
  storeId: string,
  clientId: string,
  sandbox: boolean,
  secret?: string
): Promise<{ ok: boolean; error?: string }> {
  return call<{ ok: boolean; error?: string }>(user, {
    action: 'validate-paypal',
    storeId,
    clientId,
    sandbox,
    ...(secret ? { secret } : {}),
  })
}

/** Texto enmascarado para mostrar en el input cuando ya hay un secreto guardado. */
export function maskedLabel(status: SecretStatus | undefined): string {
  if (!status?.configured) return ''
  return status.last4 ? `Configurada · termina en …${status.last4}` : 'Configurada'
}
