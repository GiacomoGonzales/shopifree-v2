/**
 * Adaptador Anthropic (SDK oficial). Lo usan dos proveedores:
 *  - 'shopifree': nuestra clave (ANTHROPIC_API_KEY), modelo fijo. Es el
 *    comportamiento de la fase 3A, sin cambios.
 *  - 'anthropic': la clave del comerciante, modelo de una lista corta.
 *
 * Mismo pedido que en 3A: thinking apagado + effort bajo (Sonnet 5), salida
 * JSON con output_config.format, herramientas strict, y el system en dos
 * bloques (reglas + tienda) con cache_control en el segundo para que las
 * rondas de herramientas reusen herramientas + system.
 */
import Anthropic from '@anthropic-ai/sdk'
import {
  AiProviderError, PROVIDER_TIMEOUT_MS,
  type AiChatRequest, type AiChatSession, type AiProvider, type AiProviderId, type AiToolResult, type AiTurn, type AiUsage,
} from './types.js'

/** Modelo del proveedor incluido (Shopifree). */
export const SHOPIFREE_MODEL = 'claude-sonnet-5'

/** Modelos que el comerciante puede elegir con su clave de Anthropic. */
export const ANTHROPIC_MODELS = ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5'] as const
export const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-5'

/**
 * Ajustes por modelo:
 *  - Sonnet 5: thinking disabled + effort low (idéntico a la fase 3A).
 *  - Opus 5: thinking adaptativo (apagarlo tiene fallas conocidas) con effort low.
 *  - Haiku 4.5: no acepta effort; sin thinking.
 */
function modelParams(model: string): Pick<Anthropic.MessageCreateParamsNonStreaming, 'thinking'> & { effort: 'low' | null } {
  if (model === 'claude-haiku-4-5') return { effort: null }
  if (model === 'claude-opus-5') return { thinking: { type: 'adaptive' }, effort: 'low' }
  return { thinking: { type: 'disabled' }, effort: 'low' }
}

function mapError(e: unknown): never {
  if (e instanceof AiProviderError) throw e
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    throw new AiProviderError('INVALID_KEY', e.message, e.status ?? null)
  }
  if (e instanceof Anthropic.NotFoundError) throw new AiProviderError('MODEL_NOT_FOUND', e.message, 404)
  if (e instanceof Anthropic.RateLimitError) throw new AiProviderError('RATE_LIMITED', e.message, 429)
  if (e instanceof Anthropic.BadRequestError) {
    // Sin saldo llega como 400 invalid_request_error ("credit balance is too low").
    if (/credit balance|billing/i.test(e.message)) throw new AiProviderError('QUOTA', e.message, 400)
    throw new AiProviderError('PROVIDER_ERROR', e.message, 400)
  }
  if (e instanceof Anthropic.APIError) throw new AiProviderError('PROVIDER_ERROR', e.message, e.status ?? null)
  throw new AiProviderError('PROVIDER_ERROR', (e as Error)?.message)
}

function addUsage(u: AiUsage, r: Anthropic.Message) {
  u.input += r.usage?.input_tokens || 0
  u.output += r.usage?.output_tokens || 0
  u.cacheRead += r.usage?.cache_read_input_tokens || 0
  u.cacheWrite += r.usage?.cache_creation_input_tokens || 0
  u.calls += 1
}

class AnthropicSession implements AiChatSession {
  private messages: Anthropic.MessageParam[]
  private system: Anthropic.TextBlockParam[]
  private tools: Anthropic.Tool[]
  private client: Anthropic
  private model: string
  private req: AiChatRequest
  private usage: AiUsage

  constructor(client: Anthropic, model: string, req: AiChatRequest, usage: AiUsage) {
    this.client = client
    this.model = model
    this.req = req
    this.usage = usage
    this.messages = [{ role: 'user', content: req.userText }]
    this.system = [
      { type: 'text', text: req.rules },
      { type: 'text', text: req.storeBlock, cache_control: { type: 'ephemeral' } },
    ]
    this.tools = req.tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool['input_schema'],
      strict: true,
    }))
  }

  async next(allowTools: boolean): Promise<AiTurn> {
    const { thinking, effort } = modelParams(this.model)
    let r: Anthropic.Message
    try {
      r = await this.client.messages.create({
        model: this.model,
        max_tokens: this.req.maxTokens,
        ...(thinking ? { thinking } : {}),
        output_config: {
          ...(effort ? { effort } : {}),
          format: { type: 'json_schema', schema: this.req.output.schema },
        },
        system: this.system,
        // Las herramientas van siempre (aunque no se permitan) para no romper la caché.
        ...(this.tools.length
          ? { tools: this.tools, tool_choice: allowTools ? { type: 'auto' as const } : { type: 'none' as const } }
          : {}),
        messages: this.messages,
      })
    } catch (e) {
      mapError(e)
    }
    addUsage(this.usage, r)
    if (r.stop_reason === 'refusal') throw new AiProviderError('REFUSED')
    const uses = r.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (r.stop_reason === 'tool_use' && uses.length) {
      this.messages.push({ role: 'assistant', content: r.content })
      return {
        toolCalls: uses.map(u => ({
          id: u.id,
          name: u.name,
          input: (u.input && typeof u.input === 'object' ? u.input : {}) as Record<string, unknown>,
        })),
        text: '',
      }
    }
    const text = r.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('')
    return { toolCalls: [], text }
  }

  addToolResults(results: AiToolResult[]) {
    this.messages.push({
      role: 'user',
      content: results.map(x => ({
        type: 'tool_result' as const,
        tool_use_id: x.id,
        content: x.content,
        ...(x.isError ? { is_error: true } : {}),
      })),
    })
  }
}

export function anthropicProvider(p: { id: Extract<AiProviderId, 'shopifree' | 'anthropic'>; apiKey: string; model: string }): AiProvider {
  const client = new Anthropic({ apiKey: p.apiKey, timeout: PROVIDER_TIMEOUT_MS, maxRetries: 1 })
  return {
    id: p.id,
    model: p.model,
    byo: p.id !== 'shopifree',
    start: (req, usage) => new AnthropicSession(client, p.model, req, usage),
    // GET /v1/models/{id}: valida la clave y que el modelo exista, sin generar.
    async validate() {
      try {
        await client.models.retrieve(p.model)
      } catch (e) {
        mapError(e)
      }
    },
  }
}
