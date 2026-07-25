/**
 * Seo
 * =====================================================
 * Metadatos de pagina usando el soporte nativo de React 19: los elementos
 * <title>, <meta> y <link> que se renderizan aqui son elevados automaticamente
 * al <head> del documento.
 *
 * Reemplaza a react-helmet-async, que quedo sin mantenimiento y NO funciona con
 * React 19: fallaba en silencio, dejando cada articulo del blog y cada tienda
 * con el titulo, la descripcion y el canonical de la landing.
 *
 * Sobre los duplicados: index.html trae un juego de tags por defecto para que
 * los crawlers que no ejecutan JavaScript vean algo. React agrega los suyos
 * despues, y para <meta name> / <meta property> / <link rel=canonical> el que
 * vale es el ultimo que encuentra el crawler, asi que estos ganan. El <title>
 * lo sincronizamos ademas por efecto para que la pestana muestre el correcto.
 */
import { useEffect } from 'react'

export interface SeoProps {
  title: string
  /** Titulo para redes sociales, si debe ser distinto del <title> del navegador. */
  ogTitle?: string
  description: string
  canonical: string
  /** Ruta absoluta de la imagen para redes sociales. */
  image?: string
  keywords?: string
  /** 'website' | 'article' | 'product' */
  type?: string
  siteName?: string
  locale?: string
  robots?: string
  /** Publicacion y actualizacion, solo para articulos. */
  publishedTime?: string
  modifiedTime?: string
  author?: string
  section?: string
  tags?: string[]
  /** Objetos JSON-LD; se serializan en <script type="application/ld+json">. */
  schemas?: Record<string, unknown>[]
  children?: React.ReactNode
}

const DEFAULT_IMAGE = 'https://shopifree.app/og-image.png'

export default function Seo({
  title,
  ogTitle,
  description,
  canonical,
  image = DEFAULT_IMAGE,
  keywords,
  type = 'website',
  siteName = 'Shopifree',
  locale = 'es_LA',
  robots = 'index, follow, max-image-preview:large, max-snippet:-1',
  publishedTime,
  modifiedTime,
  author,
  section,
  tags,
  schemas,
  children,
}: SeoProps) {
  // React 19 eleva nuestros tags al <head>, pero NO elimina los que ya trae
  // index.html: quedan ambos, y los estaticos aparecen primero, que es
  // justamente lo que lee un crawler. Sin esta limpieza cada articulo seguiria
  // publicando la descripcion, el og:title y el canonical de la landing.
  //
  // Marcamos los nuestros con data-seo y borramos cualquier homonimo sin marca.
  useEffect(() => {
    document.title = title

    const drop = (selector: string) => {
      document.querySelectorAll(selector).forEach(el => {
        if (!el.hasAttribute('data-seo')) el.remove()
      })
    }

    // Sobra el <title> de index.html: el navegador y los crawlers usan el primero.
    document.querySelectorAll('title').forEach(el => {
      if (!el.hasAttribute('data-seo') && el.textContent !== title) el.remove()
    })

    document.querySelectorAll('meta[data-seo]').forEach(ours => {
      const name = ours.getAttribute('name')
      const prop = ours.getAttribute('property')
      if (name) drop(`meta[name="${name}"]`)
      if (prop) drop(`meta[property="${prop}"]`)
    })

    drop('link[rel="canonical"]')
  })

  return (
    <>
      <title data-seo="1">{title}</title>
      <meta name="description" content={description}  data-seo="1" />
      {keywords && <meta name="keywords" content={keywords}  data-seo="1" />}
      {author && <meta name="author" content={author}  data-seo="1" />}
      <meta name="robots" content={robots}  data-seo="1" />
      <link rel="canonical" href={canonical} data-seo="1" />

      {/* Open Graph */}
      <meta property="og:type" content={type}  data-seo="1" />
      <meta property="og:url" content={canonical}  data-seo="1" />
      <meta property="og:title" content={ogTitle ?? title}  data-seo="1" />
      <meta property="og:description" content={description}  data-seo="1" />
      <meta property="og:image" content={image}  data-seo="1" />
      <meta property="og:site_name" content={siteName}  data-seo="1" />
      <meta property="og:locale" content={locale}  data-seo="1" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image"  data-seo="1" />
      <meta name="twitter:title" content={ogTitle ?? title}  data-seo="1" />
      <meta name="twitter:description" content={description}  data-seo="1" />
      <meta name="twitter:image" content={image}  data-seo="1" />

      {/* Articulos */}
      {publishedTime && <meta property="article:published_time" content={publishedTime}  data-seo="1" />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime}  data-seo="1" />}
      {author && type === 'article' && <meta property="article:author" content={author}  data-seo="1" />}
      {section && <meta property="article:section" content={section}  data-seo="1" />}
      {tags?.map(tag => <meta key={tag} property="article:tag" content={tag}  data-seo="1" />)}

      {schemas?.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {children}
    </>
  )
}
