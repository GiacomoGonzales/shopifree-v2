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

  const { action, storeId, domain } = req.body

  if (!action || !storeId || !domain) {
    return res.status(400).json({ error: 'Missing required parameters: action, storeId, domain' })
  }

  switch (action) {
    case 'add':
      return handleAdd(req, res, storeId, domain)
    case 'remove':
      return handleRemove(req, res, storeId, domain)
    case 'verify':
      return handleVerify(req, res, storeId, domain)
    default:
      return res.status(400).json({ error: `Invalid action: ${action}` })
  }
}

async function handleAdd(_req: VercelRequest, res: VercelResponse, storeId: string, domain: string) {
  try {
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
    }

    // Get domain-specific DNS records from Vercel config endpoint
    let dnsRecords: Array<{type: string, name: string, value: string}> = []
    try {
      const configResponse = await fetch(
        `https://api.vercel.com/v6/domains/${cleanDomain}/config`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${vercelToken}`
          }
        }
      )

      if (configResponse.ok) {
        const configData = await configResponse.json()
        console.log('Domain config response:', JSON.stringify(configData))

        if (configData.aValues && configData.aValues.length > 0) {
          dnsRecords.push({
            type: 'A',
            name: '@',
            value: configData.aValues[0]
          })
        }

        if (configData.cnameTarget) {
          dnsRecords.push({
            type: 'CNAME',
            name: 'www',
            value: configData.cnameTarget
          })
        }
      }

      const domainDetailsResponse = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${cleanDomain}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${vercelToken}`
          }
        }
      )

      if (domainDetailsResponse.ok) {
        const domainDetails = await domainDetailsResponse.json()

        if (domainDetails.verification && domainDetails.verification.length > 0) {
          domainDetails.verification.forEach((v: { type: string; domain: string; value: string }) => {
            dnsRecords.push({
              type: v.type,
              name: v.domain.replace(`.${cleanDomain}`, '').replace(cleanDomain, '@'),
              value: v.value
            })
          })
        }
      }
    } catch (configError) {
      console.error('Error getting domain config:', configError)
    }

    if (dnsRecords.length === 0) {
      dnsRecords = [
        { type: 'A', name: '@', value: '76.76.21.21' },
        { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com' }
      ]
    }

    // Update store with domain info
    await db.collection('stores').doc(storeId).update({
      customDomain: cleanDomain,
      domainStatus: 'pending_verification',
      domainVerification: vercelData.verification || null,
      domainDnsRecords: dnsRecords,
      updatedAt: new Date()
    })

    return res.status(200).json({
      success: true,
      domain: cleanDomain,
      verification: vercelData.verification,
      dnsRecords: dnsRecords,
      configured: vercelData.verified
    })
  } catch (error) {
    console.error('Error adding domain:', error)
    return res.status(500).json({ error: 'Failed to add domain' })
  }
}

async function handleRemove(_req: VercelRequest, res: VercelResponse, storeId: string, domain: string) {
  try {
    // Verify store exists
    const storeDoc = await db.collection('stores').doc(storeId).get()

    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const storeData = storeDoc.data()

    if (storeData?.customDomain !== domain) {
      return res.status(403).json({ error: 'Domain does not belong to this store' })
    }

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
    }

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

async function handleVerify(_req: VercelRequest, res: VercelResponse, storeId: string, domain: string) {
  try {
    // Verify store exists
    const storeDoc = await db.collection('stores').doc(storeId).get()

    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const storeData = storeDoc.data()

    if (storeData?.customDomain !== domain) {
      return res.status(403).json({ error: 'Domain does not belong to this store' })
    }

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
    console.log('Domain data from Vercel:', JSON.stringify(domainData))

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
        console.log('Domain config from Vercel:', JSON.stringify(configData))
      } else {
        console.error('Config response not OK:', configResponse.status)
      }
    } catch (configError) {
      console.error('Error getting domain config:', configError)
    }

    const dnsRecords: Array<{type: string, name: string, value: string}> = []

    const aRecordValue = configData?.aValues?.[0] || '76.76.21.21'
    dnsRecords.push({
      type: 'A',
      name: '@',
      value: aRecordValue
    })

    const cnameValue = configData?.cnameTarget || 'cname.vercel-dns.com'
    dnsRecords.push({
      type: 'CNAME',
      name: 'www',
      value: cnameValue
    })

    if (domainData.verification && domainData.verification.length > 0) {
      domainData.verification.forEach((v: { type: string; domain: string; value: string }) => {
        dnsRecords.push({
          type: v.type,
          name: v.domain.replace(`.${domain}`, '').replace(domain, '@'),
          value: v.value
        })
      })
    }

    const isDnsConfigured = configData?.misconfigured === false
    const newStatus = isDnsConfigured ? 'verified' : 'pending_verification'

    await db.collection('stores').doc(storeId).update({
      domainStatus: newStatus,
      domainVerification: domainData.verification || null,
      domainDnsRecords: dnsRecords,
      updatedAt: new Date()
    })

    return res.status(200).json({
      verified: isDnsConfigured,
      status: newStatus,
      verification: domainData.verification,
      dnsRecords: dnsRecords,
      configData: configData,
      message: isDnsConfigured
        ? 'Dominio verificado correctamente - DNS configurado'
        : 'Pendiente de configuración DNS'
    })
  } catch (error) {
    console.error('Error verifying domain:', error)
    return res.status(500).json({ error: 'Failed to verify domain' })
  }
}
