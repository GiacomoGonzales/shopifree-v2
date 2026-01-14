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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { subdomain, domain } = req.query

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

    // Build store URL
    const storeUrl = store.customDomain
      ? `https://${store.customDomain}`
      : `https://${store.subdomain}.shopifree.app`

    // Get OG image (logo, hero, or default)
    const ogImage = store.logo || store.heroImage || 'https://shopifree.app/og-image.png'

    // Meta description
    const description = store.about?.slogan
      || store.about?.description?.slice(0, 160)
      || `${store.name} - Explora nuestro catálogo de productos.`

    // Fetch first few products for additional context
    const productsSnapshot = await db
      .collection('stores')
      .doc(storeId)
      .collection('products')
      .where('active', '==', true)
      .limit(5)
      .get()

    const products = productsSnapshot.docs.map(doc => doc.data())
    const productNames = products.map(p => p.name).join(', ')

    // Return HTML with OG tags for crawlers
    const html = `<!DOCTYPE html>
<html lang="${store.language || 'es'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Basic Meta -->
  <title>${store.name} | Catálogo Online</title>
  <meta name="description" content="${description}">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${storeUrl}">
  <meta property="og:title" content="${store.name}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="${store.name}">
  <meta property="og:locale" content="${store.language === 'en' ? 'en_US' : 'es_LA'}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${store.name}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImage}">

  <!-- Redirect real users to the actual site -->
  <meta http-equiv="refresh" content="0;url=${storeUrl}">
  <link rel="canonical" href="${storeUrl}">
</head>
<body>
  <h1>${store.name}</h1>
  <p>${description}</p>
  ${productNames ? `<p>Productos: ${productNames}</p>` : ''}
  <p>Visita: <a href="${storeUrl}">${storeUrl}</a></p>
</body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    return res.status(200).send(html)
  } catch (error) {
    console.error('Error generating OG page:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
