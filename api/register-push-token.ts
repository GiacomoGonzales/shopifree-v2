import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { createHash } from 'crypto'

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

interface RequestBody {
  storeId: string
  token: string
  platform: 'ios' | 'android' | 'web'
}

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
    const { storeId, token, platform } = req.body as RequestBody

    if (!storeId || !token || !platform) {
      return res.status(400).json({ error: 'Missing required parameters: storeId, token, platform' })
    }

    const firestore = getDb()

    // Use token hash as document ID to avoid duplicates
    const tokenHash = createHash('sha256').update(token).digest('hex').slice(0, 20)

    await firestore
      .collection('stores')
      .doc(storeId)
      .collection('pushTokens')
      .doc(tokenHash)
      .set({
        token,
        platform,
        storeId,
        createdAt: new Date()
      }, { merge: true })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[register-push-token] Error:', error)
    return res.status(500).json({ error: 'Failed to register push token' })
  }
}
