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
}

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

/** stores/{storeId}/waSettings/automations */
export interface WaAutomations {
  quickReplies: WaQuickReply[]
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
  /** uid de quien lo mandó desde la bandeja, o 'phone' si salió de la app WhatsApp Business (coexistencia). */
  sentBy?: string
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
