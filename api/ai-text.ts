import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import Anthropic from '@anthropic-ai/sdk'
import { hasPaidEffectivePlan, type StorePlanData } from './_shared/plan.js'

/**
 * Textos con IA para el editor en vivo (solo plan Business): devuelve 3
 * propuestas para el eslogan, la descripcion de la tienda, el texto de la barra
 * de anuncio o la descripcion de un producto.
 *
 * POST { storeId, field, productId? }  ·  Authorization: Bearer <Firebase ID token>
 *
 * El plan se valida aca (no alcanza con esconder el boton): la tienda tiene que
 * ser del usuario y estar en Business activo. Tope diario por tienda para que
 * un error o un abuso no dispare el gasto.
 */

type Field = 'slogan' | 'description' | 'announcement' | 'productDescription'
const FIELDS: Field[] = ['slogan', 'description', 'announcement', 'productDescription']
const DAILY_LIMIT = 60

/** Cuanto puede medir cada texto (caracteres) y que es, para el pedido. */
const FIELD_SPECS: Record<Field, { max: number; es: string; en: string }> = {
  slogan: { max: 70, es: 'un eslogan corto para la tienda (una frase, sin comillas)', en: 'a short store slogan (one phrase, no quotes)' },
  description: { max: 280, es: 'una descripción de la tienda para el pie de página (2 o 3 frases)', en: 'a store description for the footer (2-3 sentences)' },
  announcement: { max: 60, es: 'el texto de la barra de anuncio superior (una promoción o aviso breve)', en: 'the top announcement bar text (a short promo or notice)' },
  productDescription: { max: 400, es: 'la descripción de un producto (breve, que ayude a vender)', en: 'a product description (brief, sales-oriented)' },
}

function ensureFirebase() {
  if (getApps().length) return
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

/** Business activo: mismo criterio que el resto de los chequeos de plan del servidor. */
function isBusiness(store: StorePlanData | undefined) {
  return store?.plan === 'business' && hasPaidEffectivePlan(store)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    ensureFirebase()

    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return res.status(401).json({ error: 'No autenticado' })
    let uid: string
    try {
      uid = (await getAuth().verifyIdToken(token)).uid
    } catch {
      return res.status(401).json({ error: 'Token inválido' })
    }

    const { storeId, field, productId } = (req.body || {}) as { storeId?: string; field?: Field; productId?: string }
    if (!storeId || !field || !FIELDS.includes(field)) return res.status(400).json({ error: 'Parámetros inválidos' })
    if (field === 'productDescription' && !productId) return res.status(400).json({ error: 'Falta el producto' })

    const db = getFirestore()
    const storeRef = db.collection('stores').doc(storeId)
    const storeSnap = await storeRef.get()
    const store = storeSnap.data()
    if (!store || store.ownerId !== uid) return res.status(403).json({ error: 'No autorizado' })
    if (!isBusiness(store as StorePlanData)) return res.status(403).json({ error: 'PLAN_REQUIRED' })

    // Tope diario por tienda (transaccion: dos pedidos a la vez no se saltan el limite).
    const day = new Date().toISOString().slice(0, 10)
    const usageRef = storeRef.collection('aiUsage').doc(day)
    const allowed = await db.runTransaction(async tx => {
      const count = (await tx.get(usageRef)).data()?.count || 0
      if (count >= DAILY_LIMIT) return false
      tx.set(usageRef, { count: FieldValue.increment(1), updatedAt: new Date() }, { merge: true })
      return true
    })
    if (!allowed) return res.status(429).json({ error: 'LIMIT_REACHED', limit: DAILY_LIMIT })

    // Contexto: lo que ya se sabe de la tienda (y del producto, si aplica).
    const [productsSnap, categoriesSnap, productSnap] = await Promise.all([
      storeRef.collection('products').limit(15).get(),
      storeRef.collection('categories').limit(10).get(),
      productId ? storeRef.collection('products').doc(productId).get() : Promise.resolve(null),
    ])
    const product = productSnap?.data()
    if (field === 'productDescription' && !product) return res.status(404).json({ error: 'Producto no encontrado' })

    const english = store.language === 'en'
    const spec = FIELD_SPECS[field]
    const current = field === 'slogan' ? store.about?.slogan
      : field === 'description' ? store.about?.description
      : field === 'announcement' ? store.announcement?.text
      : product?.description
    const context = [
      `Tienda: ${store.name}`,
      store.businessType && `Rubro: ${store.businessType}`,
      store.location?.city && `Ciudad: ${store.location.city}`,
      store.about?.slogan && field !== 'slogan' && `Eslogan actual: ${store.about.slogan}`,
      categoriesSnap.size && `Categorías: ${categoriesSnap.docs.map(d => d.data().name).filter(Boolean).join(', ')}`,
      productsSnap.size && `Algunos productos: ${productsSnap.docs.map(d => d.data().name).filter(Boolean).join(', ')}`,
      product && `Producto a describir: ${product.name}${product.price ? ` (precio ${product.price} ${store.currency || ''})` : ''}`,
      current && `Texto actual (proponer alternativas distintas): ${current}`,
    ].filter(Boolean).join('\n')

    const instructions = english
      ? `Write ${spec.en} for this online store. Give exactly 3 different options, each at most ${spec.max} characters, in English. Natural, warm and specific to what the store sells; no hashtags, no emojis unless they fit a promo, no invented facts (prices, discounts, shipping terms) that are not in the context.`
      : `Escribe ${spec.es} para esta tienda online. Da exactamente 3 opciones distintas, cada una de ${spec.max} caracteres como máximo, en español neutro latinoamericano. Naturales, cálidas y específicas a lo que vende la tienda; sin hashtags, sin emojis salvo que sumen a una promoción, y sin inventar datos (precios, descuentos, condiciones de envío) que no estén en el contexto.`

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    // `fallbacks: "default"`: si el modelo declina el pedido, la API lo reintenta
    // con otro modelo en la misma llamada (el SDK instalado aun no tipa el campo).
    const response = await client.beta.messages.create({
      model: 'claude-opus-5',
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: { suggestions: { type: 'array', items: { type: 'string' } } },
            required: ['suggestions'],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: 'user', content: `${instructions}\n\n${context}` }],
    } as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming)

    if (response.stop_reason === 'refusal') return res.status(422).json({ error: 'REFUSED' })
    const text = response.content.find(b => b.type === 'text')
    const parsed = text && text.type === 'text' ? JSON.parse(text.text) as { suggestions?: unknown } : {}
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s): s is string => typeof s === 'string' && !!s.trim()).map(s => s.trim().slice(0, spec.max)).slice(0, 3)
      : []
    if (!suggestions.length) return res.status(502).json({ error: 'EMPTY' })

    return res.status(200).json({ suggestions })
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return res.status(503).json({ error: 'BUSY' })
    if (error instanceof Anthropic.APIError) {
      console.error('ai-text anthropic error', error.status, error.message)
      return res.status(502).json({ error: 'AI_ERROR' })
    }
    console.error('ai-text error', error)
    return res.status(500).json({ error: 'Error interno' })
  }
}
