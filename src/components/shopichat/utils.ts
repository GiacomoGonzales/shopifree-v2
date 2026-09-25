/**
 * Utilidades de ShopiChat sin componentes (así los archivos .tsx exportan solo
 * componentes y el fast-refresh de Vite no se queja).
 */
import type { Store } from '../../types'

// Colores estables por etiqueta: el catálogo no se guarda (las etiquetas son
// texto libre en la conversación), así que el color sale del propio nombre.
const LABEL_COLORS = ['#1B6E4A', '#A3352C', '#26456E', '#96690F', '#7C3AED', '#0E7490', '#BE185D', '#4B5563']

export function labelColor(label: string): string {
  let h = 0
  for (const ch of label.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return LABEL_COLORS[h % LABEL_COLORS.length]
}

const AVATAR_COLORS = ['#1e3a5f', '#0284C7', '#1B6E4A', '#96690F', '#7C3AED', '#0E7490', '#BE185D', '#4B5563']

export function avatarColor(seed: string): string {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function storeUrlOf(store: Pick<Store, 'customDomain' | 'subdomain'>) {
  return store.customDomain ? `https://${store.customDomain}` : `https://${store.subdomain}.shopifree.app`
}
