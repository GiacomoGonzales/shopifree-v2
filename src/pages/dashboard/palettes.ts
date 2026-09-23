/**
 * Paletas sugeridas del editor en vivo: combinaciones ya probadas de color
 * principal, header y footer, para quien no quiere armar los colores a mano.
 * Se aplican al tema activo (cada tema guarda sus colores).
 */
export interface Palette {
  id: string
  primary: string
  /** Fondo de pagina (claro). Solo se aplica en temas claros: en uno oscuro el texto no se leeria. */
  background: string
  header: { background: string; text: string }
  footer: { background: string; text: string }
}

export const PALETTES: Palette[] = [
  { id: 'classic', background: '#ffffff', primary: '#111827', header: { background: '#ffffff', text: '#111827' }, footer: { background: '#f9fafb', text: '#111827' } },
  { id: 'ocean', background: '#f0f9ff', primary: '#0e7490', header: { background: '#0f172a', text: '#e0f2fe' }, footer: { background: '#0f172a', text: '#e0f2fe' } },
  { id: 'terracotta', background: '#fffbf5', primary: '#c2410c', header: { background: '#fff7ed', text: '#7c2d12' }, footer: { background: '#7c2d12', text: '#fff7ed' } },
  { id: 'forest', background: '#f7fdf9', primary: '#166534', header: { background: '#f0fdf4', text: '#14532d' }, footer: { background: '#14532d', text: '#f0fdf4' } },
  { id: 'rose', background: '#fff7fb', primary: '#db2777', header: { background: '#fdf2f8', text: '#831843' }, footer: { background: '#831843', text: '#fdf2f8' } },
  { id: 'gold', background: '#fffdf5', primary: '#ca8a04', header: { background: '#0a0a0a', text: '#fde68a' }, footer: { background: '#0a0a0a', text: '#fde68a' } },
  { id: 'lavender', background: '#faf8ff', primary: '#7c3aed', header: { background: '#f5f3ff', text: '#4c1d95' }, footer: { background: '#4c1d95', text: '#f5f3ff' } },
]

/** Rutas y valores que aplica una paleta (o `null` para volver a los colores del tema). */
export function paletteEntries(themeId: string, palette: Palette | null, themeIsDark: boolean): Array<[string, unknown]> {
  const base = 'themeSettings'
  return [
    ...(themeIsDark ? [] : [[`${base}.backgroundColors.${themeId}`, palette?.background] as [string, unknown]]),
    [`${base}.primaryColors.${themeId}`, palette?.primary],
    [`${base}.headerColors.${themeId}.background`, palette?.header.background],
    [`${base}.headerColors.${themeId}.text`, palette?.header.text],
    [`${base}.footerColors.${themeId}.background`, palette?.footer.background],
    [`${base}.footerColors.${themeId}.text`, palette?.footer.text],
  ]
}
