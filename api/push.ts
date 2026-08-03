import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
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

async function recentOrders(storeId: string) {
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

  return { status: 200, data: { orders } }
}

/**
 * Devuelve el uid del Firebase ID token del header, o null si no hay/no sirve.
 */
async function uidFromRequest(req: VercelRequest): Promise<string | null> {
  const header = req.headers.authorization || ''
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!idToken) return null
  try {
    getDb() // asegura que firebase-admin esté inicializado
    return (await getAuth().verifyIdToken(idToken)).uid
  } catch {
    return null
  }
}

/**
 * Token del DUEÑO de la tienda, para avisarle de pedidos nuevos.
 *
 * Va a `users/{uid}/pushTokens`, deliberadamente SEPARADO de
 * `stores/{storeId}/pushTokens`, que son los dispositivos de los CLIENTES que
 * navegan el catálogo. Mezclarlos haría que un "tenés un pedido nuevo" le
 * llegue a toda la clientela.
 */
async function registerOwnerToken(body: { token: string; platform: string }, uid: string) {
  const { token, platform } = body
  if (!token || !platform) {
    return { status: 400, data: { error: 'Missing required parameters: token, platform' } }
  }

  const firestore = getDb()
  const tokenHash = createHash('sha256').update(token).digest('hex').slice(0, 20)

  await firestore
    .collection('users')
    .doc(uid)
    .collection('pushTokens')
    .doc(tokenHash)
    .set({ token, platform, updatedAt: new Date() }, { merge: true })

  return { status: 200, data: { success: true } }
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

/**
 * Difusión del dueño hacia los CLIENTES de su tienda (desde Mi App).
 *
 * `uid` sale de verificar el Firebase ID token, no del cuerpo del pedido.
 * Antes se comparaba un `ownerId` que mandaba el propio cliente, así que
 * cualquiera que conociera un par storeId + ownerId podía mandarle
 * notificaciones a la clientela de esa tienda.
 */
async function sendNotification(body: { storeId: string; title: string; body: string }, uid: string) {
  const { storeId, title, body: notifBody } = body

  if (!storeId || !title || !notifBody) {
    return { status: 400, data: { error: 'Missing required parameters: storeId, title, body' } }
  }

  const firestore = getDb()

  // Verify store ownership
  const storeDoc = await firestore.collection('stores').doc(storeId).get()
  if (!storeDoc.exists) {
    return { status: 404, data: { error: 'Store not found' } }
  }
  const storeData = storeDoc.data()
  if (storeData?.ownerId !== uid) {
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // GET: recent-orders action (used by SocialProofToast)
  if (req.method === 'GET') {
    const { storeId } = req.query
    if (!storeId || typeof storeId !== 'string') {
      return res.status(400).json({ error: 'storeId is required' })
    }
    try {
      const result = await recentOrders(storeId)
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
      return res.status(result.status).json(result.data)
    } catch (error) {
      console.error('[push/recent-orders] Error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { action, ...body } = req.body

    let result: { status: number; data: Record<string, unknown> }

    switch (action) {
      // Dispositivo de un CLIENTE navegando el catálogo. Sin auth a propósito:
      // los compradores no tienen sesión.
      case 'register-token':
        result = await registerToken(body as Parameters<typeof registerToken>[0])
        break

      // Las dos siguientes son del DUEÑO y exigen sesión.
      case 'register-owner-token': {
        const uid = await uidFromRequest(req)
        if (!uid) return res.status(401).json({ error: 'No autenticado' })
        result = await registerOwnerToken(body as Parameters<typeof registerOwnerToken>[0], uid)
        break
      }
      case 'send': {
        const uid = await uidFromRequest(req)
        if (!uid) return res.status(401).json({ error: 'No autenticado' })
        result = await sendNotification(body as Parameters<typeof sendNotification>[0], uid)
        break
      }
      default:
        return res.status(400).json({ error: 'Invalid action. Use "register-token", "register-owner-token" or "send"' })
    }

    return res.status(result.status).json(result.data)
  } catch (error) {
    console.error('[push] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
