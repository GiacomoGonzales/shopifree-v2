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

    // Verify store exists and has pro plan
    const storeDoc = await db.collection('stores').doc(storeId).get()

    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const storeData = storeDoc.data()

    if (storeData?.plan !== 'pro' && storeData?.plan !== 'business') {
      return res.status(403).json({ error: 'Pro plan required for custom domains' })
    }

    // Validate domain format
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    const cleanDomain = domain.trim().toLowerCase()

    if (!domainRegex.test(cleanDomain)) {
      return res.status(400).json({ error: 'Invalid domain format' })
    }

    // Add domain to Vercel
    const vercelToken = process.env.VERCEL_TOKEN
    const vercelProjectId = process.env.VERCEL_PROJECT_ID

    if (!vercelToken || !vercelProjectId) {
      console.error('Missing Vercel configuration')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Add main domain
    const vercelResponse = await fetch(
      `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: cleanDomain })
      }
    )

    const vercelData = await vercelResponse.json()

    if (!vercelResponse.ok) {
      console.error('Vercel API error:', vercelData)

      // Handle specific Vercel errors
      if (vercelData.error?.code === 'domain_already_in_use') {
        return res.status(400).json({
          error: 'Este dominio ya está en uso en otro proyecto',
          code: 'DOMAIN_IN_USE'
        })
      }

      if (vercelData.error?.code === 'invalid_domain') {
        return res.status(400).json({
          error: 'El dominio no es válido',
          code: 'INVALID_DOMAIN'
        })
      }

      return res.status(400).json({
        error: vercelData.error?.message || 'Error al agregar dominio en Vercel',
        code: vercelData.error?.code
      })
    }

    // Add www subdomain with redirect to main domain
    const wwwDomain = `www.${cleanDomain}`
    try {
      await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: wwwDomain,
            redirect: cleanDomain,
            redirectStatusCode: 308
          })
        }
      )
    } catch (wwwError) {
      console.error('Error adding www subdomain:', wwwError)
      // Continue even if www fails - main domain is more important
    }

    // Update store with domain info
    await db.collection('stores').doc(storeId).update({
      customDomain: cleanDomain,
      domainStatus: 'pending_verification',
      domainVerification: vercelData.verification || null,
      updatedAt: new Date()
    })

    return res.status(200).json({
      success: true,
      domain: cleanDomain,
      verification: vercelData.verification,
      configured: vercelData.verified
    })
  } catch (error) {
    console.error('Error adding domain:', error)
    return res.status(500).json({ error: 'Failed to add domain' })
  }
}
