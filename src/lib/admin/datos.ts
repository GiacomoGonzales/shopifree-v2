/**
 * Datos compartidos del panel admin, con caché por sesión.
 *
 * Antes Dashboard, Tiendas, Pagadas, Planes y Media bajaban cada una la
 * colección `stores` completa (Tiendas además con un listener vivo), así que
 * recorrer el admin la descargaba cuatro o cinco veces. Ahora se lee UNA vez
 * por sesión y se comparte; "Actualizar" en cada pantalla fuerza otra lectura.
 * Las cifras del Resumen no salen de aquí: las calcula el servidor
 * (api/admin-stats) y se guardan en un documento.
 */
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { aFecha } from './formato'
import { estadoComercial, fechaVencimiento, normalizarPlan, planEfectivo, type EstadoComercial, type Plan } from './modelo'

export interface AdminTienda {
  id: string
  nombre: string
  subdominio: string
  logo?: string
  whatsapp?: string
  pais?: string
  moneda?: string
  ownerId?: string
  plan: Plan
  planEfectivo: Plan
  estado: EstadoComercial
  vence: Date | null
  creada: Date | null
  actualizada: Date | null
  enLinea: Date | null
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripeStatus?: string
  cancelaAlVencer: boolean
  tieneApp: boolean
  dominio?: string
  /** El documento crudo, para la ficha (campos que la lista no usa). */
  crudo: Record<string, unknown>
}

export interface AdminUsuario {
  id: string
  email: string
  nombre: string
  telefono?: string
  creado: Date | null
  storeId?: string
  stripeCustomerId?: string
}

export function armarTienda(id: string, d: Record<string, unknown>): AdminTienda {
  const sub = (d.subscription || null) as Record<string, unknown> | null
  const datosPlan = {
    plan: d.plan as string,
    trialEndsAt: d.trialEndsAt,
    planExpiresAt: d.planExpiresAt,
    subscription: sub as { status?: string; currentPeriodEnd?: unknown; cancelAtPeriodEnd?: boolean } | null,
  }
  const location = (d.location || {}) as Record<string, unknown>
  const appConfig = (d.appConfig || null) as Record<string, unknown> | null
  return {
    id,
    nombre: String(d.name || '(sin nombre)'),
    subdominio: String(d.subdomain || ''),
    logo: (d.logo as string) || undefined,
    whatsapp: (d.whatsapp as string) || undefined,
    pais: ((location.country as string) || (d.country as string) || '').toUpperCase() || undefined,
    moneda: (d.currency as string) || undefined,
    ownerId: (d.ownerId as string) || undefined,
    plan: normalizarPlan(d.plan as string),
    planEfectivo: planEfectivo(datosPlan),
    estado: estadoComercial(datosPlan),
    vence: fechaVencimiento(datosPlan),
    creada: aFecha(d.createdAt),
    actualizada: aFecha(d.updatedAt),
    enLinea: aFecha(d.lastOnlineAt),
    stripeCustomerId: (sub?.stripeCustomerId as string) || undefined,
    stripeSubscriptionId: (sub?.stripeSubscriptionId as string) || undefined,
    stripeStatus: (sub?.status as string) || undefined,
    cancelaAlVencer: !!sub?.cancelAtPeriodEnd,
    tieneApp: !!appConfig && appConfig.status !== 'none' && !!appConfig.status,
    dominio: ((d.customDomain as Record<string, unknown> | undefined)?.domain as string) || (typeof d.customDomain === 'string' ? d.customDomain : undefined),
    crudo: d,
  }
}

function armarUsuario(id: string, d: Record<string, unknown>): AdminUsuario {
  const nombre = [d.firstName, d.lastName].filter(Boolean).join(' ') || String(d.displayName || d.name || '')
  return {
    id,
    email: String(d.email || ''),
    nombre,
    telefono: (d.phone as string) || undefined,
    creado: aFecha(d.createdAt),
    storeId: (d.storeId as string) || undefined,
    stripeCustomerId: (d.stripeCustomerId as string) || undefined,
  }
}

let tiendasCache: Promise<AdminTienda[]> | null = null
let usuariosCache: Promise<AdminUsuario[]> | null = null

export function cargarTiendas(forzar = false): Promise<AdminTienda[]> {
  if (!tiendasCache || forzar) {
    tiendasCache = getDocs(collection(db, 'stores'))
      .then(snap => snap.docs.map(doc => armarTienda(doc.id, doc.data())))
      .catch(err => { tiendasCache = null; throw err })
  }
  return tiendasCache
}

export function cargarUsuarios(forzar = false): Promise<AdminUsuario[]> {
  if (!usuariosCache || forzar) {
    usuariosCache = getDocs(collection(db, 'users'))
      .then(snap => snap.docs.map(doc => armarUsuario(doc.id, doc.data())))
      .catch(err => { usuariosCache = null; throw err })
  }
  return usuariosCache
}

/** Tras escribir una tienda (cambio de plan, sync), la próxima lectura va al servidor. */
export function invalidarTiendas() {
  tiendasCache = null
}

/** Mapa ownerId → usuario, para mostrar el dueño de cada tienda. */
export async function mapaDuenos(forzar = false): Promise<Map<string, AdminUsuario>> {
  const usuarios = await cargarUsuarios(forzar)
  return new Map(usuarios.map(u => [u.id, u]))
}
