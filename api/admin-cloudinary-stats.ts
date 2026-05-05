import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

/**
 * Admin-only endpoint: returns real Cloudinary usage (storage, bandwidth,
 * transformations) plus a format breakdown of images and videos in the
 * account.
 *
 * Auth: Firebase ID token (Authorization: Bearer <token>). Caller must be admin.
 *
 * Required env vars:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']

// Cap pagination so a runaway library can't blow the Vercel function timeout.
// 10 pages × 500 results = up to 5000 assets per resource type, which covers
// the current account size with headroom.
const MAX_PAGES_PER_TYPE = 10
const PAGE_SIZE = 500

function ensureFirebase() {
  if (getApps().length) return
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

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

interface CloudinaryUsage {
  plan?: string
  last_updated?: string
  storage?: { usage: number }
  bandwidth?: { usage: number; limit?: number }
  transformations?: { usage: number; limit?: number }
  objects?: { usage: number }
  credits?: { usage: number; limit: number }
}

interface CloudinaryResource {
  public_id: string
  format: string
  resource_type: string
  bytes: number
}

interface CloudinaryListResponse {
  resources: CloudinaryResource[]
  next_cursor?: string
}

async function fetchAllResources(
  cloudName: string,
  authHeader: string,
  resourceType: 'image' | 'video',
): Promise<{ resources: CloudinaryResource[]; truncated: boolean }> {
  const all: CloudinaryResource[] = []
  let nextCursor: string | undefined = undefined
  let pages = 0

  do {
    const url = new URL(`https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}`)
    url.searchParams.set('max_results', String(PAGE_SIZE))
    if (nextCursor) url.searchParams.set('next_cursor', nextCursor)

    const r = await fetch(url, { headers: { Authorization: authHeader } })
    if (!r.ok) {
      const text = await r.text().catch(() => '')
      throw new Error(`Cloudinary ${resourceType} listing failed: ${r.status} ${text.slice(0, 200)}`)
    }
    const data = await r.json() as CloudinaryListResponse
    all.push(...data.resources)
    nextCursor = data.next_cursor
    pages++
  } while (nextCursor && pages < MAX_PAGES_PER_TYPE)

  return { resources: all, truncated: !!nextCursor }
}

interface FormatStats {
  [format: string]: { count: number; bytes: number }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Auth — same pattern as other admin endpoints
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return res.status(401).json({ error: 'Missing auth token' })

    ensureFirebase()
    const decoded = await getAuth().verifyIdToken(token)
    if (!decoded.email || !ADMIN_EMAILS.includes(decoded.email)) {
      return res.status(403).json({ error: 'Admin only' })
    }

    // Cloudinary creds (server-side only — never expose to the client)
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({
        error: 'Missing Cloudinary env vars (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)',
      })
    }
    const cldAuth = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

    // Run usage + listing in parallel — usage finishes fast, listings take a
    // few seconds. With Promise.all we don't wait for one before starting
    // the others.
    const [usageJson, imagesResult, videosResult] = await Promise.all([
      (async () => {
        const r = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/usage`,
          { headers: { Authorization: cldAuth } },
        )
        if (!r.ok) {
          const text = await r.text().catch(() => '')
          throw new Error(`Cloudinary /usage failed: ${r.status} ${text.slice(0, 200)}`)
        }
        return await r.json() as CloudinaryUsage
      })(),
      fetchAllResources(cloudName, cldAuth, 'image'),
      fetchAllResources(cloudName, cldAuth, 'video'),
    ])

    // Aggregate format breakdown
    const formatBreakdown: FormatStats = {}
    for (const r of [...imagesResult.resources, ...videosResult.resources]) {
      const key = r.format || 'unknown'
      if (!formatBreakdown[key]) formatBreakdown[key] = { count: 0, bytes: 0 }
      formatBreakdown[key].count++
      formatBreakdown[key].bytes += r.bytes
    }

    return res.status(200).json({
      usage: {
        plan: usageJson.plan ?? null,
        last_updated: usageJson.last_updated ?? null,
        storage_bytes: usageJson.storage?.usage ?? 0,
        bandwidth_bytes_this_month: usageJson.bandwidth?.usage ?? 0,
        bandwidth_limit_bytes: usageJson.bandwidth?.limit ?? null,
        transformations_this_month: usageJson.transformations?.usage ?? 0,
        transformations_limit: usageJson.transformations?.limit ?? null,
        total_objects: usageJson.objects?.usage ?? 0,
        credits_used: usageJson.credits?.usage ?? null,
        credits_limit: usageJson.credits?.limit ?? null,
      },
      formatBreakdown,
      counts: {
        images: imagesResult.resources.length,
        videos: videosResult.resources.length,
        truncated: imagesResult.truncated || videosResult.truncated,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('admin-cloudinary-stats error:', err)
    return res.status(500).json({ error: message })
  }
}
