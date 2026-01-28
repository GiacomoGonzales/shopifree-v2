import { Helmet } from 'react-helmet-async'
import type { Store, Product, Category } from '../../types'

interface StoreSEOProps {
  store: Store
  products: Product[]
  categories: Category[]
}

export default function StoreSEO({ store, products, categories }: StoreSEOProps) {
  // Build the store URL
  const storeUrl = store.customDomain
    ? `https://${store.customDomain}`
    : `https://${store.subdomain}.shopifree.app`

  // Meta description: use slogan, about description, or generate from name
  const metaDescription = store.about?.slogan
    || store.about?.description?.slice(0, 160)
    || `${store.name} - Explora nuestro catálogo de productos. Compra fácil por WhatsApp.`

  // Keywords from categories
  const categoryKeywords = categories.map(c => c.name).join(', ')
  const keywords = `${store.name}, ${categoryKeywords}, compras online, tienda, catálogo`

  // OG Image: use store logo, hero image, or first product image
  const ogImage = store.logo
    || store.heroImage
    || products[0]?.image
    || 'https://shopifree.app/og-image.png'

  // JSON-LD: LocalBusiness schema
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': storeUrl,
    name: store.name,
    description: metaDescription,
    url: storeUrl,
    logo: store.logo || undefined,
    image: ogImage,
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

  // JSON-LD: Product schemas (limit to first 10 for performance)
  const productSchemas = products.slice(0, 10).map(product => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${storeUrl}/product/${product.slug || product.id}`,
    name: product.name,
    description: product.description || product.shortDescription || `${product.name} disponible en ${store.name}`,
    image: product.image || product.images?.[0] || ogImage,
    url: `${storeUrl}#${product.slug || product.id}`,
    sku: product.sku || product.id,
    brand: product.brand ? {
      '@type': 'Brand',
      name: product.brand
    } : {
      '@type': 'Brand',
      name: store.name
    },
    offers: {
      '@type': 'Offer',
      url: `${storeUrl}#${product.slug || product.id}`,
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
  }))

  // JSON-LD: ItemList for all products
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Productos de ${store.name}`,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 20).map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${storeUrl}#${product.slug || product.id}`,
      name: product.name,
      image: product.image
    }))
  }

  // JSON-LD: BreadcrumbList
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: storeUrl
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Catálogo',
        item: `${storeUrl}/catalogo`
      }
    ]
  }

  return (
    <Helmet>
      {/* Favicon - use store logo as favicon */}
      {store.logo && (
        <>
          <link rel="icon" type="image/png" href={store.logo} />
          <link rel="apple-touch-icon" href={store.logo} />
        </>
      )}

      {/* Basic Meta Tags */}
      <title>{store.name} | Catálogo Online</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={store.name} />
      <link rel="canonical" href={storeUrl} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={storeUrl} />
      <meta property="og:title" content={store.name} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={store.name} />
      <meta property="og:locale" content={store.language === 'en' ? 'en_US' : 'es_LA'} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={store.name} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />

      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(localBusinessSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(itemListSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      {productSchemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  )
}
