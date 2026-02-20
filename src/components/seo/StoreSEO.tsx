import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
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

// Update favicon dynamically by manipulating the DOM directly
// This is more reliable than Helmet for favicons because it replaces existing links
function updateFavicon(logoUrl: string) {
  // Load the image and create a rounded version using canvas
  const img = new Image()
  img.crossOrigin = 'anonymous'

  img.onload = () => {
    // Create canvas for rounded favicon
    const size = 64 // Favicon size
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    if (ctx) {
      // Draw rounded rectangle clip path
      const radius = size * 0.2 // 20% corner radius
      ctx.beginPath()
      ctx.moveTo(radius, 0)
      ctx.lineTo(size - radius, 0)
      ctx.quadraticCurveTo(size, 0, size, radius)
      ctx.lineTo(size, size - radius)
      ctx.quadraticCurveTo(size, size, size - radius, size)
      ctx.lineTo(radius, size)
      ctx.quadraticCurveTo(0, size, 0, size - radius)
      ctx.lineTo(0, radius)
      ctx.quadraticCurveTo(0, 0, radius, 0)
      ctx.closePath()
      ctx.clip()

      // Draw the image
      ctx.drawImage(img, 0, 0, size, size)

      // Convert to data URL
      const roundedFaviconUrl = canvas.toDataURL('image/png')

      // Remove all existing favicon links
      const existingFavicons = document.querySelectorAll('link[rel*="icon"]')
      existingFavicons.forEach(el => el.remove())

      // Create new favicon link with rounded image
      const link = document.createElement('link')
      link.rel = 'icon'
      link.type = 'image/png'
      link.href = roundedFaviconUrl
      document.head.appendChild(link)

      // Also add apple-touch-icon
      const appleLink = document.createElement('link')
      appleLink.rel = 'apple-touch-icon'
      appleLink.href = roundedFaviconUrl
      document.head.appendChild(appleLink)
    }
  }

  img.onerror = () => {
    // Fallback: use original URL if canvas fails
    const existingFavicons = document.querySelectorAll('link[rel*="icon"]')
    existingFavicons.forEach(el => el.remove())

    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    link.href = logoUrl
    document.head.appendChild(link)
  }

  img.src = logoUrl
}

export default function StoreSEO({ store, products, categories, product }: StoreSEOProps) {
  // Update favicon when store logo changes
  useEffect(() => {
    if (store.logo) {
      updateFavicon(store.logo)
    }
  }, [store.logo])

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

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={metaDescription!} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={store.name} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={metaDescription!} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={store.name} />
      <meta property="og:locale" content={ogLocale} />

      {/* Product-specific OG tags */}
      {isProductPage && (
        <>
          <meta property="product:price:amount" content={String(product.price)} />
          <meta property="product:price:currency" content={store.currency || 'USD'} />
        </>
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={metaDescription!} />
      <meta name="twitter:image" content={ogImage} />

      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(localBusinessSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      {singleProductSchema && (
        <script type="application/ld+json">
          {JSON.stringify(singleProductSchema)}
        </script>
      )}
      {itemListSchema && (
        <script type="application/ld+json">
          {JSON.stringify(itemListSchema)}
        </script>
      )}
      {productSchemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}

      {/* Google Search Console verification */}
      {store.integrations?.googleSearchConsole && (
        <meta name="google-site-verification" content={store.integrations.googleSearchConsole} />
      )}

      {/* Google Analytics 4 */}
      {store.integrations?.googleAnalytics && (
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${store.integrations.googleAnalytics}`} />
      )}
      {store.integrations?.googleAnalytics && (
        <script>{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${store.integrations.googleAnalytics}');`}</script>
      )}

      {/* Meta Pixel (Facebook / Instagram) */}
      {store.integrations?.metaPixel && (
        <script>{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${store.integrations.metaPixel}');fbq('track','PageView');`}</script>
      )}

      {/* TikTok Pixel */}
      {store.integrations?.tiktokPixel && (
        <script>{`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var i=d.createElement("script");i.type="text/javascript",i.async=!0,i.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(i,a)};ttq.load('${store.integrations.tiktokPixel}');ttq.page();}(window,document,'ttq');`}</script>
      )}
    </Helmet>
  )
}
