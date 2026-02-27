import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

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
  title: string
  body: string
  ownerId: string
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
    const { storeId, title, body, ownerId } = req.body as RequestBody

    if (!storeId || !title || !body || !ownerId) {
      return res.status(400).json({ error: 'Missing required parameters: storeId, title, body, ownerId' })
    }

    const firestore = getDb()

    // Verify store ownership
    const storeDoc = await firestore.collection('stores').doc(storeId).get()
    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }
    const storeData = storeDoc.data()
    if (storeData?.ownerId !== ownerId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    // Get all push tokens for this store
    const tokensSnap = await firestore
      .collection('stores')
      .doc(storeId)
      .collection('pushTokens')
      .get()

    if (tokensSnap.empty) {
      return res.status(200).json({ success: true, sent: 0, message: 'No tokens registered' })
    }

    const tokens = tokensSnap.docs.map(doc => doc.data().token as string)
    const messaging = getMessaging()

    // Send in batches of 500 (FCM limit)
    let totalSuccess = 0
    let totalFailure = 0
    const staleTokenIds: string[] = []

    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500)
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body }
      })

      totalSuccess += response.successCount
      totalFailure += response.failureCount

      // Collect stale tokens for cleanup
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
      const batch = firestore.batch()
      for (const tokenId of staleTokenIds) {
        batch.delete(
          firestore.collection('stores').doc(storeId).collection('pushTokens').doc(tokenId)
        )
      }
      await batch.commit()
    }

    // Save notification to history
    await firestore
      .collection('stores')
      .doc(storeId)
      .collection('notifications')
      .add({
        storeId,
        title,
        body,
        sentAt: new Date(),
        recipientCount: totalSuccess
      })

    return res.status(200).json({
      success: true,
      sent: totalSuccess,
      failed: totalFailure,
      cleaned: staleTokenIds.length
    })
  } catch (error) {
    console.error('[send-notification] Error:', error)
    return res.status(500).json({ error: 'Failed to send notification' })
  }
}
