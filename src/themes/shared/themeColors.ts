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
