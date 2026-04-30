import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

/**
 * Admin-only endpoint that triggers the "Screenshot store (phone)" GitHub
 * Actions workflow for a specific store. Marks the store's screenshots
 * status as 'queued' immediately so the admin UI reflects the state.
 *
 * Body: { storeId: string }
 * Auth: Firebase ID token in `Authorization: Bearer <token>` header.
 *       Caller's email must be in the admin list.
 *
 * Env: GITHUB_TOKEN, GITHUB_REPO (format: "owner/repo")
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return res.status(401).json({ error: 'Missing auth token' })

    getDb()
    const decoded = await getAuth().verifyIdToken(token)
    if (!decoded.email || !ADMIN_EMAILS.includes(decoded.email)) {
      return res.status(403).json({ error: 'Admin only' })
    }

    const { storeId } = req.body as { storeId?: string }
    if (!storeId) return res.status(400).json({ error: 'Missing storeId' })

    const storeSnap = await getDb().collection('stores').doc(storeId).get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })
    const storeData = storeSnap.data() as { subdomain?: string }
    if (!storeData.subdomain) {
      return res.status(400).json({ error: 'Store has no subdomain configured' })
    }

    const ghToken = process.env.GITHUB_TOKEN
    const ghRepo = process.env.GITHUB_REPO
    if (!ghToken || !ghRepo) {
      return res.status(500).json({ error: 'Server misconfig: GITHUB_TOKEN/GITHUB_REPO missing' })
    }

    const dispatchUrl = `https://api.github.com/repos/${ghRepo}/actions/workflows/screenshot-store.yml/dispatches`
    const ghRes = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${ghToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { storeId },
      }),
    })

    if (!ghRes.ok) {
      const errText = await ghRes.text()
      console.error('GitHub dispatch failed:', ghRes.status, errText)
      return res.status(502).json({ error: `GitHub API error: ${ghRes.status}`, detail: errText })
    }

    await getDb().collection('stores').doc(storeId).update({
      'appConfig.screenshots.status': 'queued',
      'appConfig.screenshots.lastError': FieldValue.delete(),
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('trigger-screenshot error:', err)
    return res.status(500).json({ error: message })
  }
}
