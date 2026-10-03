/**
 * Modelo comercial de una tienda, versión servidor.
 *
 * COPIA de src/lib/admin/modelo.ts (estadoComercial, planEfectivo,
 * fechaVencimiento) y de aFecha (src/lib/admin/formato.ts). Las funciones de
 * api/ no pueden importar de src/ en Vercel, así que la lógica vive en los dos
 * lados: si cambias una regla aquí, cámbiala allá (y al revés). Si no, el
 * Resumen (calculado aquí) y las listas del admin (calculadas en el navegador)
 * vuelven a contar distinto, que es justo lo que este modelo vino a arreglar.
 */

export type Plan = 'free' | 'pro' | 'business'

export type EstadoComercial = 'pagando' | 'pago_pendiente' | 'cancelada' | 'prueba' | 'prueba_vencida' | 'cortesia' | 'cortesia_vencida' | 'gratis'

export const ESTADOS: EstadoComercial[] = ['pagando', 'pago_pendiente', 'cancelada', 'prueba', 'prueba_vencida', 'cortesia', 'cortesia_vencida', 'gratis']

export interface DatosPlan {
  plan?: string | null
  trialEndsAt?: unknown
  planExpiresAt?: unknown
  subscription?: { status?: string | null; currentPeriodEnd?: unknown; cancelAtPeriodEnd?: boolean | null } | null
}

/** Convierte cualquier fecha de Firestore / Stripe / JSON a Date (o null). */
export function aFecha(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (typeof o.toDate === 'function') return (o.toDate as () => Date)()
    if (typeof o.seconds === 'number') return new Date(o.seconds * 1000)
    if (typeof o._seconds === 'number') return new Date(o._seconds * 1000)
    return null
  }
  if (typeof v === 'number') {
    // Stripe manda segundos; JS, milisegundos.
    return new Date(v < 1e12 ? v * 1000 : v)
  }
  const d = new Date(String(v))
  return isNaN(d.getTime()) ? null : d
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

/** El plan que la tienda usa de verdad hoy (espejo de hasPaidEffectivePlan). */
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
