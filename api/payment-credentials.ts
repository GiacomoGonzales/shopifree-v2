/**
 * POST /api/payment-credentials — Guarda / borra / consulta los secretos de
 * las pasarelas de pago del comerciante (MercadoPago, Stripe, PayPal, GoCuotas).
 *
 * Los secretos NUNCA se escriben en el doc público stores/{storeId} (que es
 * legible por cualquiera). Se guardan en stores/{storeId}/private/payments,
 * accesible solo vía Admin SDK. En el doc público queda únicamente
 * payments.<gateway>.secretConfigured (boolean).
 *
 * Auth: Authorization: Bearer <Firebase ID token>. Se verifica que el uid sea
 * el ownerId de la tienda.
 *
 * Body:
 *   { action: 'status', storeId }
 *       → { gateways: { mercadopago: { configured, last4 }, ... } }   (nunca el secreto)
 *   { action: 'save', storeId, gateway, secret }
 *       → guarda el secreto en el doc privado y borra el campo legacy del público
 *   { action: 'clear', storeId, gateway }
 *       → borra el secreto (privado + legacy)
 *   { action: 'validate-paypal', storeId, clientId, sandbox, secret? }
 *       → valida contra el OAuth de PayPal con el secreto enviado o, si no se
 *         envía, con el guardado. { ok, error? }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore'
import { validateMerchantCredentials } from '../src/lib/paypal-server.js'
import {
  getPaymentSecrets,
  maskSecret,
  privatePaymentsRef,
  PAYMENT_GATEWAYS,
  SECRET_FIELD,
  type PaymentGateway,
} from './_shared/paymentSecrets.js'

let db: Firestore

function getDb(): Firestore {
  if (!db) {
    if (!getApps().length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      })
    }
    db = getFirestore()
  }
  return db
}

const MAX_SECRET_LENGTH = 1000

async function verifyUid(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const token = authHeader.slice('Bearer '.length).trim()
    getDb()
    const { getAuth } = await import('firebase-admin/auth')
    const decoded = await getAuth().verifyIdToken(token)
    return decoded.uid
  } catch (err) {
    console.error('[payment-credentials] auth error:', err)
    return null
  }
}

function isGateway(v: unknown): v is PaymentGateway {
  return typeof v === 'string' && (PAYMENT_GATEWAYS as string[]).includes(v)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const uid = await verifyUid(req)
    if (!uid) return res.status(401).json({ error: 'Unauthorized' })

    const body = (req.body || {}) as {
      action?: string
      storeId?: string
      gateway?: string
      secret?: string
      clientId?: string
      sandbox?: boolean
    }
    const { action, storeId } = body
    if (!storeId || typeof storeId !== 'string') {
      return res.status(400).json({ error: 'Missing storeId' })
    }

    const firestore = getDb()
    const storeRef = firestore.collection('stores').doc(storeId)
    const storeSnap = await storeRef.get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })
    const storeData = storeSnap.data() || {}
    if (storeData.ownerId !== uid) return res.status(403).json({ error: 'Forbidden' })

    if (action === 'status') {
      const secrets = await getPaymentSecrets(firestore, storeId, storeData)

      // Migración perezosa: si quedan secretos legacy en el doc público, se
      // mueven al doc privado y se borran del público (el dueño entró al panel).
      const legacyPayments = (storeData.payments || {}) as Record<string, Record<string, unknown> | undefined>
      const privateMove: Record<string, Record<string, string>> = {}
      const publicUpdate: Record<string, unknown> = {}
      for (const gw of PAYMENT_GATEWAYS) {
        const field = SECRET_FIELD[gw]
        const legacyGw = legacyPayments[gw]
        if (!legacyGw || !(field in legacyGw)) continue
        publicUpdate[`payments.${gw}.${field}`] = FieldValue.delete()
        const value = (secrets as Record<string, Record<string, string> | undefined>)[gw]?.[field]
        if (value) {
          privateMove[gw] = { [field]: value }
          publicUpdate[`payments.${gw}.secretConfigured`] = true
        }
      }
      if (Object.keys(publicUpdate).length) {
        try {
          if (Object.keys(privateMove).length) {
            await privatePaymentsRef(firestore, storeId).set({ ...privateMove, updatedAt: new Date() }, { merge: true })
          }
          await storeRef.update(publicUpdate)
        } catch (err) {
          // No bloquear el panel si falla; el fallback legacy sigue funcionando
          console.error('[payment-credentials] lazy migration failed:', err)
        }
      }

      return res.status(200).json({
        gateways: {
          mercadopago: maskSecret(secrets.mercadopago?.accessToken),
          stripe: maskSecret(secrets.stripe?.secretKey),
          paypal: maskSecret(secrets.paypal?.clientSecret),
          gocuotas: maskSecret(secrets.gocuotas?.password),
        },
      })
    }

    if (action === 'validate-paypal') {
      const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : ''
      let secret = typeof body.secret === 'string' ? body.secret.trim() : ''
      if (!secret) {
        const secrets = await getPaymentSecrets(firestore, storeId, storeData)
        secret = secrets.paypal?.clientSecret || ''
      }
      if (!clientId || !secret) {
        return res.status(200).json({ ok: false, error: 'Missing clientId or clientSecret' })
      }
      const error = await validateMerchantCredentials({
        clientId,
        secret,
        env: body.sandbox === false ? 'live' : 'sandbox',
      })
      if (error) return res.status(200).json({ ok: false, error })
      return res.status(200).json({ ok: true })
    }

    if (action === 'save' || action === 'clear') {
      const gateway = body.gateway
      if (!isGateway(gateway)) return res.status(400).json({ error: 'Invalid gateway' })
      const field = SECRET_FIELD[gateway]

      if (action === 'save') {
        const secret = typeof body.secret === 'string' ? body.secret.trim() : ''
        if (!secret) return res.status(400).json({ error: 'Missing secret' })
        if (secret.length > MAX_SECRET_LENGTH) return res.status(400).json({ error: 'Secret too long' })

        await privatePaymentsRef(firestore, storeId).set(
          { [gateway]: { [field]: secret }, updatedAt: new Date() },
          { merge: true }
        )
        // Quitar el campo legacy del doc público y marcar como configurada
        await storeRef.update({
          [`payments.${gateway}.${field}`]: FieldValue.delete(),
          [`payments.${gateway}.secretConfigured`]: true,
          updatedAt: new Date(),
        })
        return res.status(200).json({ ok: true, status: maskSecret(secret) })
      }

      // clear
      await privatePaymentsRef(firestore, storeId).set(
        { [gateway]: { [field]: FieldValue.delete() }, updatedAt: new Date() },
        { merge: true }
      )
      await storeRef.update({
        [`payments.${gateway}.${field}`]: FieldValue.delete(),
        [`payments.${gateway}.secretConfigured`]: false,
        updatedAt: new Date(),
      })
      return res.status(200).json({ ok: true, status: maskSecret(undefined) })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    const e = err as Error
    console.error('[payment-credentials] error:', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
