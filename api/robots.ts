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

    // Fetch store to build the correct URL
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
    const storeUrl = store.customDomain
      ? `https://${store.customDomain}`
      : `https://${store.subdomain}.shopifree.app`

    const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${storeUrl}/sitemap.xml
`

    res.setHeader('Content-Type', 'text/plain')
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    return res.status(200).send(robotsTxt)
  } catch (error) {
    console.error('Error generating robots.txt:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
