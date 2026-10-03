import { cn } from './cn'

// Un estado es una palabra, no una pastilla de color. Solo lo que necesita
// acción se pinta de rojo; lo provisional (prueba, pendiente) va en gris.
const ROJOS = new Set(['expired', 'past_due', 'unpaid', 'incomplete_expired', 'canceled', 'cancelled', 'failed', 'error', 'rejected', 'vencido', 'vencida', 'fallido', 'cancelada', 'rechazado'])
const TENUES = new Set(['trial', 'trialing', 'pending', 'incomplete', 'free', 'draft', 'none', 'prueba', 'pendiente', 'gratis'])
const TONOS = { rojo: 'text-red-600 font-medium', tenue: 'text-gray-500', normal: 'text-gray-900' } as const

export default function Estado({ valor, etiqueta, tono, className }: {
  valor?: string | null
  etiqueta?: string
  tono?: keyof typeof TONOS
  className?: string
}) {
  const v = String(valor ?? '').toLowerCase()
  const t = tono || (ROJOS.has(v) ? 'rojo' : TENUES.has(v) ? 'tenue' : 'normal')
  return <span className={cn(TONOS[t], className)}>{etiqueta ?? valor ?? '—'}</span>
}
