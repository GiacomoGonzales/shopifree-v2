/**
 * Formatos del panel admin. Una sola versión de cada cosa: fechas, dinero,
 * números. Antes cada página tenía su propio convertidor de fechas (seis copias
 * solo en Tiendas) y el "Próximo cobro" de Planes salía "Invalid Date" porque
 * hacía new Date() sobre un Timestamp de Firestore.
 */

type FechaCruda = Date | string | number | { toDate: () => Date } | { seconds: number } | { _seconds: number } | null | undefined

/** Convierte cualquier fecha de Firestore / Stripe / JSON a Date (o null). */
export function aFecha(v: FechaCruda | unknown): Date | null {
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

const LOCALE = 'es-PE'

export function fecha(v: unknown): string {
  const d = aFecha(v)
  return d ? d.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

export function fechaCorta(v: unknown): string {
  const d = aFecha(v)
  if (!d) return '—'
  const mismoAnio = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(LOCALE, mismoAnio ? { day: '2-digit', month: 'short' } : { day: '2-digit', month: 'short', year: '2-digit' })
}

export function fechaHora(v: unknown): string {
  const d = aFecha(v)
  return d ? d.toLocaleString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
}

/** "hace 3 min", "hace 2 d", "en 5 d". */
export function relativo(v: unknown): string {
  const d = aFecha(v)
  if (!d) return '—'
  const seg = Math.round((d.getTime() - Date.now()) / 1000)
  const abs = Math.abs(seg)
  const [n, u] = abs < 60 ? [abs, 's'] : abs < 3600 ? [Math.round(abs / 60), 'min'] : abs < 86400 ? [Math.round(abs / 3600), 'h'] : abs < 86400 * 60 ? [Math.round(abs / 86400), 'd'] : [Math.round(abs / (86400 * 30)), 'meses']
  if (abs < 45) return 'ahora'
  return seg < 0 ? `hace ${n} ${u}` : `en ${n} ${u}`
}

/** Días enteros desde hoy hasta la fecha (negativo = ya pasó). */
export function diasHasta(v: unknown): number | null {
  const d = aFecha(v)
  if (!d) return null
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

export function numero(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return n.toLocaleString(LOCALE)
}

/** Dinero SIEMPRE con su moneda: nunca se suman monedas distintas. */
export function dinero(monto: number | null | undefined, moneda = 'USD'): string {
  if (monto === null || monto === undefined || isNaN(monto)) return '—'
  try {
    return monto.toLocaleString(LOCALE, { style: 'currency', currency: moneda.toUpperCase(), maximumFractionDigits: monto % 1 === 0 ? 0 : 2 })
  } catch {
    return `${moneda.toUpperCase()} ${monto.toFixed(2)}`
  }
}

export function porcentaje(parte: number, total: number): string {
  if (!total) return '—'
  const p = (parte / total) * 100
  return `${p < 10 ? p.toFixed(1) : Math.round(p)} %`
}

const PAISES: Record<string, string> = {
  PE: 'Perú', MX: 'México', CO: 'Colombia', AR: 'Argentina', CL: 'Chile', EC: 'Ecuador', BO: 'Bolivia',
  VE: 'Venezuela', UY: 'Uruguay', PY: 'Paraguay', US: 'Estados Unidos', ES: 'España', GT: 'Guatemala',
  CR: 'Costa Rica', PA: 'Panamá', DO: 'Rep. Dominicana', HN: 'Honduras', SV: 'El Salvador', NI: 'Nicaragua',
  CU: 'Cuba', PR: 'Puerto Rico', BR: 'Brasil', CA: 'Canadá',
}

export function nombrePais(codigo?: string | null): string {
  if (!codigo) return 'Sin país'
  return PAISES[codigo.toUpperCase()] || codigo.toUpperCase()
}
