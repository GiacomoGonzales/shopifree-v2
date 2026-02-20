import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin (only once)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  })
}

const db = getFirestore()

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getOgLocale(lang?: string): string {
  switch (lang) {
    case 'en': return 'en_US'
    case 'pt': return 'pt_BR'
    default: return 'es_LA'
  }
}

function getCatalogSuffix(lang?: string): string {
  switch (lang) {
    case 'en': return 'Online Catalog'
    case 'pt': return 'Catálogo Online'
    default: return 'Catálogo Online'
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { subdomain, domain, product: productSlug, bot } = req.query
    const isSearchBot = bot === 'search'

    if (!subdomain && !domain) {
      return res.status(400).json({ error: 'Missing subdomain or domain parameter' })
    }

    // Fetch store from Firebase
    const storesRef = db.collection('stores')
    let storeQuery

    if (domain) {
      storeQuery = storesRef.where('customDomain', '==', domain)
    } else {
      storeQuery = storesRef.where('subdomain', '==', subdomain)
    }

    const snapshot = await storeQuery.get()

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const store = snapshot.docs[0].data()
    const storeId = snapshot.docs[0].id
    const lang = store.language || 'es'
    const ogLocale = getOgLocale(lang)

    // Build store URL
    const storeUrl = store.customDomain
      ? `https://${store.customDomain}`
      : `https://${store.subdomain}.shopifree.app`

    // If product slug provided, fetch specific product
    if (productSlug && typeof productSlug === 'string') {
      const productsSnapshot = await db
        .collection('stores')
        .doc(storeId)
        .collection('products')
        .where('slug', '==', productSlug)
        .where('active', '==', true)
        .limit(1)
        .get()

      if (!productsSnapshot.empty) {
        const product = productsSnapshot.docs[0].data()
        return renderProductPage(res, store, storeUrl, product, productSlug, ogLocale, lang, isSearchBot)
      }
      // Product not found — fall through to store-level rendering
    }

    // Store-level rendering
    return renderStorePage(res, store, storeId, storeUrl, ogLocale, lang, isSearchBot)
  } catch (error) {
    console.error('Error generating OG page:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

function renderProductPage(
  res: VercelResponse,
  store: any,
  storeUrl: string,
  product: any,
  productSlug: string,
  ogLocale: string,
  lang: string,
  isSearchBot: boolean
) {
  const title = escapeHtml(`${product.metaTitle || product.name} | ${store.name}`)
  const description = escapeHtml(
    (product.metaDescription || product.shortDescription || product.description || `${product.name} - ${store.name}`)
      .slice(0, 160)
  )
  const productUrl = `${storeUrl}/p/${productSlug}`
  const ogImage = product.image || product.images?.[0] || store.logo || 'https://shopifree.app/og-image.png'
  const currency = store.currency || 'USD'
  const availability = product.trackStock && product.stock === 0
    ? 'https://schema.org/OutOfStock'
    : 'https://schema.org/InStock'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.shortDescription || `${product.name} - ${store.name}`,
    image: ogImage,
    url: productUrl,
    sku: product.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand || store.name
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: currency,
      price: product.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability,
      seller: {
        '@type': 'Organization',
        name: store.name
      }
    }
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: store.name, item: storeUrl },
      { '@type': 'ListItem', position: 2, name: product.name, item: productUrl }
    ]
  }

  // Only include meta-refresh for social bots, not search engines
  const metaRefresh = isSearchBot ? '' : `<meta http-equiv="refresh" content="0;url=${productUrl}">`

  const gscCode = store.integrations?.googleSearchConsole
    ? `\n  <meta name="google-site-verification" content="${escapeHtml(store.integrations.googleSearchConsole)}">`
    : ''

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">${gscCode}

  <!-- Basic Meta -->
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${productUrl}">

  <!-- Open Graph -->
  <meta property="og:type" content="product">
  <meta property="og:url" content="${productUrl}">
  <meta property="og:title" content="${escapeHtml(product.metaTitle || product.name)}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="${escapeHtml(store.name)}">
  <meta property="og:locale" content="${ogLocale}">
  <meta property="product:price:amount" content="${product.price}">
  <meta property="product:price:currency" content="${currency}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(product.metaTitle || product.name)}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImage}">

  ${metaRefresh}

  <!-- JSON-LD -->
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
</head>
<body>
  <h1>${escapeHtml(product.name)}</h1>
  <p>${description}</p>
  <p>${currency} ${product.price}</p>
  <p><a href="${storeUrl}">${escapeHtml(store.name)}</a></p>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
  return res.status(200).send(html)
}

function renderStorePage(
  res: VercelResponse,
  store: any,
  storeId: string,
  storeUrl: string,
  ogLocale: string,
  lang: string,
  isSearchBot: boolean
) {
  const ogImage = store.logo || store.heroImage || 'https://shopifree.app/og-image.png'
  const catalogSuffix = getCatalogSuffix(lang)
  const title = escapeHtml(`${store.name} | ${catalogSuffix}`)
  const description = escapeHtml(
    store.about?.slogan
    || store.about?.description?.slice(0, 160)
    || `${store.name} - Explora nuestro catálogo de productos.`
  )

  // Only include meta-refresh for social bots, not search engines
  const metaRefresh = isSearchBot ? '' : `<meta http-equiv="refresh" content="0;url=${storeUrl}">`

  const gscCode = store.integrations?.googleSearchConsole
    ? `\n  <meta name="google-site-verification" content="${escapeHtml(store.integrations.googleSearchConsole)}">`
    : ''

  const localBusinessLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: store.name,
    description: store.about?.slogan || store.about?.description || store.name,
    url: storeUrl,
    logo: store.logo || undefined,
    image: ogImage
  }

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">${gscCode}

  <!-- Basic Meta -->
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${storeUrl}">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${storeUrl}">
  <meta property="og:title" content="${escapeHtml(store.name)}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="${escapeHtml(store.name)}">
  <meta property="og:locale" content="${ogLocale}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(store.name)}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImage}">

  ${metaRefresh}

  <!-- JSON-LD -->
  <script type="application/ld+json">${JSON.stringify(localBusinessLd)}</script>
</head>
<body>
  <h1>${escapeHtml(store.name)}</h1>
  <p>${description}</p>
  <p><a href="${storeUrl}">${storeUrl}</a></p>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
  return res.status(200).send(html)
}
