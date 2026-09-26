import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue } from 'firebase-admin/firestore'
import { hasBusinessEffectivePlan, type StorePlanData } from './_shared/plan.js'
import { getDb, storeRef, waSettingsRef, convRef } from './_shared/whatsappInbox.js'
import { isValidWaId } from './_shared/whatsappGraph.js'
import {
  DRAFT_MAX_CHARS, HttpError, MODES, asData, claimQuota, quotaStatus, readAiSettings, recordUsage, rewriteDraft, str,
  suggestReplies, toDate, type Mode,
} from './_shared/shopichatAiEngine.js'
import {
  AiProviderError, ANTHROPIC_MODELS, DEFAULT_MODELS, ProviderSetupError, byoProvider, getPrivateAi, isByoProvider, keyStatus,
  newUsage, normalizeModel, privateAiRef, resolveProvider, savePrivateAi, type AiProvider,
} from './_shared/aiProviders/index.js'

/**
 * ShopiChat — IA copiloto (fase 3A) + claves propias (fase 3B). El copiloto
 * propone respuestas; el comerciante SIEMPRE las revisa y las manda él (acá
 * no se envía nada a WhatsApp). El piloto automático NO pasa por acá: lo
 * dispara el webhook (api/_shared/shopichatAutopilot.ts).
 *
 * POST { action, storeId, ... } · Authorization: Bearer <Firebase ID token>
 *
 *  - 'suggest' { waId, draft? }  → { suggestions: [{ text, productIds }], remaining, limit }
 *  - 'rewrite' { waId, draft, mode: 'friendlier'|'shorter'|'formal'|'fix' } → { text, remaining, limit }
 *  - 'quota'                     → { remaining, limit, provider } (no llama al modelo)
 *  - 'save-key' { provider: 'anthropic'|'openai'|'gemini', apiKey?, model? }
 *        → prueba la clave (llamada barata: GET del modelo) y la guarda en
 *          stores/{id}/private/ai (solo servidor). Sin apiKey y mismo
 *          proveedor = cambiar solo el modelo con la clave ya guardada.
 *          Deja automations.ai.provider en ese proveedor. → { status }
 *  - 'key-status'                → { status: { configured, provider, model, masked: '…abcd', savedAt }, models }
 *  - 'delete-key'                → borra la clave y vuelve a la IA incluida (provider 'shopifree').
 *
 * Reglas:
 *  - El uid tiene que ser el dueño de la tienda y la tienda Business efectivo
 *    (se valida acá, no alcanza con esconder el botón).
 *  - suggest/rewrite: asistente prendido (automations.ai.enabled) y ventana de
 *    24 h abierta (WINDOW_CLOSED si no).
 *  - Cupo diario (api/_shared/shopichatAiEngine.ts): IA incluida 200/día
 *    (`shopichatCount`); con clave propia 2000/día (`shopichatByoCount`), que
 *    no consume el cupo de Shopifree pero frena bucles desbocados.
 *  - La clave del comerciante NUNCA se devuelve: solo "…abcd".
 *
 * Errores con código estable para la UI: UNAUTHENTICATED, INVALID_TOKEN,
 * FORBIDDEN, PLAN_REQUIRED, AI_DISABLED, WINDOW_CLOSED, CONVERSATION_NOT_FOUND,
 * MISSING_DRAFT, LIMIT_REACHED, REFUSED, EMPTY, BUSY, AI_ERROR, INTERNAL,
 * AI_KEY_MISSING, INVALID_PROVIDER, INVALID_MODEL, MISSING_KEY, y con clave
 * propia: INVALID_KEY, QUOTA, MODEL_NOT_FOUND, PROVIDER_ERROR.
 *
 * Env: ANTHROPIC_API_KEY, FIREBASE_*.
 */

const ACTIONS = ['suggest', 'rewrite', 'quota', 'save-key', 'key-status', 'delete-key']
const API_KEY_MAX = 400

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

/**
 * Error del proveedor → respuesta. Con la IA incluida se conserva lo de la
 * fase 3A (429 → BUSY, el resto AI_ERROR); con clave propia se devuelve el
 * código real para que el comerciante sepa qué arreglar en SU cuenta.
 */
function providerFail(res: VercelResponse, err: AiProviderError, byo: boolean) {
  if (err.code === 'REFUSED') return res.status(422).json({ error: 'REFUSED' })
  if (!byo) {
    if (err.code === 'RATE_LIMITED') return res.status(503).json({ error: 'BUSY' })
    console.error('[shopichat-ai] anthropic error', err.httpStatus, err.message)
    return res.status(502).json({ error: 'AI_ERROR' })
  }
  console.warn('[shopichat-ai] proveedor propio fallo:', err.code, err.httpStatus)
  if (err.code === 'RATE_LIMITED') return res.status(503).json({ error: 'BUSY' })
  return res.status(502).json({ error: err.code })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
  const action = str(body.action, 20)
  const storeId = str(body.storeId, 128)
  if (!ACTIONS.includes(action)) return res.status(400).json({ error: 'INVALID_ACTION' })
  if (!storeId || !/^[A-Za-z0-9_-]{1,128}$/.test(storeId)) return res.status(400).json({ error: 'MISSING_STORE' })

  let claimed = false
  let provider: AiProvider | null = null
  const usage = newUsage()
  try {
    getDb()
    const header = req.headers.authorization || ''
    const idToken = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!idToken) return res.status(401).json({ error: 'UNAUTHENTICATED' })
    let uid: string
    try {
      uid = (await getAuth().verifyIdToken(idToken)).uid
    } catch {
      return res.status(401).json({ error: 'INVALID_TOKEN' })
    }

    const storeSnap = await storeRef(storeId).get()
    const store = storeSnap.data()
    if (!store || store.ownerId !== uid) return res.status(403).json({ error: 'FORBIDDEN' })
    if (!hasBusinessEffectivePlan(store as StorePlanData)) return res.status(403).json({ error: 'PLAN_REQUIRED' })

    // ---------- Claves propias ----------
    if (action === 'key-status') {
      return res.status(200).json({ status: keyStatus(await getPrivateAi(storeId)), models: { anthropic: ANTHROPIC_MODELS, defaults: DEFAULT_MODELS } })
    }

    if (action === 'delete-key') {
      await privateAiRef(storeId).delete()
      await waSettingsRef(storeId, 'automations').set({ ai: { provider: 'shopifree' }, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
      return res.status(200).json({ status: keyStatus(null) })
    }

    if (action === 'save-key') {
      const prov = body.provider
      if (!isByoProvider(prov)) return res.status(400).json({ error: 'INVALID_PROVIDER' })
      const model = normalizeModel(prov, body.model)
      if (!model) return res.status(400).json({ error: 'INVALID_MODEL' })
      let apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
      if (apiKey.length > API_KEY_MAX || /\s/.test(apiKey)) return res.status(400).json({ error: 'INVALID_KEY' })
      if (!apiKey) {
        // Cambiar solo el modelo: con la clave ya guardada de ESE proveedor.
        const prev = await getPrivateAi(storeId)
        if (!prev || prev.provider !== prov) return res.status(400).json({ error: 'MISSING_KEY' })
        apiKey = prev.apiKey
      }
      try {
        await byoProvider(prov, apiKey, model).validate()
      } catch (e) {
        if (e instanceof AiProviderError) {
          // La prueba no genera texto: RATE_LIMITED acá casi siempre es cuota.
          return res.status(400).json({ error: e.code === 'RATE_LIMITED' ? 'QUOTA' : e.code })
        }
        throw e
      }
      await savePrivateAi(storeId, { provider: prov, apiKey, model })
      await waSettingsRef(storeId, 'automations').set({ ai: { provider: prov }, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
      return res.status(200).json({ status: keyStatus(await getPrivateAi(storeId)) })
    }

    // ---------- Copiloto ----------
    const autoSnap = await waSettingsRef(storeId, 'automations').get()
    const ai = readAiSettings(autoSnap.data()?.ai)

    if (action === 'quota') {
      const byo = ai.provider !== 'shopifree'
      return res.status(200).json({ ...(await quotaStatus(storeId, byo)), provider: ai.provider })
    }

    const waId = str(body.waId, 128)
    if (!isValidWaId(waId)) return res.status(400).json({ error: 'CONVERSATION_NOT_FOUND' })
    const draft = asData(body.draft, DRAFT_MAX_CHARS)
    const mode = str(body.mode, 20) as Mode
    if (action === 'rewrite' && (!draft || !MODES.includes(mode))) return res.status(400).json({ error: 'MISSING_DRAFT' })

    if (!ai.enabled) return res.status(403).json({ error: 'AI_DISABLED' })
    const conv = (await convRef(storeId, waId).get()).data()
    if (!conv) return res.status(404).json({ error: 'CONVERSATION_NOT_FOUND' })
    const windowEnd = toDate(conv.windowExpiresAt)?.getTime() || 0
    if (windowEnd <= Date.now()) return res.status(409).json({ error: 'WINDOW_CLOSED' })

    try {
      provider = await resolveProvider(storeId, ai.provider)
    } catch (e) {
      if (e instanceof ProviderSetupError) return res.status(e.message === 'AI_KEY_MISSING' ? 409 : 503).json({ error: e.message })
      throw e
    }

    const { remaining, limit } = await claimQuota(storeId, action, provider.byo)
    claimed = true
    const ctx = { storeId, store, ai, waId, conv }

    if (action === 'rewrite') {
      const text = await rewriteDraft(provider, { ...ctx, draft, mode }, usage)
      await recordUsage(storeId, usage, false, provider.byo)
      return res.status(200).json({ text, remaining, limit })
    }

    const suggestions = await suggestReplies(provider, { ...ctx, draft }, usage)
    await recordUsage(storeId, usage, false, provider.byo)
    return res.status(200).json({ suggestions, remaining, limit })
  } catch (err) {
    if (claimed && provider) await recordUsage(storeId, usage, true, provider.byo)
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra })
    if (err instanceof AiProviderError) return providerFail(res, err, provider?.byo ?? false)
    console.error(`[shopichat-ai] ${action} fallo:`, (err as Error).message)
    return res.status(500).json({ error: 'INTERNAL' })
  }
}

// Hasta 4 llamadas al modelo (3 rondas de herramientas + la final).
export const config = {
  maxDuration: 120, // rondas de herramientas con plazo de 45 s + respuesta final
}
