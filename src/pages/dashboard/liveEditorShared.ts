import type { Store } from '../../types'
import type { ThemeBaseColors } from '../../components/catalog/liveEditContext'
import type { SectionsInfo } from '../../components/catalog/sectionLayout'

/**
 * Piezas que comparten el editor en vivo (/dashboard/editor) y su vista de
 * celular (/editor-preview, que corre dentro de un iframe).
 */

export type ImageField = 'logo' | 'logoLandscape' | 'heroImage' | 'heroImageMobile'

/** Que imagen de la tienda se toco en la vista previa, o null si no fue una imagen editable. */
export function imageFieldFromClick(target: HTMLElement, store: Store | null): ImageField | null {
  const hero = target.closest<HTMLElement>('[data-sf-hero]')
  if (hero) {
    const src = hero.dataset.sfHero
    return src === store?.heroImageMobile && src !== store?.heroImage ? 'heroImageMobile' : 'heroImage'
  }
  if (target.tagName === 'IMG' && target.closest('header, footer')) {
    return store?.logoLandscape ? 'logoLandscape' : 'logo'
  }
  return null
}

/**
 * Deja los datos listos para postMessage: los Timestamp de Firestore no
 * sobreviven la copia (llegan sin .toDate()), asi que se pasan a Date antes.
 */
export function toCloneable<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Date) return value
  const maybe = value as unknown as { toDate?: () => Date }
  if (typeof maybe.toDate === 'function') return maybe.toDate() as unknown as T
  if (Array.isArray(value)) return value.map(toCloneable) as unknown as T
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toCloneable(v)])) as T
}

/** Mensajes entre el editor y el iframe. Solo se aceptan del mismo origen. */
export type PreviewMessage =
  | { type: 'sf-ready' }
  | { type: 'sf-state'; store: Store; products: unknown[]; categories: unknown[] }
  | { type: 'sf-change'; path: string; value: string }
  | { type: 'sf-pick-image'; field: ImageField }
  | { type: 'sf-history'; action: 'undo' | 'redo' }
  | { type: 'sf-edit-product'; productId: string }
  | { type: 'sf-theme-info'; colors: ThemeBaseColors }
  | { type: 'sf-sections-info'; info: SectionsInfo }

/** Atajo de deshacer/rehacer, fuera de campos de texto (ahi manda el del navegador). */
export function historyActionFromKey(e: KeyboardEvent): 'undo' | 'redo' | null {
  if (!(e.metaKey || e.ctrlKey)) return null
  if ((e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable]')) return null
  const key = e.key.toLowerCase()
  if (key === 'z' && !e.shiftKey) return 'undo'
  if ((key === 'z' && e.shiftKey) || key === 'y') return 'redo'
  return null
}
