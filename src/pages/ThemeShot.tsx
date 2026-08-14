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

// Fotos de producto locales (Unsplash, licencia de uso comercial). Antes esto
// usaba picsum.photos, que devuelve paisajes aleatorios: los temas se veian como
// una galeria de fotos en vez de una tienda, y la captura dependia de un
// servicio externo. Con archivos locales el resultado es estable y reproducible.
const img = (name: string) => `/demo-products/${name}.jpg`

const demoCategories: Category[] = [
  ['Novedades', 'zapatillas'], ['Destacados', 'reloj'], ['Ofertas', 'lentes'],
  ['Clásicos', 'camisa'], ['Premium', 'collar'],
].map(([name, pic], i) => ({
  id: `c${i}`, storeId: 'demo', name, slug: name.toLowerCase(), image: img(pic),
  order: i, active: true, createdAt: new Date(), updatedAt: new Date(),
})) as Category[]

// Producto + foto, para que el nombre coincida con lo que se ve.
const demoItems: [string, string][] = [
  ['Zapatillas Urbanas', 'zapatillas'],
  ['Reloj Minimal', 'reloj'],
  ['Lentes de Sol', 'lentes'],
  ['Camisa Denim', 'camisa'],
  ['Mochila Clásica', 'mochila'],
  ['Polo Estampado', 'polo'],
  ['Blusa Bordada', 'blusa'],
  ['Collar de Perlas', 'collar'],
  ['Taza Cerámica', 'taza'],
]

const demoProducts: Product[] = demoItems.map(([name, pic], i) => ({
  id: `p${i}`, storeId: 'demo', name, slug: `producto-${i}`,
  price: 19.9 + i * 10, comparePrice: i % 3 === 0 ? 39.9 + i * 10 : undefined,
  image: img(pic), images: [img(pic)],
  categoryId: demoCategories[i % demoCategories.length].id,
  featured: i < 3, order: i, stock: 5, trackStock: i % 4 === 0,
  createdAt: new Date(Date.now() - i * 86400000), updatedAt: new Date(),
})) as unknown as Product[]

export default function ThemeShot() {
  const { themeId } = useParams<{ themeId: string }>()
  const [params] = useSearchParams()
  const lang = params.get('lang') || 'es'
  // ?nohero=1: renderiza el tema sin foto de portada, para verificar la rama
  // alternativa del hero (varios temas dibujan una escena propia ahi). No lo
  // usa el generador de miniaturas, asi que no altera ningun artefacto.
  const noHero = params.get('nohero') === '1'

  const demoStore = {
    id: 'demo', name: 'AURELIA', subdomain: 'aurelia',
    about: { slogan: 'Diseño que enamora a primera vista' },
    heroImage: noHero ? undefined : img('hero'),
    heroImageMobile: noHero ? undefined : img('hero-mobile'),
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
