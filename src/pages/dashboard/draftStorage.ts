import type { Product } from '../../types'

/**
 * Copia del borrador del editor en vivo en el navegador, para ofrecer
 * recuperarlo si se cierra la pestana o se recarga sin guardar. Es solo una
 * comodidad: si el navegador no deja guardar (modo privado, sin espacio),
 * el editor funciona igual.
 */
export interface StoredDraft {
  changes: Record<string, unknown>
  productEdits: Record<string, Partial<Product>>
  savedAt: number
}

const key = (storeId: string) => `sf-live-draft:${storeId}`
/** JSON pierde los `undefined` ("volver al color del tema"): se guardan con esta marca. */
const UNDEFINED = { __sfUndefined: true }

const encode = (value: unknown): unknown => {
  if (value === undefined) return UNDEFINED
  if (Array.isArray(value)) return value.map(encode)
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)]))
  }
  return value
}

const decode = (value: unknown): unknown => {
  if (value && typeof value === 'object' && (value as Record<string, unknown>).__sfUndefined === true) return undefined
  if (Array.isArray(value)) return value.map(decode)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decode(v)]))
  }
  return value
}

export function saveDraft(storeId: string, draft: Omit<StoredDraft, 'savedAt'>) {
  try {
    localStorage.setItem(key(storeId), JSON.stringify(encode({ ...draft, savedAt: Date.now() })))
  } catch {
    // Sin almacenamiento: no hay recuperacion, nada mas.
  }
}

export function loadDraft(storeId: string): StoredDraft | null {
  try {
    const raw = localStorage.getItem(key(storeId))
    if (!raw) return null
    const draft = decode(JSON.parse(raw)) as StoredDraft
    const empty = !Object.keys(draft.changes || {}).length && !Object.keys(draft.productEdits || {}).length
    return empty ? null : draft
  } catch {
    return null
  }
}

export function clearDraft(storeId: string) {
  try {
    localStorage.removeItem(key(storeId))
  } catch {
    // idem
  }
}
