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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { storeId, domain } = req.body

    if (!storeId || !domain) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // Verify store exists
    const storeDoc = await db.collection('stores').doc(storeId).get()

    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const storeData = storeDoc.data()

    // Verify domain belongs to this store
    if (storeData?.customDomain !== domain) {
      return res.status(403).json({ error: 'Domain does not belong to this store' })
    }

    // Remove domain from Vercel
    const vercelToken = process.env.VERCEL_TOKEN
    const vercelProjectId = process.env.VERCEL_PROJECT_ID

    if (!vercelToken || !vercelProjectId) {
      console.error('Missing Vercel configuration')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Remove main domain
    const vercelResponse = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${vercelToken}`
        }
      }
    )

    // 404 is ok - domain might not exist in Vercel
    if (!vercelResponse.ok && vercelResponse.status !== 404) {
      const vercelData = await vercelResponse.json()
      console.error('Vercel API error:', vercelData)
      return res.status(400).json({
        error: vercelData.error?.message || 'Error al eliminar dominio de Vercel'
      })
    }

    // Also remove www subdomain
    try {
      await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/www.${domain}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${vercelToken}`
          }
        }
      )
    } catch (wwwError) {
      console.error('Error removing www subdomain:', wwwError)
      // Continue even if www removal fails
    }

    // Update store to remove domain info
    await db.collection('stores').doc(storeId).update({
      customDomain: null,
      domainStatus: null,
      domainVerification: null,
      updatedAt: new Date()
    })

    return res.status(200).json({
      success: true,
      message: 'Domain removed successfully'
    })
  } catch (error) {
    console.error('Error removing domain:', error)
    return res.status(500).json({ error: 'Failed to remove domain' })
  }
}
