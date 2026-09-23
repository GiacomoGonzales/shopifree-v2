import type { Store } from '../../types'

/**
 * Colores del header (y del footer) elegidos en el editor en vivo. Se guardan por tema
 * (themeSettings.headerColors.<themeId>): cada tema tiene su propio diseno, asi
 * que al cambiar de tema se ven los colores originales del nuevo, y al volver
 * siguen los que el dueno eligio para ese.
 */
export function getHeaderColors(store: Pick<Store, 'themeId' | 'themeSettings'>) {
  return store.themeSettings?.headerColors?.[store.themeId || 'minimal'] || {}
}

/** Igual que getHeaderColors, para el footer. */
export function getFooterColors(store: Pick<Store, 'themeId' | 'themeSettings'>) {
  return store.themeSettings?.footerColors?.[store.themeId || 'minimal'] || {}
}

/** Color principal elegido en el editor en vivo para el tema activo (botones, precios, categorias). */
export function getPrimaryColor(store: Pick<Store, 'themeId' | 'themeSettings'>): string | undefined {
  return store.themeSettings?.primaryColors?.[store.themeId || 'minimal']
}

/**
 * Texto legible sobre un color de fondo: negro o blanco segun su luminancia.
 * Hace falta porque el dueno puede elegir un principal claro (amarillo) sobre
 * el que el texto blanco del tema no se leeria.
 */
export function readableTextOn(hex: string): string {
  return luminance(hex) > 0.45 ? '#111111' : '#ffffff'
}

/** Luminancia relativa (0 = negro, 1 = blanco). Un color invalido cuenta como blanco. */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex)
  if (!m) return 1
  const full = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1]
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255)
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Fondo oscuro (lleva texto claro). */
export const isDarkColor = (hex: string) => luminance(hex) < 0.2

/** Fondo de pagina elegido en el editor en vivo para el tema activo. */
export function getBackgroundColor(store: Pick<Store, 'themeId' | 'themeSettings'>): string | undefined {
  return store.themeSettings?.backgroundColors?.[store.themeId || 'minimal']
}

/** Color de las superficies (tarjetas, ficha de producto, carrito, checkout) para el tema activo. */
export function getSurfaceColor(store: Pick<Store, 'themeId' | 'themeSettings'>): string | undefined {
  return store.themeSettings?.surfaceColors?.[store.themeId || 'minimal']
}

/** Color de texto de las piezas compartidas para el tema activo. */
export function getTextColor(store: Pick<Store, 'themeId' | 'themeSettings'>): string | undefined {
  return store.themeSettings?.textColors?.[store.themeId || 'minimal']
}

/** Contraste WCAG entre dos colores (1 = iguales, 21 = negro sobre blanco). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Colores de la barra de categorias elegidos para el tema activo. */
export function getCategoryBarColors(store: Pick<Store, 'themeId' | 'themeSettings'>) {
  return store.themeSettings?.categoryBarColors?.[store.themeId || 'minimal'] || {}
}

/**
 * Redondez de esquinas. Las piezas compartidas (tarjetas, botones, ficha del
 * producto, carrito, checkout, pastillas) leen theme.radius: se reemplaza entero.
 */
export const CORNER_STYLES = {
  square: { sm: '0', md: '0', lg: '0', xl: '0', full: '0.25rem' },
  soft: { sm: '0.375rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', full: '9999px' },
  round: { sm: '0.75rem', md: '1rem', lg: '1.5rem', xl: '2rem', full: '9999px' },
} as const

export type CornerStyle = keyof typeof CORNER_STYLES

export function getCornerStyle(store: Pick<Store, 'themeId' | 'themeSettings'>): CornerStyle | undefined {
  const id = store.themeSettings?.cornerStyles?.[store.themeId || 'minimal']
  return id && id in CORNER_STYLES ? (id as CornerStyle) : undefined
}
