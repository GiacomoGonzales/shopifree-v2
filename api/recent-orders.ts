import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let db: Firestore

function getDb(): Firestore {
  if (!db) {
    if (!getApps().length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        })
      })
    }
    db = getFirestore()
  }
  return db
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { storeId } = req.query
  if (!storeId || typeof storeId !== 'string') {
    return res.status(400).json({ error: 'storeId is required' })
  }

  try {
    const firestore = getDb()
    const ordersRef = firestore
      .collection('stores')
      .doc(storeId)
      .collection('orders')
      .where('status', 'in', ['confirmed', 'preparing', 'ready', 'delivered'])
      .orderBy('createdAt', 'desc')
      .limit(10)

    const snapshot = await ordersRef.get()

    const orders = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        firstName: data.customer?.name?.split(' ')[0] || '',
        city: data.deliveryAddress?.city || '',
        productName: data.items?.[0]?.productName || '',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || '',
      }
    }).filter(o => o.firstName && o.productName)

    // CDN cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
    return res.status(200).json({ orders })
  } catch (error) {
    console.error('Error fetching recent orders:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
