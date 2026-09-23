import type { Store } from '../../types'

/**
 * Tipografias que se pueden elegir en el editor en vivo. Listas cerradas a
 * proposito: el valor termina en CSS y en una URL de Google Fonts, asi que
 * solo se aceptan estos ids.
 */
interface FontOption {
  id: string
  label: string
  family: string
  google: string
  /**
   * Decorativa: se lee bien en grande pero no en un nombre largo y chico. Se
   * usa solo en titulos y en el nombre de la tienda; la tarjeta, la ficha del
   * producto, el carrito y el checkout (marcados con data-sf-ui) no la reciben.
   */
  decorative?: boolean
}

/** Para titulos y el nombre de la tienda. */
export const HEADING_FONTS: readonly FontOption[] = [
  { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", google: 'Playfair+Display:wght@400;600;700' },
  { id: 'lora', label: 'Lora', family: "'Lora', serif", google: 'Lora:wght@400;600;700' },
  { id: 'dm-serif', label: 'DM Serif Display', family: "'DM Serif Display', serif", google: 'DM+Serif+Display' },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", google: 'Montserrat:wght@400;600;700;800' },
  { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif", google: 'Poppins:wght@400;600;700' },
  { id: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif", google: 'Raleway:wght@400;600;700' },
  { id: 'space-grotesk', label: 'Space Grotesk', family: "'Space Grotesk', sans-serif", google: 'Space+Grotesk:wght@400;600;700' },
  { id: 'oswald', label: 'Oswald', family: "'Oswald', sans-serif", google: 'Oswald:wght@400;600;700', decorative: true },
  { id: 'bebas', label: 'Bebas Neue', family: "'Bebas Neue', sans-serif", google: 'Bebas+Neue', decorative: true },
  { id: 'pacifico', label: 'Pacifico', family: "'Pacifico', cursive", google: 'Pacifico', decorative: true },
]

/** Para el texto general (descripciones, precios, botones, formularios): legibles en tamano chico. */
export const BODY_FONTS: readonly FontOption[] = [
  { id: 'inter', label: 'Inter', family: "'Inter', sans-serif", google: 'Inter:wght@400;500;600;700' },
  { id: 'dm-sans', label: 'DM Sans', family: "'DM Sans', sans-serif", google: 'DM+Sans:wght@400;500;700' },
  { id: 'lato', label: 'Lato', family: "'Lato', sans-serif", google: 'Lato:wght@400;700' },
  { id: 'nunito', label: 'Nunito', family: "'Nunito', sans-serif", google: 'Nunito:wght@400;600;700' },
  { id: 'work-sans', label: 'Work Sans', family: "'Work Sans', sans-serif", google: 'Work+Sans:wght@400;500;600' },
  { id: 'source-serif', label: 'Source Serif', family: "'Source Serif 4', serif", google: 'Source+Serif+4:wght@400;600' },
]

export type HeadingFont = FontOption
export type BodyFont = FontOption

/** Combinaciones probadas de titulo + texto, para elegir en un clic. */
export const FONT_PAIRS = [
  { id: 'elegant', heading: 'playfair', body: 'lato' },
  { id: 'modern', heading: 'montserrat', body: 'inter' },
  { id: 'friendly', heading: 'poppins', body: 'nunito' },
  { id: 'editorial', heading: 'dm-serif', body: 'dm-sans' },
  { id: 'classic', heading: 'lora', body: 'source-serif' },
  { id: 'bold', heading: 'bebas', body: 'work-sans' },
] as const

/** Una sola hoja de Google Fonts para todas las tipografias elegidas. */
export const googleFontsUrl = (fonts: FontOption[]) =>
  `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${f.google}`).join('&')}&display=swap`

const themeKey = (store: Pick<Store, 'themeId'>) => store.themeId || 'minimal'

/** Tipografia de titulos elegida para el tema activo, si hay una valida. */
export function getHeadingFont(store: Pick<Store, 'themeId' | 'themeSettings'>): HeadingFont | undefined {
  const id = store.themeSettings?.headingFonts?.[themeKey(store)]
  return HEADING_FONTS.find(f => f.id === id)
}

/** Tipografia del texto general elegida para el tema activo, si hay una valida. */
export function getBodyFont(store: Pick<Store, 'themeId' | 'themeSettings'>): BodyFont | undefined {
  const id = store.themeSettings?.bodyFonts?.[themeKey(store)]
  return BODY_FONTS.find(f => f.id === id)
}

/**
 * CSS de las tipografias elegidas. Los temas ponen fuentes a mano en muchos
 * elementos, asi que se pisan con !important:
 * - Titulos (h1-h3) y el nombre de la tienda: la de titulos. Si es decorativa,
 *   no en la compra (tarjetas, ficha, carrito, checkout, buscador).
 * - Todo lo demas: la del texto. Lo que ya lleva la de titulos queda afuera.
 */
export function fontOverridesCss(heading?: HeadingFont, body?: BodyFont): string {
  const titles = ':is(h1,h2,h3,[data-sf-text="name"])'
  const headingTargets = heading?.decorative ? `${titles}:not([data-sf-ui],[data-sf-ui] *)` : titles
  const rules: string[] = []
  if (heading) rules.push(`[data-sf-store] ${headingTargets}{font-family:${heading.family}!important}`)
  if (body) {
    // Sin tipografia de titulos, los titulos conservan la del tema.
    const keep = heading ? headingTargets : titles
    rules.push(`[data-sf-store] *:not(${keep},${keep} *){font-family:${body.family}!important}`)
  }
  return rules.join('\n')
}
