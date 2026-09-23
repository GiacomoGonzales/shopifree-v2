import type { Store } from '../../types'

/**
 * Mostrar, ocultar y ordenar las secciones de la tienda (editor en vivo).
 *
 * Cada tema arma su pagina con sus propios bloques, pero casi todos lo hacen
 * como una lista de hijos directos del contenedor min-h-screen: anuncio,
 * header, portada, insignias, oferta flash, categorias, productos y footer.
 * Las piezas compartidas llevan una marca (data-sf-section, data-sf-products,
 * data-sf-hero-img); aca se reconoce a que seccion pertenece cada hijo y se
 * aplica el orden con `order` de flexbox, sin tocar los 87 temas.
 *
 * Lo que no se reconoce (separadores, marquesinas decorativas) viaja con la
 * seccion que tiene antes, para que no quede suelto. Si un tema mete varias
 * secciones en un mismo bloque (los temas "objeto": ticket, ventana, etc.),
 * no se puede ordenar; ocultar la portada y las categorias si.
 */

/** Secciones que se pueden mover, en el orden de siempre. */
export const MOVABLE_SECTIONS = ['hero', 'trust', 'flash', 'categories', 'products'] as const
export type SectionId = (typeof MOVABLE_SECTIONS)[number]
/** Secciones que se pueden ocultar desde aca (insignias y oferta tienen su propio interruptor). */
export const HIDEABLE_SECTIONS: readonly SectionId[] = ['hero', 'categories']

export interface SectionLayout {
  order?: SectionId[]
  hidden?: SectionId[]
}

/** Lo que el tema en pantalla le informa al editor. */
export interface SectionsInfo {
  /** Secciones que este tema tiene (en su orden original). */
  available: SectionId[]
  /** Si sus secciones son bloques separados que se pueden reordenar. */
  reorderable: boolean
  /** Las que se pueden ocultar: tienen su propio bloque (en los temas "objeto" la portada va pegada a los productos). */
  hideable: SectionId[]
}

const isSectionId = (v: string): v is SectionId => (MOVABLE_SECTIONS as readonly string[]).includes(v)

/** Configuracion del tema activo, solo con ids validos (vienen de la base). */
export function getSectionLayout(store: Pick<Store, 'themeId' | 'themeSettings'>): SectionLayout {
  const raw = store.themeSettings?.sectionLayouts?.[store.themeId || 'minimal']
  return { order: raw?.order?.filter(isSectionId), hidden: raw?.hidden?.filter(isSectionId) }
}

type Kind = SectionId | 'announcement' | 'header' | 'footer'

/** A que secciones pertenece un hijo del contenedor (puede ser mas de una: bloque mixto). */
function kindsOf(el: Element): Kind[] {
  const has = (sel: string) => el.matches(sel) || !!el.querySelector(sel)
  const kinds: Kind[] = []
  if (has('[data-sf-section="announcement"]')) kinds.push('announcement')
  if (has('[data-sf-section="trust"]')) kinds.push('trust')
  if (has('[data-sf-section="flash"]')) kinds.push('flash')
  if (has('[data-sf-section="categories"]')) kinds.push('categories')
  if (has('[data-sf-products]')) kinds.push('products')
  if (el.tagName === 'FOOTER' || el.querySelector('footer')) kinds.push('footer')
  const isHeader = el.tagName === 'HEADER' || !!el.querySelector(':scope > header')
  if (isHeader) kinds.push('header')
  // Portada: la foto de portada o el titulo grande, fuera del header y de los productos.
  if (!isHeader && !kinds.includes('products') && has('img[data-sf-hero-img], h1')) kinds.push('hero')
  return kinds
}

const MARK = 'sfLayout'

/** Deshace lo que se aplico antes (para volver a aplicar, o cuando no hay configuracion). */
function reset(root: HTMLElement) {
  if (root.dataset[MARK]) {
    root.style.display = ''
    root.style.flexDirection = ''
    delete root.dataset[MARK]
  }
  for (const child of Array.from(root.children) as HTMLElement[]) {
    if (!child.dataset[MARK]) continue
    child.style.order = ''
    if (child.dataset[MARK] === 'hidden') child.style.display = ''
    delete child.dataset[MARK]
  }
}

/**
 * Reconoce las secciones del tema y aplica la configuracion. Devuelve que
 * secciones hay y si se pueden ordenar, para el panel del editor.
 */
export function applySectionLayout(root: HTMLElement, layout: SectionLayout): SectionsInfo {
  reset(root)
  const children = Array.from(root.children) as HTMLElement[]
  const classified = children.map(el => ({ el, kinds: kindsOf(el) }))

  const movable = (k: Kind): k is SectionId => (MOVABLE_SECTIONS as readonly string[]).includes(k)
  const available: SectionId[] = []
  let mixed = false
  for (const { kinds } of classified) {
    const own = kinds.filter(movable)
    if (own.length > 1) mixed = true
    for (const k of own) if (!available.includes(k)) available.push(k)
  }
  const productsAlone = classified.some(c => c.kinds.length === 1 && c.kinds[0] === 'products')
  const reorderable = !mixed && productsAlone
  const hideable = HIDEABLE_SECTIONS.filter(k => classified.some(c => c.kinds.filter(movable).length === 1 && c.kinds.includes(k)))

  // Ocultar (portada y categorias), tambien en temas que no se pueden ordenar.
  const hidden = new Set(layout.hidden || [])
  for (const { el, kinds } of classified) {
    const own = kinds.filter(movable)
    if (own.length === 1 && hidden.has(own[0]) && HIDEABLE_SECTIONS.includes(own[0])) {
      el.style.display = 'none'
      el.dataset[MARK] = 'hidden'
    }
  }

  // Ordenar: cada seccion recibe su lugar; lo no reconocido viaja con la seccion anterior.
  const order = layout.order?.filter(movable)
  const isDefault = !order || order.join() === available.filter(k => order.includes(k)).join()
  if (reorderable && order && !isDefault) {
    const slot = (k: SectionId) => {
      const i = order.indexOf(k)
      return 10 * (i === -1 ? order.length + MOVABLE_SECTIONS.indexOf(k) : i + 1)
    }
    root.style.display = 'flex'
    root.style.flexDirection = 'column'
    root.dataset[MARK] = '1'
    let current = 0
    for (const { el, kinds } of classified) {
      const own = kinds.filter(movable)
      if (own.length === 1) current = slot(own[0])
      else if (kinds.includes('footer')) current = 1000
      else if (kinds.includes('announcement') || kinds.includes('header')) current = 0
      el.style.order = String(current)
      if (!el.dataset[MARK]) el.dataset[MARK] = '1'
    }
  }

  return { available, reorderable, hideable }
}
