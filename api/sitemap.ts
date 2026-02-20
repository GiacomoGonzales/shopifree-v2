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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { subdomain, domain } = req.query

    if (!subdomain && !domain) {
      return res.status(400).json({ error: 'Missing subdomain or domain parameter' })
    }

    // Fetch store
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

    const storeUrl = store.customDomain
      ? `https://${store.customDomain}`
      : `https://${store.subdomain}.shopifree.app`

    // Fetch all active products
    const productsSnapshot = await db
      .collection('stores')
      .doc(storeId)
      .collection('products')
      .where('active', '==', true)
      .get()

    const products = productsSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }))

    // Build sitemap XML
    const storeUpdatedAt = store.updatedAt?.toDate?.()
      ? store.updatedAt.toDate().toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(storeUrl)}</loc>
    <lastmod>${storeUpdatedAt}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`

    for (const product of products) {
      const slug = product.slug || product.id
      const updatedAt = product.updatedAt?.toDate?.()
        ? product.updatedAt.toDate().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      xml += `
  <url>
    <loc>${escapeXml(`${storeUrl}/p/${slug}`)}</loc>
    <lastmod>${updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    }

    xml += `
</urlset>`

    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    return res.status(200).send(xml)
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
