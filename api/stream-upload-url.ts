import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

/**
 * Pide a Cloudflare Stream una URL de subida directa (one-time) para un video.
 *
 * El navegador no sube con el token secreto; pide aquí una `uploadURL` y luego
 * sube el archivo directo a Stream (sin pasar el video por esta función, que
 * tiene límite de body). Devuelve también el `uid` del video para construir
 * después la URL de reproducción: https://videodelivery.net/<uid>/manifest/video.m3u8
 *
 * Auth: Firebase ID token (cualquier usuario autenticado puede subir su video).
 * Env: FIREBASE_*, CLOUDFLARE_STREAM_TOKEN, (CLOUDFLARE_ACCOUNT_ID | R2_ACCOUNT_ID)
 */

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    ensureFirebase()

    const token = (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'No autenticado' })
    try {
      await getAuth().verifyIdToken(token)
    } catch {
      return res.status(401).json({ error: 'Token inválido' })
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID
    const streamToken = process.env.CLOUDFLARE_STREAM_TOKEN
    if (!accountId || !streamToken) {
      return res.status(500).json({ error: 'Cloudflare Stream no configurado (CLOUDFLARE_STREAM_TOKEN / ACCOUNT_ID)' })
    }

    const { maxDurationSeconds } = (req.body || {}) as { maxDurationSeconds?: number }

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${streamToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxDurationSeconds: Math.min(Math.max(Number(maxDurationSeconds) || 120, 1), 600),
          requireSignedURLs: false,
        }),
      }
    )
    const data = await cfRes.json()
    if (!cfRes.ok || !data?.success) {
      const msg = data?.errors?.[0]?.message || `Stream HTTP ${cfRes.status}`
      return res.status(502).json({ error: msg })
    }

    const uploadURL = data.result?.uploadURL
    const uid = data.result?.uid
    if (!uploadURL || !uid) return res.status(502).json({ error: 'Stream no devolvió uploadURL/uid' })

    return res.status(200).json({ uploadURL, uid })
  } catch (err) {
    console.error('[stream-upload-url]', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Error con Cloudflare Stream' })
  }
}
