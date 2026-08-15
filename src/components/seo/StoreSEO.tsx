import { useEffect, useMemo } from 'react'
import { transformR2 } from '../../utils/cloudinary'
import Seo from './Seo'
import { useCustomHeadHtml, useCustomBodyHtml } from '../../hooks/useCustomHeadHtml'
import type { Store, Product, Category } from '../../types'

interface StoreSEOProps {
  store: Store
  products: Product[]
  categories: Category[]
  product?: Product | null
}

// Map language code to og:locale
function getOgLocale(lang?: string): string {
  switch (lang) {
    case 'en': return 'en_US'
    case 'pt': return 'pt_BR'
    default: return 'es_LA'
  }
}

// Map language code to title suffix
function getCatalogSuffix(lang?: string): string {
  switch (lang) {
    case 'en': return 'Online Catalog'
    case 'pt': return 'Catálogo Online'
    default: return 'Catálogo Online'
  }
}

/**
 * Pone el logo de la tienda como favicon y como apple-touch-icon.
 *
 * Antes esto dibujaba el logo en un canvas para redondearle las esquinas. Eso
 * exige cargar la imagen con crossOrigin, y el bucket R2 no devuelve cabecera
 * CORS: el logo vive en shopifreemedia.site y la tienda en otro dominio, asi
 * que el intento fallaba SIEMPRE, en todas las tiendas. Habia un onerror que
 * reponia el favicon sin redondear —por eso el favicon si se veia— pero que
 * omitia el apple-touch-icon, presente solo en la rama de exito. Resultado:
 * al agregar la tienda a la pantalla de inicio en iOS no salia el logo.
 *
 * Se saca el canvas. No cambia lo que se ve (el redondeado no llegaba a
 * aplicarse nunca) y deja de ensuciar la consola de cada tienda con dos
 * errores de CORS por carga. Para recuperar el redondeado hay que habilitar
 * CORS en el bucket; mientras no exista, este codigo seria decorativo.
 */
function updateFavicon(logoUrl: string) {
  // Se pide el logo ya reducido: el original pesa ~27 KB y a 64px son ~3 KB.
  // format=auto entrega AVIF/WebP a los navegadores modernos, que conservan
  // la transparencia del logo.
  const iconUrl = transformR2(logoUrl, 'format=auto,width=64,quality=90') || logoUrl
  const appleUrl = transformR2(logoUrl, 'format=auto,width=180,quality=90') || logoUrl

  const setIcons = (faviconHref: string, appleHref: string) => {
    document.querySelectorAll('link[rel*="icon"]').forEach(el => el.remove())

    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = faviconHref
    document.head.appendChild(link)

    const appleLink = document.createElement('link')
    appleLink.rel = 'apple-touch-icon'
    appleLink.href = appleHref
    document.head.appendChild(appleLink)
  }

  setIcons(iconUrl, appleUrl)
}

export default function StoreSEO({ store, products, categories, product }: StoreSEOProps) {
  // Update favicon when store logo changes
  useEffect(() => {
    if (store.logo) {
      updateFavicon(store.logo)
    }
  }, [store.logo])

  // Inject merchant-provided custom HTML (SSL validators, custom analytics,
  // visual badges like TrustLogo, chat widgets, etc.)
  useCustomHeadHtml(store.integrations?.customHeadHtml)
  useCustomBodyHtml(store.integrations?.customBodyHtml)

  // Build the store URL
  const storeUrl = store.customDomain
    ? `https://${store.customDomain}`
    : `https://${store.subdomain}.shopifree.app`

  const catalogSuffix = getCatalogSuffix(store.language)
  const ogLocale = getOgLocale(store.language)

  // Product-specific vs store-level meta
  const isProductPage = !!product

  const pageTitle = isProductPage
    ? `${product.metaTitle || product.name} | ${store.name}`
    : `${store.name} | ${catalogSuffix}`

  const metaDescription = isProductPage
    ? (product.metaDescription || product.shortDescription || product.description || `${product.name} - ${store.name}`)?.slice(0, 160)
    : (store.about?.slogan
      || store.about?.description?.slice(0, 160)
      || `${store.name} - Explora nuestro catálogo de productos. Compra fácil por WhatsApp.`)

  const canonicalUrl = isProductPage
    ? `${storeUrl}/p/${product.slug}`
    : storeUrl

  const ogImage = isProductPage
    ? (product.image || product.images?.[0] || store.logo || 'https://shopifree.app/og-image.png')
    : (store.logo || store.heroImage || products[0]?.image || 'https://shopifree.app/og-image.png')

  const ogType = isProductPage ? 'product' : 'website'

  const ogTitle = isProductPage
    ? (product.metaTitle || product.name)
    : store.name

  // Keywords from categories
  const categoryKeywords = categories.map(c => c.name).join(', ')
  const keywords = isProductPage
    ? `${product.name}, ${product.brand || store.name}, ${categoryKeywords}`
    : `${store.name}, ${categoryKeywords}, compras online, tienda, catálogo`

  // JSON-LD: LocalBusiness schema
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': storeUrl,
    name: store.name,
    description: store.about?.slogan || store.about?.description?.slice(0, 160) || `${store.name}`,
    url: storeUrl,
    logo: store.logo || undefined,
    image: store.logo || store.heroImage || 'https://shopifree.app/og-image.png',
    telephone: store.whatsapp ? `+${store.whatsapp.replace(/\D/g, '')}` : undefined,
    email: store.email || undefined,
    address: store.location ? {
      '@type': 'PostalAddress',
      streetAddress: store.location.address,
      addressLocality: store.location.city,
      addressRegion: store.location.state,
      addressCountry: store.location.country
    } : undefined,
    geo: store.location?.coordinates ? {
      '@type': 'GeoCoordinates',
      latitude: store.location.coordinates.lat,
      longitude: store.location.coordinates.lng
    } : undefined,
    sameAs: [
      store.instagram ? `https://instagram.com/${store.instagram.replace('@', '')}` : null,
      store.facebook || null,
      store.tiktok ? `https://tiktok.com/@${store.tiktok.replace('@', '')}` : null
    ].filter(Boolean),
    priceRange: '$$',
    currenciesAccepted: store.currency || 'USD'
  }

  // JSON-LD: Single product schema (for product pages)
  const singleProductSchema = isProductPage ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${storeUrl}/p/${product.slug}`,
    name: product.name,
    description: product.description || product.shortDescription || `${product.name} - ${store.name}`,
    image: product.image || product.images?.[0] || ogImage,
    url: `${storeUrl}/p/${product.slug}`,
    sku: product.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand || store.name
    },
    offers: {
      '@type': 'Offer',
      url: `${storeUrl}/p/${product.slug}`,
      priceCurrency: store.currency || 'USD',
      price: product.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: product.trackStock && product.stock === 0
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: store.name
      }
    }
  } : null

  // JSON-LD: Product schemas for catalog page (limit to first 10)
  const productSchemas = !isProductPage ? products.slice(0, 10).map(p => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${storeUrl}/p/${p.slug || p.id}`,
    name: p.name,
    description: p.description || p.shortDescription || `${p.name} - ${store.name}`,
    image: p.image || p.images?.[0] || ogImage,
    url: `${storeUrl}/p/${p.slug || p.id}`,
    sku: p.sku || p.id,
    brand: {
      '@type': 'Brand',
      name: p.brand || store.name
    },
    offers: {
      '@type': 'Offer',
      url: `${storeUrl}/p/${p.slug || p.id}`,
      priceCurrency: store.currency || 'USD',
      price: p.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: p.trackStock && p.stock === 0
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: store.name
      }
    }
  })) : []

  // JSON-LD: ItemList for catalog page
  const itemListSchema = !isProductPage ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Productos de ${store.name}`,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 20).map((p, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${storeUrl}/p/${p.slug || p.id}`,
      name: p.name,
      image: p.image
    }))
  } : null

  // JSON-LD: BreadcrumbList
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: store.name,
      item: storeUrl
    }
  ]
  if (isProductPage) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: product.name,
      item: `${storeUrl}/p/${product.slug}`
    })
  }
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems
  }

  // Los pixeles y GA se inyectan por DOM, no como hijos de un componente de
  // metadatos: React 19 solo eleva <title>, <meta> y <link>, y estos scripts
  // llevaban tiempo sin ejecutarse porque vivian dentro de Helmet, que dejo de
  // funcionar con React 19. Reutilizamos el inyector ya probado de custom HTML.
  const analyticsHtml = useMemo(() => {
    const parts: string[] = []
    const ga = store.integrations?.googleAnalytics
    if (ga) {
      parts.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${ga}"></script>`)
      parts.push(`<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');</script>`)
    }
    const meta = store.integrations?.metaPixel
    if (meta) {
      parts.push(`<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta}');fbq('track','PageView');</script>`)
    }
    const tiktok = store.integrations?.tiktokPixel
    if (tiktok) {
      parts.push(`<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var i=d.createElement("script");i.type="text/javascript",i.async=!0,i.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(i,a)};ttq.load('${tiktok}');ttq.page();}(window,document,'ttq');</script>`)
    }
    return parts.join('\n')
  }, [store.integrations?.googleAnalytics, store.integrations?.metaPixel, store.integrations?.tiktokPixel])

  useCustomHeadHtml(analyticsHtml || undefined)

  const schemas = [
    localBusinessSchema,
    breadcrumbSchema,
    ...(singleProductSchema ? [singleProductSchema] : []),
    ...(itemListSchema ? [itemListSchema] : []),
    ...productSchemas,
  ] as Record<string, unknown>[]

  return (
    <Seo
      title={pageTitle}
      ogTitle={ogTitle}
      description={metaDescription!}
      canonical={canonicalUrl}
      image={ogImage}
      keywords={keywords}
      type={ogType}
      siteName={store.name}
      locale={ogLocale}
      author={store.name}
      schemas={schemas}
    >
      {isProductPage && (
        <>
          <meta property="product:price:amount" content={String(product.price)} />
          <meta property="product:price:currency" content={store.currency || 'USD'} />
        </>
      )}
      {store.integrations?.googleSearchConsole && (
        <meta name="google-site-verification" content={store.integrations.googleSearchConsole} />
      )}
    </Seo>
  )
}
