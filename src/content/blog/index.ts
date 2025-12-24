import type { BlogArticle } from '../../types'

// Artículos del blog hardcodeados
export const blogArticles: BlogArticle[] = [
  {
    id: '1',
    slug: 'como-vender-por-whatsapp',
    title: 'Como vender mas por WhatsApp: Guia completa',
    excerpt: 'Aprende las mejores estrategias para convertir tus chats de WhatsApp en ventas efectivas.',
    content: `
# Como vender mas por WhatsApp

WhatsApp es la herramienta de comunicacion mas usada en Latinoamerica. Aqui te ensenamos como aprovecharlo para tu negocio.

## 1. Responde rapido
Los clientes esperan respuestas inmediatas. Intenta responder en menos de 5 minutos.

## 2. Usa catalogos
Con Shopifree puedes crear un catalogo profesional que tus clientes pueden ver antes de escribirte.

## 3. Personaliza tus mensajes
No uses respuestas automaticas genericas. Cada cliente es unico.
    `,
    image: '/blog/whatsapp-ventas.jpg',
    author: 'Shopifree',
    publishedAt: new Date('2024-01-15'),
    tags: ['whatsapp', 'ventas', 'tips']
  },
  {
    id: '2',
    slug: 'fotos-de-productos-profesionales',
    title: '5 tips para tomar fotos profesionales de tus productos',
    excerpt: 'No necesitas una camara profesional. Con tu celular y estos tips tendras fotos increibles.',
    content: `
# 5 tips para fotos de productos profesionales

## 1. Usa luz natural
La luz del sol es tu mejor aliada. Coloca tus productos cerca de una ventana.

## 2. Fondo limpio
Un fondo blanco o neutro hace que tu producto destaque.

## 3. Angulos variados
Toma fotos desde diferentes angulos para mostrar todo el producto.

## 4. Edita con moderacion
Ajusta brillo y contraste, pero no exageres con los filtros.

## 5. Consistencia
Usa el mismo estilo en todas tus fotos para una imagen profesional.
    `,
    image: '/blog/fotos-productos.jpg',
    author: 'Shopifree',
    publishedAt: new Date('2024-01-20'),
    tags: ['fotografia', 'productos', 'tips']
  },
  {
    id: '3',
    slug: 'precio-correcto-productos',
    title: 'Como calcular el precio correcto de tus productos',
    excerpt: 'Aprende a ponerle precio a tus productos sin perder dinero ni clientes.',
    content: `
# Como calcular el precio correcto

## Formula basica
Precio = Costo + Gastos + Ganancia

## Considera todos los costos
- Materiales
- Tu tiempo
- Envio
- Comisiones

## Investiga la competencia
Mira cuanto cobran otros por productos similares.

## No compitas solo por precio
Agrega valor a tu producto y los clientes pagaran mas.
    `,
    image: '/blog/precios.jpg',
    author: 'Shopifree',
    publishedAt: new Date('2024-02-01'),
    tags: ['precios', 'negocio', 'tips']
  }
]

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return blogArticles.find(article => article.slug === slug)
}

export function getLatestArticles(count: number = 3): BlogArticle[] {
  return [...blogArticles]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, count)
}
