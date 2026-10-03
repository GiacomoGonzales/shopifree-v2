/**
 * El modelo comercial de una tienda, en UN solo lugar.
 *
 * Antes cada página del admin decidía por su cuenta qué era "pagando" o
 * "activa" (Dashboard contaba plan == 'pro' con las pruebas de 7 días adentro,
 * Pagadas sumaba trialing, Planes no), así que las cifras no cuadraban entre
 * pantallas. Todo el admin —y el cálculo del Resumen en el servidor
 * (api/_shared/adminModelo.ts, que es una copia de esta lógica)— usa esto.
 */
import { aFecha } from './formato'

export type Plan = 'free' | 'pro' | 'business'

/**
 * - pagando: suscripción de Stripe al día (active o trialing de Stripe, con tarjeta).
 * - pago_pendiente: Stripe intentando cobrar (past_due, unpaid, incomplete).
 * - cancelada: tuvo suscripción y se canceló.
 * - prueba: prueba gratis de Shopifree vigente (sin tarjeta).
 * - prueba_vencida: la prueba terminó y no pagó.
 * - cortesia: plan pago puesto a mano por el admin, sin Stripe.
 * - cortesia_vencida: el acceso manual tenía fecha y ya pasó.
 * - gratis: plan free.
 */
export type EstadoComercial = 'pagando' | 'pago_pendiente' | 'cancelada' | 'prueba' | 'prueba_vencida' | 'cortesia' | 'cortesia_vencida' | 'gratis'

export const ETIQUETA_ESTADO: Record<EstadoComercial, string> = {
  pagando: 'Pagando',
  pago_pendiente: 'Pago pendiente',
  cancelada: 'Cancelada',
  prueba: 'En prueba',
  prueba_vencida: 'Prueba vencida',
  cortesia: 'Cortesía',
  cortesia_vencida: 'Cortesía vencida',
  gratis: 'Gratis',
}

/** Tono del estado en pantalla: rojo solo lo que pide acción. */
export const TONO_ESTADO: Record<EstadoComercial, 'normal' | 'tenue' | 'rojo'> = {
  pagando: 'normal',
  pago_pendiente: 'rojo',
  cancelada: 'tenue',
  prueba: 'tenue',
  prueba_vencida: 'tenue',
  cortesia: 'normal',
  cortesia_vencida: 'tenue',
  gratis: 'tenue',
}

export const ETIQUETA_PLAN: Record<Plan, string> = { free: 'Free', pro: 'Pro', business: 'Business' }

export const ETIQUETA_STRIPE: Record<string, string> = {
  active: 'Activa',
  trialing: 'Activa (prueba Stripe)',
  past_due: 'Pago atrasado',
  unpaid: 'Impaga',
  canceled: 'Cancelada',
  incomplete: 'Incompleta',
  incomplete_expired: 'Expirada',
  paused: 'Pausada',
}

export interface DatosPlan {
  plan?: string | null
  trialEndsAt?: unknown
  planExpiresAt?: unknown
  subscription?: { status?: string | null; currentPeriodEnd?: unknown; cancelAtPeriodEnd?: boolean | null } | null
}

export function normalizarPlan(p?: string | null): Plan {
  return p === 'pro' || p === 'business' ? p : 'free'
}

export function estadoComercial(t: DatosPlan, ahora = Date.now()): EstadoComercial {
  const plan = normalizarPlan(t.plan)
  const sub = t.subscription
  if (sub?.status) {
    if (sub.status === 'active' || sub.status === 'trialing') return plan === 'free' ? 'gratis' : 'pagando'
    if (sub.status === 'past_due' || sub.status === 'unpaid' || sub.status === 'incomplete') return 'pago_pendiente'
    if (plan === 'free') return 'cancelada'
    // Cancelada en Stripe pero el plan sigue pago: el webhook todavía no la
    // bajó, o el admin le dio acceso a mano. Se muestra como cancelada.
    return 'cancelada'
  }
  if (plan === 'free') return 'gratis'
  // Mismo orden que hasPaidEffectivePlan (api/_shared/plan.ts): fecha de
  // cortesía, cortesía indefinida (null), prueba, y si no hay nada, cortesía.
  if (t.planExpiresAt !== undefined && t.planExpiresAt !== null) {
    const d = aFecha(t.planExpiresAt)
    if (d) return d.getTime() > ahora ? 'cortesia' : 'cortesia_vencida'
  }
  if (t.planExpiresAt === null) return 'cortesia'
  const fin = aFecha(t.trialEndsAt)
  if (fin) return fin.getTime() > ahora ? 'prueba' : 'prueba_vencida'
  return 'cortesia'
}

/**
 * El plan que la tienda usa de verdad hoy. Espejo exacto de
 * hasPaidEffectivePlan del servidor: con suscripción de Stripe (aunque esté
 * atrasada o cancelada) se respeta el plan guardado; el webhook decide la baja.
 */
export function planEfectivo(t: DatosPlan, ahora = Date.now()): Plan {
  const plan = normalizarPlan(t.plan)
  if (plan === 'free') return 'free'
  if (t.subscription) return plan
  const e = estadoComercial(t, ahora)
  return e === 'prueba_vencida' || e === 'cortesia_vencida' ? 'free' : plan
}

/** La fecha que importa para "vence": fin de periodo, acceso manual o fin de prueba. */
export function fechaVencimiento(t: DatosPlan, ahora = Date.now()): Date | null {
  const e = estadoComercial(t, ahora)
  if (e === 'pagando' || e === 'pago_pendiente' || e === 'cancelada') return aFecha(t.subscription?.currentPeriodEnd)
  if (e === 'cortesia' || e === 'cortesia_vencida') return aFecha(t.planExpiresAt)
  if (e === 'prueba' || e === 'prueba_vencida') return aFecha(t.trialEndsAt)
  return null
}
