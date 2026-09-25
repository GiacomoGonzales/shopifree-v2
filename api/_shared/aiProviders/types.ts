/**
 * ShopiChat IA — contrato común de los proveedores de modelos (fase 3B).
 *
 * El motor (api/_shared/shopichatAiEngine.ts) arma el contexto, las
 * herramientas y el prompt UNA vez; cada adaptador traduce eso al formato de
 * su proveedor (Anthropic, OpenAI, Gemini) y devuelve turnos neutros:
 * llamadas a herramientas o el texto final (JSON). El bucle de herramientas
 * (máx. rondas / llamadas) vive en el motor, igual para todos.
 */

export type AiProviderId = 'shopifree' | 'anthropic' | 'openai' | 'gemini'
export const AI_PROVIDERS: AiProviderId[] = ['shopifree', 'anthropic', 'openai', 'gemini']
/** Proveedores con clave propia del comerciante (BYO). */
export type ByoProviderId = Exclude<AiProviderId, 'shopifree'>
export const BYO_PROVIDERS: ByoProviderId[] = ['anthropic', 'openai', 'gemini']

/**
 * Errores de proveedor con código estable (la UI los traduce):
 *  - INVALID_KEY      clave inválida, revocada o sin permiso
 *  - QUOTA            sin saldo / cuota agotada en la cuenta del proveedor
 *  - RATE_LIMITED     límite de velocidad momentáneo (reintentar)
 *  - MODEL_NOT_FOUND  el modelo no existe o la clave no tiene acceso
 *  - REFUSED          el modelo se negó (seguridad)
 *  - PROVIDER_ERROR   cualquier otra cosa (5xx, red, respuesta ilegible)
 */
export type AiErrorCode = 'INVALID_KEY' | 'QUOTA' | 'RATE_LIMITED' | 'MODEL_NOT_FOUND' | 'REFUSED' | 'PROVIDER_ERROR'

export class AiProviderError extends Error {
  code: AiErrorCode
  httpStatus: number | null
  constructor(code: AiErrorCode, detail?: string, httpStatus: number | null = null) {
    super(detail ? `${code}: ${detail}` : code)
    this.code = code
    this.httpStatus = httpStatus
  }
}

/** Herramienta en JSON Schema (object con additionalProperties: false). */
export interface AiToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface AiToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface AiToolResult {
  id: string
  name: string
  content: string
  isError?: boolean
}

export interface AiUsage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  calls: number
}

export const newUsage = (): AiUsage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0 })

export interface AiChatRequest {
  /** Reglas fijas (iguales para todas las tiendas: cacheables). */
  rules: string
  /** Bloque de la tienda (datos, tono, conocimiento). */
  storeBlock: string
  /** El pedido concreto (conversación, borrador, instrucciones). */
  userText: string
  /** Herramientas disponibles (vacío = sin herramientas). */
  tools: AiToolDef[]
  /** Formato de la respuesta final (JSON Schema estricto). */
  output: { name: string; schema: Record<string, unknown> }
  maxTokens: number
}

/** Un turno del modelo: o pide herramientas, o termina con texto (JSON). */
export interface AiTurn {
  toolCalls: AiToolCall[]
  text: string
}

export interface AiChatSession {
  /** Una llamada al modelo. allowTools=false fuerza la respuesta final. */
  next(allowTools: boolean): Promise<AiTurn>
  /** Resultados de las herramientas del último turno (todos juntos). */
  addToolResults(results: AiToolResult[]): void
}

export interface AiProvider {
  id: AiProviderId
  model: string
  /** true = clave del comerciante (no consume el cupo de Shopifree). */
  byo: boolean
  start(req: AiChatRequest, usage: AiUsage): AiChatSession
  /** Prueba barata de la clave y el modelo (sin generar texto si se puede). */
  validate(): Promise<void>
}

/** Timeout por llamada al modelo (ms). */
export const PROVIDER_TIMEOUT_MS = 40_000

/**
 * fetch con timeout y errores de red → PROVIDER_ERROR. Devuelve la respuesta
 * y el JSON (o null si no es JSON).
 */
export async function fetchJson(url: string, init: RequestInit, timeoutMs = PROVIDER_TIMEOUT_MS): Promise<{ res: Response; data: Record<string, unknown> | null }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null
    return { res, data }
  } catch (e) {
    throw new AiProviderError('PROVIDER_ERROR', (e as Error).name === 'AbortError' ? 'timeout' : 'network')
  } finally {
    clearTimeout(timer)
  }
}

/** JSON de la respuesta final; tolera ```json ... ``` o texto alrededor. */
export function parseJsonLoose(text: string): unknown | null {
  const t = String(text || '').trim()
  if (!t) return null
  try {
    return JSON.parse(t)
  } catch { /* sigue */ }
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    try { return JSON.parse(fenced[1]) } catch { /* sigue */ }
  }
  const a = t.indexOf('{')
  const b = t.lastIndexOf('}')
  if (a >= 0 && b > a) {
    try { return JSON.parse(t.slice(a, b + 1)) } catch { /* nada */ }
  }
  return null
}

/** Últimos 4 caracteres de una clave, para mostrar "…abcd". */
export const maskKey = (key: string) => (key && key.length >= 8 ? `…${key.slice(-4)}` : '…')
