/**
 * Adaptador OpenAI (clave del comerciante) — Chat Completions por fetch, sin SDK.
 *
 *   POST https://api.openai.com/v1/chat/completions
 *     tools: [{ type: 'function', function: { name, description, parameters, strict: true } }]
 *     tool_choice: 'auto' | 'none'
 *     response_format: { type: 'json_schema', json_schema: { name, schema, strict: true } }
 *   GET  https://api.openai.com/v1/models/{model}   (validación de la clave)
 *
 * El modelo es texto libre (default gpt-5-mini). En los modelos de
 * razonamiento (gpt-5*, o*) se pide reasoning_effort 'low' y se deja margen
 * en max_completion_tokens (el razonamiento cuenta ahí).
 */
import {
  AiProviderError, fetchJson,
  type AiChatRequest, type AiChatSession, type AiProvider, type AiToolResult, type AiTurn, type AiUsage,
} from './types.js'

export const OPENAI_DEFAULT_MODEL = 'gpt-5-mini'
const BASE = 'https://api.openai.com/v1'

const isReasoningModel = (model: string) => /^(gpt-5|o\d)/i.test(model)

interface OpenAiToolCall { id: string; type: 'function'; function: { name: string; arguments: string } }
type OpenAiMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OpenAiToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

function errorFrom(status: number, data: Record<string, unknown> | null): AiProviderError {
  const err = (data?.error && typeof data.error === 'object' ? data.error : {}) as Record<string, unknown>
  const code = String(err.code || '')
  const msg = String(err.message || `HTTP ${status}`).slice(0, 300)
  if (status === 401 || status === 403 || code === 'invalid_api_key') return new AiProviderError('INVALID_KEY', msg, status)
  if (status === 404 || code === 'model_not_found') return new AiProviderError('MODEL_NOT_FOUND', msg, status)
  if (status === 429) return new AiProviderError(code === 'insufficient_quota' ? 'QUOTA' : 'RATE_LIMITED', msg, status)
  if (code === 'insufficient_quota' || code === 'billing_hard_limit_reached') return new AiProviderError('QUOTA', msg, status)
  return new AiProviderError('PROVIDER_ERROR', msg, status)
}

class OpenAiSession implements AiChatSession {
  private messages: OpenAiMessage[]
  private apiKey: string
  private model: string
  private req: AiChatRequest
  private usage: AiUsage

  constructor(apiKey: string, model: string, req: AiChatRequest, usage: AiUsage) {
    this.apiKey = apiKey
    this.model = model
    this.req = req
    this.usage = usage
    // Prefijo estable primero (reglas, tienda): OpenAI cachea prefijos solo.
    this.messages = [
      { role: 'system', content: req.rules },
      { role: 'system', content: req.storeBlock },
      { role: 'user', content: req.userText },
    ]
  }

  async next(allowTools: boolean): Promise<AiTurn> {
    const reasoning = isReasoningModel(this.model)
    const body: Record<string, unknown> = {
      model: this.model,
      messages: this.messages,
      max_completion_tokens: reasoning ? this.req.maxTokens + 4000 : this.req.maxTokens,
      response_format: { type: 'json_schema', json_schema: { name: this.req.output.name, schema: this.req.output.schema, strict: true } },
      ...(reasoning ? { reasoning_effort: 'low' } : {}),
    }
    if (this.req.tools.length) {
      body.tools = this.req.tools.map(t => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters, strict: true },
      }))
      body.tool_choice = allowTools ? 'auto' : 'none'
      body.parallel_tool_calls = true
    }
    const { res, data } = await fetchJson(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw errorFrom(res.status, data)

    const u = (data?.usage || {}) as Record<string, unknown>
    const cached = Number((u.prompt_tokens_details as Record<string, unknown> | undefined)?.cached_tokens) || 0
    this.usage.input += Math.max(0, (Number(u.prompt_tokens) || 0) - cached)
    this.usage.cacheRead += cached
    this.usage.output += Number(u.completion_tokens) || 0
    this.usage.calls += 1

    const choice = (Array.isArray(data?.choices) ? data!.choices[0] : null) as Record<string, unknown> | null
    const message = (choice?.message || {}) as Record<string, unknown>
    if (message.refusal) throw new AiProviderError('REFUSED')
    if (choice?.finish_reason === 'content_filter') throw new AiProviderError('REFUSED')

    const calls = (Array.isArray(message.tool_calls) ? message.tool_calls : []) as OpenAiToolCall[]
    const fnCalls = calls.filter(c => c?.type === 'function' && c.function?.name)
    if (fnCalls.length) {
      this.messages.push({ role: 'assistant', content: typeof message.content === 'string' ? message.content : null, tool_calls: fnCalls })
      return {
        toolCalls: fnCalls.map(c => {
          let input: Record<string, unknown> = {}
          try {
            const parsed = JSON.parse(c.function.arguments || '{}')
            if (parsed && typeof parsed === 'object') input = parsed
          } catch { /* argumentos ilegibles: la herramienta responde con error */ }
          return { id: c.id, name: c.function.name, input }
        }),
        text: '',
      }
    }
    return { toolCalls: [], text: typeof message.content === 'string' ? message.content : '' }
  }

  addToolResults(results: AiToolResult[]) {
    for (const r of results) {
      this.messages.push({ role: 'tool', tool_call_id: r.id, content: r.isError ? `ERROR: ${r.content}` : r.content })
    }
  }
}

export function openaiProvider(p: { apiKey: string; model: string }): AiProvider {
  return {
    id: 'openai',
    model: p.model,
    byo: true,
    start: (req, usage) => new OpenAiSession(p.apiKey, p.model, req, usage),
    async validate() {
      const { res, data } = await fetchJson(`${BASE}/models/${encodeURIComponent(p.model)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${p.apiKey}` },
      }, 15_000)
      if (!res.ok) throw errorFrom(res.status, data)
    },
  }
}
