/**
 * Perfil compartido del cliente: stores/{storeId}/customers/{customerKey}
 * =======================================================================
 * Nota y etiquetas del CLIENTE (no de una conversación): las ve y edita tanto
 * la ficha de Clientes como el panel del cliente en ShopiChat, y como las dos
 * pantallas escuchan el doc en vivo quedan sincronizadas solas.
 *
 * La clave es `normalizeCustomerKey(phone)` (ver lib/customerKey). Las reglas
 * de Firestore ya dejan leer/escribir esta subcolección al dueño de la tienda.
 */
import { collection, doc, getDocs, limit, onSnapshot, query, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'

export interface CustomerProfile {
  phone: string
  name?: string
  notes: string
  tags: string[]
  updatedAt?: unknown
}

export const MAX_CUSTOMER_TAGS = 20
export const MAX_CUSTOMER_TAG_LENGTH = 30
export const MAX_CUSTOMER_NOTES = 2000

const profileRef = (storeId: string, key: string) => doc(db, 'stores', storeId, 'customers', key)

/** Escucha el perfil. `null` = todavía no existe (no se crea hasta guardar algo). */
export function subscribeCustomerProfile(
  storeId: string,
  key: string,
  onChange: (p: CustomerProfile | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    profileRef(storeId, key),
    snap => {
      if (!snap.exists()) { onChange(null); return }
      const d = snap.data() as Partial<CustomerProfile>
      onChange({
        phone: String(d.phone || ''),
        name: d.name || undefined,
        notes: typeof d.notes === 'string' ? d.notes : '',
        tags: Array.isArray(d.tags) ? d.tags.filter(x => typeof x === 'string') : [],
        updatedAt: d.updatedAt,
      })
    },
    error => {
      console.warn('[customers] perfil:', error.message)
      onError?.(error)
    }
  )
}

/** Guarda (crea o actualiza) nota y/o etiquetas. Se guarda también el teléfono y el nombre de referencia. */
export function saveCustomerProfile(
  storeId: string,
  key: string,
  data: { phone: string; name?: string | null; notes?: string; tags?: string[] }
) {
  const payload: Record<string, unknown> = { phone: data.phone, updatedAt: serverTimestamp() }
  if (data.name) payload.name = data.name.slice(0, 120)
  if (data.notes !== undefined) payload.notes = data.notes.slice(0, MAX_CUSTOMER_NOTES)
  if (data.tags !== undefined) {
    payload.tags = [...new Set(data.tags.map(t => t.trim().slice(0, MAX_CUSTOMER_TAG_LENGTH)).filter(Boolean))].slice(0, MAX_CUSTOMER_TAGS)
  }
  return setDoc(profileRef(storeId, key), payload, { merge: true })
}

// Las etiquetas ya usadas en la tienda, para sugerirlas. Se bajan una vez por
// sesión y tienda (la colección es chica: solo existen los perfiles editados).
const tagsCache = new Map<string, Promise<string[]>>()

export function storeCustomerTags(storeId: string): Promise<string[]> {
  let p = tagsCache.get(storeId)
  if (!p) {
    p = getDocs(query(collection(db, 'stores', storeId, 'customers'), limit(500)))
      .then(snap => {
        const set = new Set<string>()
        snap.forEach(d => {
          const tags = d.data().tags
          if (Array.isArray(tags)) tags.forEach(t => { if (typeof t === 'string' && t) set.add(t) })
        })
        return [...set].sort((a, b) => a.localeCompare(b))
      })
      .catch(() => {
        tagsCache.delete(storeId)
        return [] as string[]
      })
    tagsCache.set(storeId, p)
  }
  return p
}

/** Suma a la caché las etiquetas recién usadas (para sugerirlas en otra ficha sin recargar). */
export function rememberCustomerTags(storeId: string, tags: string[]) {
  const p = tagsCache.get(storeId)
  if (!p) return
  tagsCache.set(storeId, p.then(list => [...new Set([...list, ...tags])].sort((a, b) => a.localeCompare(b))))
}
