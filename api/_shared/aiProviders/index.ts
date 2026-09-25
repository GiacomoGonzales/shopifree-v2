/**
 * Proveedores de IA de ShopiChat (fase 3B): elige el adaptador según lo que
 * configuró la tienda y guarda / lee la clave propia (BYO) del comerciante.
 *
 *   stores/{storeId}/private/ai  { provider, apiKey, model, savedAt }  — solo servidor
 *
 * La clave NUNCA vuelve al cliente: 'key-status' devuelve solo "…abcd".
 */
import { FieldValue, type Timestamp } from 'firebase-admin/firestore'
import { storeRef } from '../whatsappInbox.js'
import { anthropicProvider, ANTHROPIC_DEFAULT_MODEL, ANTHROPIC_MODELS, SHOPIFREE_MODEL } from './anthropic.js'
import { openaiProvider, OPENAI_DEFAULT_MODEL } from './openai.js'
import { geminiProvider, GEMINI_DEFAULT_MODEL } from './gemini.js'
import { BYO_PROVIDERS, maskKey, type AiProvider, type AiProviderId, type ByoProviderId } from './types.js'

export * from './types.js'
export { SHOPIFREE_MODEL, ANTHROPIC_MODELS } from './anthropic.js'

export const DEFAULT_MODELS: Record<ByoProviderId, string> = {
  anthropic: ANTHROPIC_DEFAULT_MODEL,
  openai: OPENAI_DEFAULT_MODEL,
  gemini: GEMINI_DEFAULT_MODEL,
}

export const privateAiRef = (storeId: string) => storeRef(storeId).collection('private').doc('ai')

export interface PrivateAi {
  provider: ByoProviderId
  apiKey: string
  model: string
  savedAt?: Timestamp
}

export const isByoProvider = (v: unknown): v is ByoProviderId => typeof v === 'string' && (BYO_PROVIDERS as string[]).includes(v)

/**
 * Modelo pedido por el comerciante, normalizado. Anthropic: solo de la lista.
 * OpenAI / Gemini: texto libre con caracteres seguros ('' → el default).
 * null = inválido.
 */
export function normalizeModel(provider: ByoProviderId, raw: unknown): string | null {
  let m = typeof raw === 'string' ? raw.trim() : ''
  if (provider === 'gemini') m = m.replace(/^models\//, '')
  if (!m) return DEFAULT_MODELS[provider]
  if (provider === 'anthropic') return (ANTHROPIC_MODELS as readonly string[]).includes(m) ? m : null
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(m) ? m : null
}

/** Adaptador para una clave y un modelo dados (BYO). */
export function byoProvider(provider: ByoProviderId, apiKey: string, model: string): AiProvider {
  if (provider === 'anthropic') return anthropicProvider({ id: 'anthropic', apiKey, model })
  if (provider === 'openai') return openaiProvider({ apiKey, model })
  return geminiProvider({ apiKey, model })
}

/** El proveedor incluido: nuestra clave de Anthropic. null si falta en el entorno. */
export function shopifreeProvider(): AiProvider | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  return anthropicProvider({ id: 'shopifree', apiKey: key, model: SHOPIFREE_MODEL })
}

export async function getPrivateAi(storeId: string): Promise<PrivateAi | null> {
  const snap = await privateAiRef(storeId).get()
  const d = snap.data() as PrivateAi | undefined
  return d && isByoProvider(d.provider) && typeof d.apiKey === 'string' && d.apiKey ? d : null
}

export class ProviderSetupError extends Error {}

/**
 * Proveedor efectivo según automations.ai.provider:
 *  - 'shopifree' (o nada)  → el incluido (ProviderSetupError('AI_ERROR') si falta la clave del servidor)
 *  - BYO                    → la clave guardada para ESE proveedor
 *                             (ProviderSetupError('AI_KEY_MISSING') si no hay)
 */
export async function resolveProvider(storeId: string, selected: AiProviderId): Promise<AiProvider> {
  if (selected === 'shopifree' || !isByoProvider(selected)) {
    const p = shopifreeProvider()
    if (!p) {
      console.error('[shopichat-ai] falta ANTHROPIC_API_KEY')
      throw new ProviderSetupError('AI_ERROR')
    }
    return p
  }
  const priv = await getPrivateAi(storeId)
  if (!priv || priv.provider !== selected) throw new ProviderSetupError('AI_KEY_MISSING')
  const model = normalizeModel(selected, priv.model) || DEFAULT_MODELS[selected]
  return byoProvider(selected, priv.apiKey, model)
}

/** Estado público de la clave (nunca la clave). */
export function keyStatus(priv: PrivateAi | null) {
  if (!priv) return { configured: false, provider: null, model: null, masked: null, savedAt: null }
  return {
    configured: true,
    provider: priv.provider,
    model: priv.model,
    masked: maskKey(priv.apiKey),
    savedAt: priv.savedAt?.toDate?.().toISOString() ?? null,
  }
}

export async function savePrivateAi(storeId: string, data: { provider: ByoProviderId; apiKey: string; model: string }) {
  await privateAiRef(storeId).set({ ...data, savedAt: FieldValue.serverTimestamp() })
}
