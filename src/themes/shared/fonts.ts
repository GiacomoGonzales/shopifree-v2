import type { Store } from '../../types'

/**
 * Tipografias para titulos que se pueden elegir en el editor en vivo. Lista
 * cerrada a proposito: el valor termina en CSS y en una URL de Google Fonts,
 * asi que solo se aceptan estos ids.
 */
export const HEADING_FONTS = [
  { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", google: 'Playfair+Display:wght@400;600;700' },
  { id: 'lora', label: 'Lora', family: "'Lora', serif", google: 'Lora:wght@400;600;700' },
  { id: 'dm-serif', label: 'DM Serif Display', family: "'DM Serif Display', serif", google: 'DM+Serif+Display' },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", google: 'Montserrat:wght@400;600;700;800' },
  { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif", google: 'Poppins:wght@400;600;700' },
  { id: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif", google: 'Raleway:wght@400;600;700' },
  { id: 'space-grotesk', label: 'Space Grotesk', family: "'Space Grotesk', sans-serif", google: 'Space+Grotesk:wght@400;600;700' },
  { id: 'oswald', label: 'Oswald', family: "'Oswald', sans-serif", google: 'Oswald:wght@400;600;700' },
  { id: 'bebas', label: 'Bebas Neue', family: "'Bebas Neue', sans-serif", google: 'Bebas+Neue' },
  { id: 'pacifico', label: 'Pacifico', family: "'Pacifico', cursive", google: 'Pacifico' },
] as const

export type HeadingFont = (typeof HEADING_FONTS)[number]

export const googleFontUrl = (font: HeadingFont) => `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`

/** Tipografia de titulos elegida para el tema activo, si hay una valida. */
export function getHeadingFont(store: Pick<Store, 'themeId' | 'themeSettings'>): HeadingFont | undefined {
  const id = store.themeSettings?.headingFonts?.[store.themeId || 'minimal']
  return HEADING_FONTS.find(f => f.id === id)
}
