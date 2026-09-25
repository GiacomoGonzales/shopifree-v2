/**
 * Identidad de un cliente por su teléfono.
 * ========================================
 * En Shopifree el cliente NO es un documento propio: Clientes lo arma
 * agrupando pedidos por `customer.phone`, y ShopiChat lo reconoce por el waId
 * de WhatsApp (siempre con código de país). El mismo número llega entonces en
 * formas distintas: "940 200 754", "+51 940200754", "51940200754"...
 *
 * `normalizeCustomerKey` las lleva todas a la MISMA clave: los últimos 9
 * dígitos (lo mismo que tolera `samePhone` en ShopiChat al comparar). Con esa
 * clave se guarda el perfil compartido `stores/{storeId}/customers/{key}`
 * (nota y etiquetas), así Clientes y ShopiChat leen y escriben el mismo doc
 * aunque uno tenga el código de país y el otro no.
 *
 * Sin dependencias de Firebase: se puede usar en cualquier lado.
 */
import { phoneCodeByCountry } from '../data/states'

/** Dígitos de la clave. 9 cubre el número nacional de casi toda la región. */
const KEY_DIGITS = 9

const digitsOf = (s?: string | null) => String(s || '').replace(/\D/g, '').replace(/^00/, '')

/**
 * Clave estable del cliente a partir de cualquier forma de su teléfono.
 * Devuelve '' si no alcanza para identificarlo (menos de 6 dígitos, o un
 * usuario de WhatsApp sin número a la vista, tipo "PE.xxxx").
 */
export function normalizeCustomerKey(phone?: string | null): string {
  const raw = String(phone || '').trim()
  if (/^[A-Z]{2}\./.test(raw)) return ''
  const d = digitsOf(raw)
  if (d.length < 6) return ''
  return d.length > KEY_DIGITS ? d.slice(-KEY_DIGITS) : d
}

/**
 * Número en formato internacional (solo dígitos, con código de país) para
 * abrir WhatsApp o ShopiChat. Si el teléfono del pedido se guardó sin código
 * de país (lo común en tiendas de un solo país) se le antepone el del país de
 * la tienda. Un 0 inicial de larga distancia nacional se descarta.
 */
export function toWhatsAppDigits(phone?: string | null, storeCountry?: string | null): string {
  const d = digitsOf(phone)
  if (!d) return ''
  const cc = digitsOf(phoneCodeByCountry[String(storeCountry || '').toUpperCase()] || '')
  if (!cc) return d
  // Ya trae el código de país (y le queda un número nacional completo detrás).
  if (d.startsWith(cc) && d.length - cc.length >= 8) return d
  // Número nacional corto: se le agrega el código del país de la tienda.
  if (d.length <= 10) return `${cc}${d.replace(/^0+/, '')}`
  return d
}

/** Dirección de entrega en una sola línea legible (para copiar o mandar por chat). */
export function formatDeliveryAddress(a?: {
  street?: string
  district?: string
  city?: string
  state?: string
  country?: string
  zipCode?: string
  reference?: string
} | null): string {
  if (!a) return ''
  const main = [a.street, a.district, a.city, a.state, a.zipCode, a.country]
    .map(s => String(s || '').trim())
    .filter(Boolean)
  // Sin duplicados consecutivos ("Lima, Lima").
  const parts = main.filter((s, i) => i === 0 || s.toLowerCase() !== main[i - 1].toLowerCase())
  const line = parts.join(', ')
  const ref = String(a.reference || '').trim()
  return ref ? `${line}${line ? ' ' : ''}(${ref})` : line
}
