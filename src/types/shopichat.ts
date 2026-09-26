/**
 * ShopiChat — tipos del contrato de datos con el backend (api/whatsapp y el
 * webhook). Los documentos los escribe el SERVIDOR; el cliente solo lee,
 * salvo los campos de organización de la conversación (status, labels, note,
 * unread→0) y las respuestas rápidas (waSettings/automations).
 */
import type { Timestamp } from 'firebase/firestore'

export type WaAccountStatus = 'connected' | 'disconnected' | 'error'

/** stores/{storeId}/waSettings/account */
export interface WaAccount {
  status: WaAccountStatus
  displayNumber?: string
  verifiedName?: string
  phoneNumberId?: string
  wabaId?: string
  coexistence?: boolean
  connectedAt?: Timestamp | null
  lastError?: string | null
  /** Vencimiento del token de Meta. null = no vence (system user permanente). */
  tokenExpiresAt?: Timestamp | null
  /** Lo escribe el servidor (api/_shared/whatsappTokenHealth.ts). Sin campo = sin revisar todavía. */
  tokenStatus?: WaTokenStatus | null
}

export type WaTokenStatus = 'ok' | 'expiring' | 'expired'

export interface WaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS' | string
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION' | string
  text?: string
  buttons?: Array<{ type: string; text?: string; url?: string; phone_number?: string }>
  [key: string]: unknown
}

export interface WaTemplate {
  name: string
  language: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED' | string
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | string
  components: WaTemplateComponent[]
}

/** stores/{storeId}/waSettings/templates */
export interface WaTemplatesDoc {
  items: WaTemplate[]
  syncedAt?: Timestamp | null
}

export interface WaQuickReply {
  shortcut: string
  text: string
}

/** Avisos automáticos de pedidos (fase 2C). Los manda api/whatsapp-notify. */
export type WaOrderEvent = 'received' | 'confirmed' | 'shipped' | 'readyForPickup' | 'delivered' | 'paymentReminder'

/** stores/{storeId}/waSettings/automations.orderNotifications */
export interface WaOrderNotifications {
  received: boolean
  confirmed: boolean
  shipped: boolean
  readyForPickup: boolean
  delivered: boolean
  paymentReminder: { enabled: boolean; delayHours: number }
}

/** Tono del asistente IA (fase 3A). */
export type WaAiTone = 'amigable' | 'profesional' | 'divertido'

/** Copiloto (propone, el comerciante envía) o piloto automático (responde solo). */
export type WaAiMode = 'copilot' | 'autopilot'

/** Quién pone el modelo: la IA incluida de Shopifree o la clave propia del comerciante. */
export type WaAiProvider = 'shopifree' | 'openai' | 'gemini' | 'anthropic'

/** Fuera de horario, el piloto: responde igual, manda el mensaje de ausencia o no hace nada. */
export type WaAiOutsideHours = 'reply' | 'away' | 'silent'

export interface WaAiHours {
  enabled: boolean
  /** Zona horaria IANA (ej. America/Lima). */
  tz: string
  /** 0 = domingo … 6 = sábado. */
  days: number[]
  /** 'HH:MM' */
  from: string
  to: string
}

/**
 * stores/{storeId}/waSettings/automations.ai — IA de ShopiChat (fases 3A/3B).
 * La leen api/shopichat-ai.ts (copiloto) y el piloto automático del webhook.
 * La clave propia NO vive acá: está en stores/{id}/private/ai (solo servidor).
 */
export interface WaAiSettings {
  enabled: boolean
  tone: WaAiTone
  /** Firma al final de las respuestas completas ("— Equipo Lumi"). */
  signature?: string
  /** Preguntas frecuentes, políticas, horarios... (máx. ~4000 caracteres). */
  knowledge: string
  /** Qué decir cuando hay que pasarle el caso a una persona. */
  handoffNote?: string
  mode: WaAiMode
  provider: WaAiProvider
  hours: WaAiHours
  outsideHours: WaAiOutsideHours
  /** Mensaje de ausencia (fuera de horario, con outsideHours 'away'). */
  awayMessage: string
}

/** Estado de la clave propia (api/shopichat-ai 'key-status'). Nunca trae la clave. */
export interface WaAiKeyStatus {
  configured: boolean
  provider: Exclude<WaAiProvider, 'shopifree'> | null
  model: string | null
  /** '…abcd' */
  masked: string | null
  savedAt: string | null
}

/** automations.aiStatus — lo escribe el piloto automático (último error). */
export interface WaAiStatus {
  lastError?: string | null
  at?: Timestamp | null
}

/** Una respuesta propuesta por la IA. */
export interface WaAiSuggestion {
  text: string
  /** Productos que la respuesta recomienda (para mandar su tarjeta). */
  productIds: string[]
}

export type WaAiRewriteMode = 'friendlier' | 'shorter' | 'formal' | 'fix'

/** Eventos que se le pueden mandar al bot propio (fase 3C). */
export type WaBotEvent = 'message.received' | 'message.status' | 'conversation.handoff'

/** 'notify' = solo avisa; 'bot' = el bot responde (reemplaza al piloto automático). */
export type WaBotMode = 'notify' | 'bot'

/**
 * stores/{storeId}/waSettings/automations.botWebhook — "conecta tu propio bot".
 * El secreto de firma NO vive acá: está en stores/{id}/private/botWebhook.
 */
export interface WaBotWebhook {
  enabled: boolean
  url: string
  events: WaBotEvent[]
  mode: WaBotMode
}

/** automations.botWebhookStatus — lo escribe el servidor. */
export interface WaBotWebhookStatus {
  lastDelivery?: {
    at?: Timestamp | null
    event?: string
    ok?: boolean
    status?: number
    error?: string | null
    durationMs?: number
    attempts?: number
  } | null
  consecutiveFailures?: number
  /** Se apagó solo tras muchos fallos seguidos. */
  autoDisabledAt?: Timestamp | null
  /** 'sfwhsec_…abcd' */
  secretHint?: string | null
  secretCreatedAt?: Timestamp | null
}

/** stores/{storeId}/waSettings/automations */
export interface WaAutomations {
  quickReplies: WaQuickReply[]
  orderNotifications: WaOrderNotifications
  ai: WaAiSettings
  aiStatus?: WaAiStatus | null
  botWebhook: WaBotWebhook
  botWebhookStatus?: WaBotWebhookStatus | null
}

export type WaConversationStatus = 'open' | 'pending' | 'done'

/** stores/{storeId}/waConversations/{waId} */
export interface WaConversation {
  /** Id del documento (= waId). */
  id: string
  waId: string
  phone?: string
  name?: string
  lastMessage?: string
  lastMessageAt?: Timestamp | null
  lastDirection?: 'in' | 'out'
  unread?: number
  windowExpiresAt?: Timestamp | null
  status?: WaConversationStatus
  labels?: string[]
  note?: string | null
  optOut?: boolean
  /** Piloto automático pausado en esta conversación (lo pausa la derivación o el comerciante). */
  aiPaused?: boolean
  /** Por qué la IA derivó la conversación a una persona. */
  aiHandoff?: { reason: string; at?: Timestamp | null } | null
  /** Última respuesta enviada por el piloto automático. */
  aiLastReplyAt?: Timestamp | null
  createdAt?: Timestamp | null
  updatedAt?: Timestamp | null
}

export type WaMessageType =
  | 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location'
  | 'template' | 'interactive' | 'button' | 'reaction' | 'unsupported'

export type WaMessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface WaMedia {
  /**
   * Nuestra copia en R2. En un ENTRANTE falta unos segundos (el webhook baja
   * el archivo de Meta después de guardar el mensaje) o para siempre si el
   * archivado falló (`archiveError`): la UI muestra "cargando" / reintentar
   * (acción 'retry-media').
   */
  url: string
  /** Id del archivo en Meta (entrantes). Vale ~30 días para reintentar. */
  mediaId?: string
  /** Por qué no se pudo archivar en R2 (lo escribe el webhook). */
  archiveError?: string
  thumbUrl?: string
  mimeType?: string
  filename?: string
  width?: number
  height?: number
}

/** .../messages/{wamid} */
export interface WaMessage {
  /** Id del documento (= wamid). Los provisionales llevan el prefijo `local-`. */
  id: string
  direction: 'in' | 'out'
  type: WaMessageType
  text?: string
  media?: WaMedia | null
  /** wamid del mensaje citado. */
  replyTo?: string | null
  reactions?: { customer?: string; mine?: string } | null
  status?: WaMessageStatus
  error?: string | null
  /** Código de Meta del fallo de entrega. */
  errorCode?: number | null
  /** Fallo definitivo (sin WhatsApp, marketing apagado...): no vale reintentar. */
  permanent?: boolean
  /**
   * uid de quien lo mandó desde la bandeja, 'phone' si salió de la app
   * WhatsApp Business (coexistencia), 'auto' si es un aviso automático de
   * pedido (api/whatsapp-notify) o 'ai' si lo mandó el piloto automático.
   */
  sentBy?: string
  /** Nota de derivación mandada por la IA. */
  aiHandoff?: boolean
  /** Aviso automático: el pedido y el evento que lo originaron. */
  orderId?: string
  orderEvent?: WaOrderEvent
  template?: { name: string; language: string } | null
  /** Ubicación: el backend puede guardarla así (tolerado si no viene). */
  location?: { latitude: number; longitude: number; name?: string; address?: string } | null
  timestamp?: Timestamp | { toDate: () => Date; toMillis?: () => number } | null
  createdAt?: Timestamp | null
}

/** Mensaje provisional (optimista) que todavía no volvió por la suscripción. */
export interface WaPendingMessage extends WaMessage {
  local: true
  /** wamid real, cuando la API ya respondió. */
  sentId?: string
  /** Para reintentar si falló. */
  retry?: () => void
}

export type WaApiAction =
  | 'status' | 'connect' | 'disconnect' | 'send-text' | 'send-media' | 'mark-read'
  | 'react' | 'sync-templates' | 'send-template' | 'retry-media' | 'upload-url' | 'connect-manual'
  | 'setup-order-templates' | 'bot-webhook-secret' | 'bot-webhook-test'
