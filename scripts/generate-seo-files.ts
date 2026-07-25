/**
 * generate-seo-files.ts
 * =====================================================
 * Genera, a partir de una unica fuente de verdad (blogData.ts):
 *
 *   public/sitemap.xml    - antes se mantenia a mano y estaba desfasado
 *   public/llms.txt       - indice del sitio para modelos de lenguaje
 *   public/llms-full.txt  - contenido completo del blog en texto plano
 *
 * Sobre llms.txt: es la convencion emergente (llmstxt.org) para que los
 * asistentes de IA entiendan de que trata un sitio sin tener que interpretar
 * HTML. Importa especialmente aqui porque la app es un SPA: los rastreadores de
 * IA no ejecutan JavaScript, asi que sin estos archivos solo ven el HTML vacio
 * de index.html.
 *
 * Se ejecuta antes de `vite build` (ver el script "build" en package.json).
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { blogPosts } from '../src/pages/blog/blogData'

const SITE = 'https://shopifree.app'
const PUBLIC = path.resolve(process.cwd(), 'public')
const today = new Date().toISOString().slice(0, 10)

const sorted = [...blogPosts].sort((a, b) => b.date.localeCompare(a.date))

// ── sitemap.xml ──────────────────────────────────────────────────────
function url(loc: string, lastmod: string, changefreq: string, priority: string, alternates?: boolean) {
  const alt = alternates
    ? `\n    <xhtml:link rel="alternate" hreflang="es" href="${SITE}/es"/>` +
      `\n    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/en"/>` +
      `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/es"/>`
    : ''
  return `  <url>
    <loc>${loc}</loc>${alt}
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generado por scripts/generate-seo-files.ts — no editar a mano -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

${url(`${SITE}/es`, today, 'weekly', '1.0', true)}
${url(`${SITE}/en`, today, 'weekly', '0.9', true)}
${url(`${SITE}/es/blog`, sorted[0]?.date ?? today, 'weekly', '0.9')}
${url(`${SITE}/es/register`, today, 'monthly', '0.8')}
${url(`${SITE}/en/register`, today, 'monthly', '0.7')}
${url(`${SITE}/es/login`, today, 'monthly', '0.5')}
${url(`${SITE}/en/login`, today, 'monthly', '0.5')}
${sorted.map(p => url(`${SITE}/es/blog/${p.slug}`, p.updated ?? p.date, 'monthly', '0.7')).join('\n')}

</urlset>
`
writeFileSync(path.join(PUBLIC, 'sitemap.xml'), sitemap, 'utf-8')

// ── llms.txt ─────────────────────────────────────────────────────────
const byCategory = sorted.reduce<Record<string, typeof sorted>>((acc, p) => {
  (acc[p.category] ||= []).push(p)
  return acc
}, {})

const llms = `# Shopifree

> Plataforma para crear una tienda online y un catálogo digital gratis, orientada a pequeños negocios y emprendedores de Latinoamérica. Los pedidos llegan por WhatsApp y no se cobra comisión por venta.

Shopifree permite publicar un catálogo de productos en minutos, sin conocimientos técnicos y sin costo inicial. Cada tienda obtiene su propia dirección web, y puede conectar un dominio propio, cobrar con tarjeta y gestionar inventario.

## Qué ofrece

- Catálogo online optimizado para celular, con más de 100 temas visuales
- Pedidos directos por WhatsApp, sin intermediarios ni comisión por venta
- Cobros con tarjeta vía MercadoPago, Stripe, PayPal y Go Cuotas (Argentina)
- Dominio propio, código QR y app Android/iPhone de la tienda
- Gestión de productos con variantes (talla, color, material) y stock por almacén
- Cupones de descuento, zonas de envío y envío gratis desde cierto monto
- Estadísticas de visitas, fuentes de tráfico y embudo de conversión
- Módulo de finanzas: inventario, proveedores, compras, gastos y flujo de caja
- Dropshipping con CJ Dropshipping y Printful

## Planes

- **Gratis** ($0): 10 productos, 1 foto por producto, 3 categorías, pedidos por WhatsApp
- **Pro** ($4.99/mes, $49.99/año): 200 productos, 5 fotos, categorías ilimitadas, cobros con tarjeta, cupones, dominio propio y estadísticas
- **Business** ($9.99/mes, $99.99/año): productos ilimitados, 10 fotos, sin marca Shopifree, app móvil propia, dropshipping y soporte prioritario

Al registrarse se otorgan 7 días de prueba del plan Pro, sin tarjeta de crédito.

## Enlaces principales

- [Inicio](${SITE}/es): qué es Shopifree y cómo funciona
- [Crear una tienda gratis](${SITE}/es/register): registro
- [Blog](${SITE}/es/blog): guías de ecommerce para pequeños negocios
- [Contenido completo del blog](${SITE}/llms-full.txt): todos los artículos en texto plano

## Blog

${Object.entries(byCategory).map(([cat, posts]) =>
  `### ${cat}\n\n` + posts.map(p => `- [${p.title}](${SITE}/es/blog/${p.slug}): ${p.description}`).join('\n')
).join('\n\n')}
`
writeFileSync(path.join(PUBLIC, 'llms.txt'), llms, 'utf-8')

// ── llms-full.txt ────────────────────────────────────────────────────
const full = `# Shopifree — Blog completo

Contenido íntegro de los artículos publicados en ${SITE}/es/blog.
Generado el ${today}. ${sorted.length} artículos.

Shopifree es una plataforma para crear tiendas online y catálogos digitales
gratis, con pedidos por WhatsApp y sin comisión por venta, dirigida a pequeños
negocios de Latinoamérica.

${'='.repeat(70)}

${sorted.map(p => `
# ${p.title}

URL: ${SITE}/es/blog/${p.slug}
Categoría: ${p.category}
Publicado: ${p.date}${p.updated ? ` (actualizado ${p.updated})` : ''}
Resumen: ${p.description}

${p.content.trim()}

${'='.repeat(70)}
`).join('\n')}
`
writeFileSync(path.join(PUBLIC, 'llms-full.txt'), full, 'utf-8')

const kb = (s: string) => Math.round(Buffer.byteLength(s, 'utf-8') / 1024)
console.log(`sitemap.xml     ${sorted.length + 7} URLs`)
console.log(`llms.txt        ${kb(llms)} KB`)
console.log(`llms-full.txt   ${kb(full)} KB (${sorted.length} artículos)`)
