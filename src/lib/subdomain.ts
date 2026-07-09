/**
 * Subdominios de tiendas: validación, unicidad y gestión en Vercel.
 *
 * La unicidad REAL vive en la colección /subdomains de Firestore: cada tienda
 * reclama su doc `/subdomains/{sub}` y las reglas niegan update sobre docs
 * existentes — bajo una carrera, exactamente un registrante gana el claim.
 * Los checks de este módulo son la capa de UX (elegir un nombre libre antes
 * de escribir nada); storeService.create reclama ANTES de crear la tienda.
 */

import { doc, getDoc } from 'firebase/firestore'
import { db, storeService } from './firebase'

const VERCEL_PROJECT_ID = import.meta.env.VITE_VERCEL_PROJECT_ID || 'prj_YgKbAHmwKcCff31cek9QUWknSiAX'
const VERCEL_TOKEN = import.meta.env.VITE_VERCEL_TOKEN

// Palabras de infraestructura/producto que nunca pueden ser subdominio de
// tienda. Match exacto contra el slug base (variantes sufijadas como
// "api-2" sí se permiten).
export const RESERVED_SUBDOMAINS = new Set([
  'www', 'api', 'app', 'admin', 'dashboard', 'mail', 'email', 'smtp', 'ftp',
  'blog', 'help', 'support', 'status', 'docs', 'dev', 'staging', 'test',
  'demo', 'cdn', 'static', 'assets', 'media', 'img', 'images', 'files',
  'pay', 'payment', 'payments', 'checkout', 'billing',
  'shopifree', 'vercel', 'firebase', 'ns1', 'ns2', 'mx',
])

/**
 * Valida el formato de un subdominio
 */
export function validateSubdomain(subdomain: string): true | string {
  const subdomainRegex = /^[a-zA-Z0-9-]+$/

  if (!subdomain.trim()) {
    return 'El subdominio no puede estar vacío'
  }

  if (!subdomainRegex.test(subdomain)) {
    return 'El subdominio solo puede contener letras, números y guiones'
  }

  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    return 'El subdominio no puede empezar ni terminar con un guión'
  }

  if (subdomain.length < 3) {
    return 'El subdominio debe tener al menos 3 caracteres'
  }

  if (subdomain.length > 63) {
    return 'El subdominio no puede tener más de 63 caracteres'
  }

  if (RESERVED_SUBDOMAINS.has(subdomain.toLowerCase())) {
    return 'Este subdominio está reservado, elige otro'
  }

  return true
}

const randomSuffix = () => Math.random().toString(36).slice(2, 6)

/**
 * true cuando ningún otro negocio usa este subdominio. Consulta tanto el
 * registro /subdomains (el lock) como la colección stores (tiendas legacy
 * anteriores al registro). Ambos son legibles públicamente por reglas.
 */
export async function isSubdomainAvailable(subdomain: string): Promise<boolean> {
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return false
  const claim = await getDoc(doc(db, 'subdomains', subdomain))
  if (claim.exists()) return false
  const existing = await storeService.getBySubdomain(subdomain)
  return existing === null
}

/**
 * Resuelve un subdominio usable y disponible para una tienda nueva, sin
 * bloquear jamás el registro:
 *  - slug vacío ("百货店", "!!!") → cae a "mitienda-xxxx"
 *  - reservado u ocupado → prueba "-2".."-5" y luego sufijos aleatorios
 * Lanza SUBDOMAIN_UNAVAILABLE solo en el caso patológico de agotar candidatos.
 */
export async function resolveAvailableSubdomain(storeName: string): Promise<string> {
  const base = generateSubdomain(storeName).slice(0, 40).replace(/-$/, '') || `mitienda-${randomSuffix()}`

  const candidates = [
    base,
    ...[2, 3, 4, 5].map(n => `${base}-${n}`),
    `${base}-${randomSuffix()}`,
    `${base}-${randomSuffix()}`,
  ]

  for (const candidate of candidates) {
    if (await isSubdomainAvailable(candidate)) return candidate
  }
  throw new Error('SUBDOMAIN_UNAVAILABLE')
}

/**
 * Genera un slug válido a partir del nombre del negocio
 */
export function generateSubdomain(businessName: string): string {
  return businessName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 63)
}

/**
 * Crea un subdominio en Vercel
 * Nota: En producción, esto debería hacerse desde un backend/API route
 * para no exponer el token de Vercel en el cliente
 */
export async function createSubdomain(subdomain: string): Promise<boolean> {
  const validation = validateSubdomain(subdomain)
  if (validation !== true) {
    throw new Error(validation)
  }

  if (!VERCEL_TOKEN) {
    console.error('[Subdomain] VERCEL_TOKEN no configurado')
    // En desarrollo, simular que se creó el subdominio
    if (import.meta.env.DEV) {
      console.log('[Subdomain] Modo desarrollo: simulando creación de subdominio')
      return true
    }
    throw new Error('Token de Vercel no configurado')
  }

  const domainName = `${subdomain}.shopifree.app`
  console.log('[Subdomain] Creando:', domainName)

  try {
    const response = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: domainName })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `Error HTTP ${response.status}`
      console.error('[Subdomain] Error de Vercel API:', errorMessage)
      throw new Error(`Error al crear el subdominio: ${errorMessage}`)
    }

    const result = await response.json()

    if (result.error) {
      throw new Error(`Error de Vercel: ${result.error.message || result.error}`)
    }

    console.log('[Subdomain] Creado exitosamente:', domainName)
    return true

  } catch (error) {
    console.error('[Subdomain] Error:', error)
    throw error
  }
}

/**
 * Elimina un subdominio de Vercel
 */
export async function deleteSubdomain(subdomain: string): Promise<boolean> {
  if (!VERCEL_TOKEN) {
    console.error('[Subdomain] VERCEL_TOKEN no configurado')
    if (import.meta.env.DEV) {
      console.log('[Subdomain] Modo desarrollo: simulando eliminación de subdominio')
      return true
    }
    return false
  }

  const domainName = `${subdomain}.shopifree.app`
  console.log('[Subdomain] Eliminando:', domainName)

  try {
    const response = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${domainName}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`
        }
      }
    )

    if (!response.ok && response.status !== 404) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[Subdomain] Error eliminando:', errorData)
      return false
    }

    console.log('[Subdomain] Eliminado exitosamente:', domainName)
    return true

  } catch (error) {
    console.error('[Subdomain] Error eliminando:', error)
    return false
  }
}

/**
 * Verifica si un subdominio ya existe en Vercel
 */
export async function checkSubdomainExists(subdomain: string): Promise<boolean> {
  if (!VERCEL_TOKEN) {
    console.error('[Subdomain] VERCEL_TOKEN no configurado')
    return false
  }

  try {
    const domainName = `${subdomain}.shopifree.app`
    console.log('[Subdomain] Verificando:', domainName)

    const response = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`, {
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`
      }
    })

    if (!response.ok) {
      console.error('[Subdomain] Error obteniendo dominios')
      return false
    }

    const data = await response.json() as { domains?: Array<{ name: string }> }
    const domains = data.domains || []

    const exists = domains.some(domain => domain.name === domainName)
    console.log('[Subdomain]', domainName, exists ? 'existe' : 'no existe')

    return exists

  } catch (error) {
    console.error('[Subdomain] Error verificando:', error)
    return false
  }
}

/**
 * Verifica que el token de Vercel esté funcionando
 */
export async function verifyVercelToken(): Promise<boolean> {
  if (!VERCEL_TOKEN) {
    console.error('[Subdomain] VERCEL_TOKEN no configurado')
    return false
  }

  try {
    const response = await fetch('https://api.vercel.com/v2/user', {
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`
      }
    })

    if (response.ok) {
      const user = await response.json()
      console.log('[Subdomain] Token válido para:', user.username || user.email)
      return true
    }

    console.error('[Subdomain] Token inválido')
    return false

  } catch (error) {
    console.error('[Subdomain] Error verificando token:', error)
    return false
  }
}

/**
 * Obtiene todos los dominios del proyecto
 */
export async function getProjectDomains(): Promise<Array<{ name: string }> | null> {
  if (!VERCEL_TOKEN) {
    console.error('[Subdomain] VERCEL_TOKEN no configurado')
    return null
  }

  try {
    const response = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`, {
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`
      }
    })

    if (!response.ok) {
      console.error('[Subdomain] Error obteniendo dominios')
      return null
    }

    const data = await response.json() as { domains?: Array<{ name: string }> }
    return data.domains || []

  } catch (error) {
    console.error('[Subdomain] Error:', error)
    return null
  }
}
