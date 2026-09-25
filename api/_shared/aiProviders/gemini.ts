/**
 * Adaptador Gemini (clave del comerciante) — Generative Language API por fetch.
 *
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 *     header x-goog-api-key
 *     tools: [{ functionDeclarations: [{ name, description, parameters }] }]
 *     toolConfig: { functionCallingConfig: { mode: 'AUTO' | 'NONE' } }
 *   GET  https://generativelanguage.googleapis.com/v1beta/models/{model}   (validación)
 *
 * Detalles:
 *  - Los schemas de Gemini son un subconjunto de OpenAPI: se quitan
 *    additionalProperties/strict y los tipos van en mayúsculas.
 *  - Con herramientas declaradas no se pide responseMimeType JSON (no siempre
 *    se permite combinarlo con function calling): el formato va en el system y
 *    el motor parsea el JSON de forma tolerante. Sin herramientas se usa
 *    responseSchema.
 *  - El turno del modelo se devuelve tal cual (partes con thoughtSignature
 *    incluidas: los modelos con razonamiento las exigen en la siguiente ronda).
 */
import {
  AiProviderError, fetchJson,
  type AiChatRequest, type AiChatSession, type AiProvider, type AiToolResult, type AiTurn, type AiUsage,
} from './types.js'

export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash'
const BASE = 'https://generativelanguage.googleapis.com/v1beta'

/** JSON Schema → Schema de Gemini (subconjunto OpenAPI). */
function toGeminiSchema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(toGeminiSchema)
  if (!s || typeof s !== 'object') return s
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(s as Record<string, unknown>)) {
    if (k === 'additionalProperties' || k === 'strict' || k === '$schema') continue
    if (k === 'type' && typeof v === 'string') out.type = v.toUpperCase()
    else if (k === 'properties' && v && typeof v === 'object') {
      out.properties = Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([pk, pv]) => [pk, toGeminiSchema(pv)]))
    } else if (k === 'items') out.items = toGeminiSchema(v)
    else out[k] = v
  }
  return out
}

interface GeminiPart {
  text?: string
  thought?: boolean
  functionCall?: { id?: string; name: string; args?: Record<string, unknown> }
  functionResponse?: { id?: string; name: string; response: Record<string, unknown> }
  [key: string]: unknown
}
interface GeminiContent { role: 'user' | 'model'; parts: GeminiPart[] }

function errorFrom(status: number, data: Record<string, unknown> | null): AiProviderError {
  const err = (data?.error && typeof data.error === 'object' ? data.error : {}) as Record<string, unknown>
  const st = String(err.status || '')
  const msg = String(err.message || `HTTP ${status}`).slice(0, 300)
  const details = JSON.stringify(err.details || '')
  if (status === 401 || status === 403 || st === 'PERMISSION_DENIED' || st === 'UNAUTHENTICATED'
    || /API_KEY_INVALID|API key not valid|API key expired/i.test(`${msg} ${details}`)) {
    return new AiProviderError('INVALID_KEY', msg, status)
  }
  if (status === 404 || st === 'NOT_FOUND') return new AiProviderError('MODEL_NOT_FOUND', msg, status)
  // En Gemini el 429 es cuota (por minuto o por día, según el plan).
  if (status === 429 || st === 'RESOURCE_EXHAUSTED') return new AiProviderError('QUOTA', msg, status)
  return new AiProviderError('PROVIDER_ERROR', msg, status)
}

class GeminiSession implements AiChatSession {
  private contents: GeminiContent[]
  private apiKey: string
  private model: string
  private req: AiChatRequest
  private usage: AiUsage
  private system: string
  private seq = 0

  constructor(apiKey: string, model: string, req: AiChatRequest, usage: AiUsage) {
    this.apiKey = apiKey
    this.model = model
    this.req = req
    this.usage = usage
    this.contents = [{ role: 'user', parts: [{ text: req.userText }] }]
    const formatHint = req.tools.length
      ? `\n\nFormato de la respuesta final (cuando no llames herramientas): SOLO un objeto JSON válido, sin texto alrededor ni bloques de código, con este esquema:\n${JSON.stringify(req.output.schema)}`
      : ''
    this.system = `${req.rules}\n\n${req.storeBlock}${formatHint}`
  }

  async next(allowTools: boolean): Promise<AiTurn> {
    const hasTools = this.req.tools.length > 0
    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: this.system }] },
      contents: this.contents,
      generationConfig: {
        // Los modelos 2.5 piensan y ese razonamiento cuenta en maxOutputTokens.
        maxOutputTokens: this.req.maxTokens + 4000,
        ...(hasTools ? {} : { responseMimeType: 'application/json', responseSchema: toGeminiSchema(this.req.output.schema) }),
      },
    }
    if (hasTools) {
      body.tools = [{
        functionDeclarations: this.req.tools.map(t => ({ name: t.name, description: t.description, parameters: toGeminiSchema(t.parameters) })),
      }]
      body.toolConfig = { functionCallingConfig: { mode: allowTools ? 'AUTO' : 'NONE' } }
    }
    const { res, data } = await fetchJson(`${BASE}/models/${encodeURIComponent(this.model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw errorFrom(res.status, data)

    const um = (data?.usageMetadata || {}) as Record<string, unknown>
    const cached = Number(um.cachedContentTokenCount) || 0
    this.usage.input += Math.max(0, (Number(um.promptTokenCount) || 0) - cached)
    this.usage.cacheRead += cached
    this.usage.output += (Number(um.candidatesTokenCount) || 0) + (Number(um.thoughtsTokenCount) || 0)
    this.usage.calls += 1

    if ((data?.promptFeedback as Record<string, unknown> | undefined)?.blockReason) throw new AiProviderError('REFUSED')
    const cand = (Array.isArray(data?.candidates) ? data!.candidates[0] : null) as Record<string, unknown> | null
    const finish = String(cand?.finishReason || '')
    if (['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION'].includes(finish)) throw new AiProviderError('REFUSED')
    const content = (cand?.content || { role: 'model', parts: [] }) as GeminiContent
    const parts = Array.isArray(content.parts) ? content.parts : []

    const calls = parts.filter(p => p.functionCall?.name)
    if (calls.length) {
      this.contents.push({ role: 'model', parts })
      return {
        toolCalls: calls.map(p => ({
          id: p.functionCall!.id || `g${++this.seq}`,
          name: p.functionCall!.name,
          input: (p.functionCall!.args && typeof p.functionCall!.args === 'object' ? p.functionCall!.args : {}) as Record<string, unknown>,
        })),
        text: '',
      }
    }
    const text = parts.filter(p => typeof p.text === 'string' && !p.thought).map(p => p.text).join('')
    return { toolCalls: [], text }
  }

  addToolResults(results: AiToolResult[]) {
    this.contents.push({
      role: 'user',
      parts: results.map(r => {
        let response: Record<string, unknown>
        try {
          const parsed = JSON.parse(r.content)
          response = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { result: parsed }
        } catch {
          response = { result: r.content }
        }
        if (r.isError) response = { error: r.content }
        // El id solo si Gemini lo mandó (los generados acá empiezan con 'g').
        const id = /^g\d+$/.test(r.id) ? undefined : r.id
        return { functionResponse: { ...(id ? { id } : {}), name: r.name, response } }
      }),
    })
  }
}

export function geminiProvider(p: { apiKey: string; model: string }): AiProvider {
  return {
    id: 'gemini',
    model: p.model,
    byo: true,
    start: (req, usage) => new GeminiSession(p.apiKey, p.model, req, usage),
    async validate() {
      const { res, data } = await fetchJson(`${BASE}/models/${encodeURIComponent(p.model)}`, {
        method: 'GET',
        headers: { 'x-goog-api-key': p.apiKey },
      }, 15_000)
      if (!res.ok) throw errorFrom(res.status, data)
    },
  }
}
