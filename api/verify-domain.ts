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

    // Check domain status in Vercel
    const vercelToken = process.env.VERCEL_TOKEN
    const vercelProjectId = process.env.VERCEL_PROJECT_ID

    if (!vercelToken || !vercelProjectId) {
      console.error('Missing Vercel configuration')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const vercelResponse = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${vercelToken}`
        }
      }
    )

    if (!vercelResponse.ok) {
      const vercelData = await vercelResponse.json()
      console.error('Vercel API error:', vercelData)

      if (vercelResponse.status === 404) {
        // Domain not found in Vercel, update Firebase
        await db.collection('stores').doc(storeId).update({
          domainStatus: 'not_found',
          updatedAt: new Date()
        })
        return res.status(200).json({
          verified: false,
          status: 'not_found',
          message: 'Dominio no encontrado en Vercel'
        })
      }

      return res.status(400).json({
        error: vercelData.error?.message || 'Error al verificar dominio'
      })
    }

    const domainData = await vercelResponse.json()

    // Get domain configuration details
    let configData = null
    try {
      const configResponse = await fetch(
        `https://api.vercel.com/v6/domains/${domain}/config`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${vercelToken}`
          }
        }
      )
      if (configResponse.ok) {
        configData = await configResponse.json()
      }
    } catch (configError) {
      console.error('Error getting domain config:', configError)
    }

    // Build DNS records from Vercel response
    const dnsRecords: Array<{type: string, name: string, value: string}> = []

    // Add A record for apex domain with specific value from config
    if (configData?.aValues && configData.aValues.length > 0) {
      dnsRecords.push({
        type: 'A',
        name: '@',
        value: configData.aValues[0]
      })
    }

    // Add CNAME record for www with specific target from config
    if (configData?.cnameTarget) {
      dnsRecords.push({
        type: 'CNAME',
        name: 'www',
        value: configData.cnameTarget
      })
    }

    // Add verification records if any (TXT records)
    if (domainData.verification && domainData.verification.length > 0) {
      domainData.verification.forEach((v: { type: string; domain: string; value: string }) => {
        dnsRecords.push({
          type: v.type,
          name: v.domain.replace(`.${domain}`, '').replace(domain, '@'),
          value: v.value
        })
      })
    }

    // Update store with domain status and DNS records
    const newStatus = domainData.verified ? 'verified' : 'pending_verification'
    await db.collection('stores').doc(storeId).update({
      domainStatus: newStatus,
      domainVerification: domainData.verification || null,
      domainDnsRecords: dnsRecords,
      updatedAt: new Date()
    })

    return res.status(200).json({
      verified: domainData.verified,
      status: newStatus,
      verification: domainData.verification,
      dnsRecords: dnsRecords,
      message: domainData.verified
        ? 'Dominio verificado correctamente'
        : 'Pendiente de verificación DNS'
    })
  } catch (error) {
    console.error('Error verifying domain:', error)
    return res.status(500).json({ error: 'Failed to verify domain' })
  }
}
