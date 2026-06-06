/**
 * ThemeShot
 * =====================================================
 * Ruta publica SOLO para generar thumbnails de temas con Playwright.
 * Renderiza un tema por id (`/theme-shot/:themeId`) a pantalla completa con
 * datos demo consistentes, sin auth ni datos reales. No se enlaza en la UI.
 *
 * Genera capturas con:  npm run thumbnails  (ver scripts/generate-theme-thumbnails.mjs)
 */

import { useParams, useSearchParams } from 'react-router-dom'
import type { Store, Product, Category } from '../types'
import { getThemeComponent } from '../themes/components'

const img = (seed: string, w = 600, h = 600) => `https://picsum.photos/seed/${seed}/${w}/${h}`

const demoCategories: Category[] = ['Novedades', 'Destacados', 'Ofertas', 'Clásicos', 'Premium'].map((name, i) => ({
  id: `c${i}`, storeId: 'demo', name, slug: name.toLowerCase(), image: img(`cat${i}`, 200, 200),
  order: i, active: true, createdAt: new Date(), updatedAt: new Date(),
})) as Category[]

const demoNames = [
  'Producto Estrella', 'Edición Limitada', 'Clásico de la Casa', 'Selección Premium',
  'Favorito del Mes', 'Novedad', 'Más Vendido', 'Pieza Única', 'Oferta Especial',
]

const demoProducts: Product[] = demoNames.map((name, i) => ({
  id: `p${i}`, storeId: 'demo', name, slug: `producto-${i}`,
  price: 19.9 + i * 10, comparePrice: i % 3 === 0 ? 39.9 + i * 10 : undefined,
  image: img(`prod${i}`), images: [img(`prod${i}`)],
  categoryId: demoCategories[i % demoCategories.length].id,
  featured: i < 3, order: i, stock: 5, trackStock: i % 4 === 0,
  createdAt: new Date(Date.now() - i * 86400000), updatedAt: new Date(),
})) as unknown as Product[]

export default function ThemeShot() {
  const { themeId } = useParams<{ themeId: string }>()
  const [params] = useSearchParams()
  const lang = params.get('lang') || 'es'

  const demoStore = {
    id: 'demo', name: 'AURELIA', subdomain: 'aurelia',
    about: { slogan: 'Diseño que enamora a primera vista' },
    heroImage: img('herowide', 1600, 600),
    heroImageMobile: img('heromob', 800, 600),
    currency: 'PEN', language: lang, whatsapp: '51999999999',
    plan: 'business', themeId, themeSettings: { hideFilters: false },
    shipping: { enabled: true }, createdAt: new Date('2021-01-01'),
  } as unknown as Store

  const ThemeComponent = getThemeComponent(themeId || 'minimal')

  return (
    <div data-theme-shot={themeId}>
      <ThemeComponent store={demoStore} products={demoProducts} categories={demoCategories} />
    </div>
  )
}
