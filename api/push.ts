import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
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

async function registerToken(body: { storeId: string; token: string; platform: string }) {
  const { storeId, token, platform } = body

  if (!storeId || !token || !platform) {
    return { status: 400, data: { error: 'Missing required parameters: storeId, token, platform' } }
  }

  const firestore = getDb()
  const tokenHash = createHash('sha256').update(token).digest('hex').slice(0, 20)

  await firestore
    .collection('stores')
    .doc(storeId)
    .collection('pushTokens')
    .doc(tokenHash)
    .set({ token, platform, storeId, createdAt: new Date() }, { merge: true })

  return { status: 200, data: { success: true } }
}

async function sendNotification(body: { storeId: string; title: string; body: string; ownerId: string }) {
  const { storeId, title, body: notifBody, ownerId } = body

  if (!storeId || !title || !notifBody || !ownerId) {
    return { status: 400, data: { error: 'Missing required parameters: storeId, title, body, ownerId' } }
  }

  const firestore = getDb()

  // Verify store ownership
  const storeDoc = await firestore.collection('stores').doc(storeId).get()
  if (!storeDoc.exists) {
    return { status: 404, data: { error: 'Store not found' } }
  }
  const storeData = storeDoc.data()
  if (storeData?.ownerId !== ownerId) {
    return { status: 403, data: { error: 'Not authorized' } }
  }

  // Get all push tokens
  const tokensSnap = await firestore
    .collection('stores')
    .doc(storeId)
    .collection('pushTokens')
    .get()

  if (tokensSnap.empty) {
    return { status: 200, data: { success: true, sent: 0, message: 'No tokens registered' } }
  }

  const tokens = tokensSnap.docs.map(doc => doc.data().token as string)
  const messaging = getMessaging()

  let totalSuccess = 0
  let totalFailure = 0
  const staleTokenIds: string[] = []

  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500)
    const response = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title, body: notifBody }
    })

    totalSuccess += response.successCount
    totalFailure += response.failureCount

    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
        const globalIdx = i + idx
        const doc = tokensSnap.docs[globalIdx]
        if (doc) staleTokenIds.push(doc.id)
      }
    })
  }

  // Clean up stale tokens
  if (staleTokenIds.length > 0) {
    const writeBatch = firestore.batch()
    for (const tokenId of staleTokenIds) {
      writeBatch.delete(
        firestore.collection('stores').doc(storeId).collection('pushTokens').doc(tokenId)
      )
    }
    await writeBatch.commit()
  }

  // Save to history
  await firestore
    .collection('stores')
    .doc(storeId)
    .collection('notifications')
    .add({
      storeId,
      title,
      body: notifBody,
      sentAt: new Date(),
      recipientCount: totalSuccess
    })

  return { status: 200, data: { success: true, sent: totalSuccess, failed: totalFailure, cleaned: staleTokenIds.length } }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { action, ...body } = req.body

    let result: { status: number; data: Record<string, unknown> }

    switch (action) {
      case 'register-token':
        result = await registerToken(body as Parameters<typeof registerToken>[0])
        break
      case 'send':
        result = await sendNotification(body as Parameters<typeof sendNotification>[0])
        break
      default:
        return res.status(400).json({ error: 'Invalid action. Use "register-token" or "send"' })
    }

    return res.status(result.status).json(result.data)
  } catch (error) {
    console.error('[push] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
