/**
 * Tipos y utilidades de la sección Apps del admin (antes todo vivía dentro
 * de pages/admin/AppBuilds.tsx). Lo comparten la tabla, los modales y la
 * vista de una app.
 */
import { auth } from '../../../lib/firebase'
import { apiUrl } from '../../../utils/apiBase'
import { transformR2 } from '../../../utils/media'

export type EstadoBuild = 'idle' | 'queued' | 'running' | 'success' | 'failed'

export interface BuildInfo {
  status?: EstadoBuild
  runUrl?: string
  artifactUrl?: string
  artifactName?: string
  buildNumber?: number
  versionName?: string
  lastError?: string
  startedAt?: unknown
  finishedAt?: unknown
}

export interface AppConfig {
  appName?: string
  /** Logo 1024×1024 subido solo para la app (PNG, ver MiApp.tsx). */
  icon?: string
  primaryColor?: string
  secondaryColor?: string
  splashColor?: string
  status?: 'none' | 'requested' | 'building' | 'published'
  androidUrl?: string
  iosUrl?: string
  androidIsTesting?: boolean
  publishedAt?: unknown
  /** Build de Android. */
  build?: BuildInfo
  buildIos?: BuildInfo
  publishInfo?: { testers?: string[] }
  screenshots?: {
    status?: EstadoBuild
    urls?: string[]
    generatedAt?: unknown
    runUrl?: string
    lastError?: string
  }
}

export interface TiendaApp {
  id: string
  name: string
  subdomain: string
  logo?: string
  /** Contacto de la tienda (no el del usuario dueño). */
  email?: string
  whatsapp?: string
  plan?: string
  appConfig?: AppConfig
}

export type Plataforma = 'android' | 'ios'

// Un estado es una palabra: solo "Falló" va en rojo.
export const ETIQUETA_BUILD: Record<EstadoBuild, string> = {
  idle: 'Sin build',
  queued: 'En cola',
  running: 'Compilando',
  success: 'Listo',
  failed: 'Falló',
}
export const TONO_BUILD: Record<EstadoBuild, 'normal' | 'tenue' | 'rojo'> = {
  idle: 'tenue',
  queued: 'tenue',
  running: 'normal',
  success: 'normal',
  failed: 'rojo',
}

export const ETIQUETA_SOLICITUD: Record<string, string> = {
  none: 'Descartada',
  requested: 'Solicitada',
  building: 'En construcción',
  published: 'Publicada',
}

export function buildDe(t: TiendaApp, p: Plataforma): BuildInfo | undefined {
  return p === 'ios' ? t.appConfig?.buildIos : t.appConfig?.build
}

export function estadoBuild(b?: BuildInfo): EstadoBuild {
  return b?.status || 'idle'
}

export function compilando(b?: BuildInfo): boolean {
  const s = b?.status
  return s === 'queued' || s === 'running'
}

/** "v1.2.0 (#14)" o vacío si nunca compiló. */
export function textoVersion(b?: BuildInfo): string {
  if (!b?.buildNumber) return ''
  return `v${b.versionName || ''} (#${b.buildNumber})`
}

// Solo se mira appConfig.status (no builds ni URLs) para que "Descartar"
// funcione siempre: con status='none' la app sale de Activas y Completadas
// pero sigue en Todas con sus datos intactos por si hay que recuperarla.
export const esActiva = (t: TiendaApp) => t.appConfig?.status === 'requested' || t.appConfig?.status === 'building'
export const esCompletada = (t: TiendaApp) => t.appConfig?.status === 'published'
export const sePuedeDescartar = (t: TiendaApp) => esActiva(t) || esCompletada(t)

export function nombrePaquete(subdominio: string): string {
  return `app.shopifree.store.${subdominio.replace(/[^a-z0-9]/gi, '')}`
}

// Ícono 512×512 con relleno transparente que pide Play Console (Ficha de
// tienda → Ícono). Play exige PNG de 32 bits y Cloudflare NO convierte a PNG
// al entregar (ignora `format=png` y conserva el formato de origen, verificado
// el 01/08/2026); por eso el ícono se sube ya en PNG desde MiApp.tsx y aquí
// solo se redimensiona. Si no se puede transformar se devuelve el original
// para no romper la pantalla.
export function icono512(url: string): string {
  return transformR2(url, 'width=512,height=512,fit=pad,background=transparent') || url
}

// Normaliza un hex a #rrggbb (expande #abc) y cae al respaldo si viene vacío o
// malformado, para que la URL de transformación siempre sea válida.
function normalizarHex(hex: string | undefined, respaldo: string): string {
  const crudo = (hex ?? respaldo).replace('#', '').trim()
  const largo = crudo.length === 3 ? crudo.split('').map(c => c + c).join('') : crudo
  const valido = /^[0-9a-fA-F]{6}$/.test(largo) ? largo : respaldo.replace('#', '')
  return `#${valido.toLowerCase()}`
}

// Gráfico de funciones 1024×500 de Play: el ícono (cuadrado) escalado a 500 de
// alto y centrado, con el resto relleno del color de marca. Play acepta JPEG o
// PNG de 24 bits aquí, así que da igual que Cloudflare aplane a JPEG. Se
// prefiere primaryColor; splashColor solo si el primario es el default de
// Shopifree (el splash suele ser blanco y dejaría el banner plano).
export function graficoFunciones(url: string | undefined, primario: string | undefined, splash: string | undefined): string | null {
  if (!url) return null
  const RESPALDO = '#1e3a5f'
  const esDefault = (primario || '').toLowerCase() === RESPALDO
  const elegido = esDefault && splash && splash.toLowerCase() !== '#ffffff' ? splash : (primario || splash || RESPALDO)
  // El # va escapado: sin encodear, Cloudflare corta la URL en el fragmento.
  return transformR2(url, `width=1024,height=500,fit=pad,background=${encodeURIComponent(normalizarHex(elegido, RESPALDO))}`)
}

/**
 * POST a un endpoint del admin con el ID token. Algunos fallos (404 en medio
 * de un deploy, timeouts del edge, la función que muere antes de responder)
 * vuelven con cuerpo vacío o HTML y .json() revienta: se lee como texto y se
 * intenta parsear, cayendo al statusText para que el error diga algo útil.
 */
export async function postAdmin<T = Record<string, unknown>>(ruta: string, cuerpo?: unknown): Promise<T> {
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new Error('Sesión vencida, vuelve a entrar')
  const res = await fetch(apiUrl(ruta), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  const crudo = await res.text()
  let datos: Record<string, unknown> = {}
  try { if (crudo) datos = JSON.parse(crudo) } catch { /* cuerpo no JSON */ }
  if (!res.ok) throw new Error(String(datos.detail || datos.error || res.statusText || `HTTP ${res.status}`))
  return datos as T
}

export function mensajeError(err: unknown): string {
  return err instanceof Error ? err.message : 'Error desconocido'
}
