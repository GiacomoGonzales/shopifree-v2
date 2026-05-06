import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

/**
 * Admin-only endpoint: marks a store's app as published, stores the public
 * Play Store and/or App Store URLs on appConfig, and optionally fires an
 * email to the store owner.
 *
 * Body: {
 *   storeId: string,
 *   androidUrl?: string,    // play.google.com URL — optional, but at least
 *   iosUrl?: string,        // apps.apple.com URL — one of these required
 *   notifyOwner?: boolean
 * }
 *
 * Either URL alone is enough — Android-only and iOS-only stores are real,
 * and editing one URL later (e.g. Apple approval comes through after Play)
 * shouldn't require re-pasting the other.
 *
 * Auth: Firebase ID token (Authorization: Bearer <token>). Caller must be admin.
 */

const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']

let _db: Firestore | null = null
function getDb(): Firestore {
  if (_db) return _db
  if (!getApps().length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('Missing Firebase env vars')
    }
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    })
  }
  _db = getFirestore()
  return _db
}

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function isValidPlayStoreUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname === 'play.google.com' || u.hostname.endsWith('.play.google.com')
  } catch {
    return false
  }
}

function isValidAppStoreUrl(url: string): boolean {
  try {
    const u = new URL(url)
    // apps.apple.com is the canonical Apple URL host. Some old links still
    // use itunes.apple.com (Apple redirects them) — accept both.
    return u.hostname === 'apps.apple.com'
      || u.hostname === 'itunes.apple.com'
      || u.hostname.endsWith('.apps.apple.com')
  } catch {
    return false
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Verify Firebase ID token + admin
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return res.status(401).json({ error: 'Missing auth token' })

    getDb() // init admin app
    const decoded = await getAuth().verifyIdToken(token)
    if (!decoded.email || !ADMIN_EMAILS.includes(decoded.email)) {
      return res.status(403).json({ error: 'Admin only' })
    }

    const { storeId, androidUrl, iosUrl, androidIsTesting, notifyOwner } = req.body as {
      storeId?: string
      androidUrl?: string
      iosUrl?: string
      androidIsTesting?: boolean
      notifyOwner?: boolean
    }
    if (!storeId) return res.status(400).json({ error: 'Missing storeId' })

    // At least one URL must be provided — there's nothing to publish otherwise.
    if (!androidUrl && !iosUrl) {
      return res.status(400).json({ error: 'Provide at least one of androidUrl or iosUrl' })
    }
    if (androidUrl && !isValidPlayStoreUrl(androidUrl)) {
      return res.status(400).json({ error: 'androidUrl must be a valid play.google.com URL' })
    }
    if (iosUrl && !isValidAppStoreUrl(iosUrl)) {
      return res.status(400).json({ error: 'iosUrl must be a valid apps.apple.com URL' })
    }

    const storeRef = getDb().collection('stores').doc(storeId)
    const storeSnap = await storeRef.get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })
    const storeData = storeSnap.data() as {
      name?: string
      subdomain?: string
      ownerId?: string
      email?: string
      appConfig?: { appName?: string }
    }

    // Build update — only touch the URLs that were sent so editing one
    // doesn't clobber the other. publishedAt stamps the most recent change.
    const updates: Record<string, unknown> = {
      'appConfig.status': 'published',
      'appConfig.publishedAt': FieldValue.serverTimestamp(),
    }
    if (androidUrl) updates['appConfig.androidUrl'] = androidUrl
    if (iosUrl) updates['appConfig.iosUrl'] = iosUrl
    // androidIsTesting is sent every time so the merchant can flip it
    // off when the app graduates to production. Only persist if Android
    // URL is being set in this request OR was already set, to avoid
    // creating a stale flag without a URL to qualify.
    if (typeof androidIsTesting === 'boolean') {
      updates['appConfig.androidIsTesting'] = androidIsTesting
    }
    await storeRef.update(updates)

    // Notify owner (fire-and-forget via send-email endpoint)
    if (notifyOwner) {
      // Resolve owner email: prefer store.email, else look up the user doc
      let ownerEmail = storeData.email || ''
      if (!ownerEmail && storeData.ownerId) {
        try {
          const userSnap = await getDb().collection('users').doc(storeData.ownerId).get()
          ownerEmail = (userSnap.data() as { email?: string } | undefined)?.email || ''
        } catch { /* ignore */ }
      }
      if (!ownerEmail && storeData.ownerId) {
        try {
          const authUser = await getAuth().getUser(storeData.ownerId)
          ownerEmail = authUser.email || ''
        } catch { /* ignore */ }
      }

      // Fire email directly via this process using a dedicated "app-published" type,
      // but since /api/send-email already has a pattern for admin emails, POST there.
      if (ownerEmail) {
        const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://shopifree.app'
        fetch(`${base}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'app-published',
            email: ownerEmail,
            storeId,
            storeName: storeData.name,
            subdomain: storeData.subdomain,
            appName: storeData.appConfig?.appName || storeData.name,
            ...(androidUrl && { androidUrl }),
            ...(iosUrl && { iosUrl }),
          }),
        }).catch(() => { /* fire-and-forget */ })
      }
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('mark-app-published error:', err)
    return res.status(500).json({ error: message })
  }
}
