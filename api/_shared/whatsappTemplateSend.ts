/**
 * ShopiChat — envío de plantillas (lo comparten api/whatsapp.ts 'send-template'
 * y la API pública POST /api/v1/whatsapp/templates de la fase 3C).
 *
 * Plantilla: funciona FUERA de la ventana (para eso existen). Si viene
 * `phone` y no hay conversación, la crea. Respeta la baja voluntaria. La
 * plantilla sale del catálogo sincronizado; si no está, se sincroniza una vez.
 *
 * Los errores de Meta se LANZAN (MetaError) para que cada caller los traduzca
 * igual que el resto de sus envíos.
 */
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { listWhatsappTemplates, renderTemplateText, sendWhatsappTemplate, type WaTemplate } from './whatsappGraph.js'
import { convRef, previewText, saveOutgoingMessage, waSettingsRef, type PrivateWa } from './whatsappInbox.js'

export async function syncTemplatesFor(storeId: string, token: string, wabaId: string): Promise<WaTemplate[]> {
  const items = await listWhatsappTemplates({ token, wabaId })
  await waSettingsRef(storeId, 'templates').set({ items, syncedAt: FieldValue.serverTimestamp() })
  return items
}

export type TemplateSendResult =
  | { ok: true; messageId: string; waId: string }
  | { ok: false; status: number; error: string; message?: string }

export async function sendTemplateMessage(storeId: string, wa: PrivateWa, p: {
  /** waId ya validado (teléfono o BSUID). */
  waId: string
  /** true = la conversación tiene que existir (vino waId y no phone). */
  requireExisting: boolean
  name: string
  language: string
  params: string[]
  headerText: string | null
  headerImageUrl: string | null
  /** uid del comerciante, 'bot', etc. */
  sentBy: string
}): Promise<TemplateSendResult> {
  const { waId } = p
  const cRef = convRef(storeId, waId)
  const cSnap = await cRef.get()
  if (!cSnap.exists && p.requireExisting) return { ok: false, status: 404, error: 'CONVERSATION_NOT_FOUND' }
  if (cSnap.data()?.optOut === true) return { ok: false, status: 409, error: 'OPTED_OUT', message: 'Este contacto pidio no recibir mas mensajes' }

  const pick = (items: WaTemplate[]) =>
    items.find(t => t.name === p.name && (!p.language || t.language === p.language))
  const tSnap = await waSettingsRef(storeId, 'templates').get()
  let template = pick((tSnap.data()?.items as WaTemplate[]) || [])
  if (!template) template = pick(await syncTemplatesFor(storeId, wa.accessToken, wa.wabaId))
  if (!template) return { ok: false, status: 404, error: 'TEMPLATE_NOT_FOUND' }
  if (template.status !== 'APPROVED') {
    return { ok: false, status: 400, error: 'TEMPLATE_NOT_APPROVED', message: `La plantilla esta en estado ${template.status}` }
  }

  const { waMessageId } = await sendWhatsappTemplate({
    token: wa.accessToken, phoneNumberId: wa.phoneNumberId, to: waId,
    name: template.name, language: template.language, bodyValues: p.params, headerText: p.headerText, headerImageUrl: p.headerImageUrl,
  })

  const text = renderTemplateText(template.components, p.params, p.headerText)
  const convDefaults = cSnap.exists ? {} : {
    waId, phone: /^\d+$/.test(waId) ? waId : null, name: null, labels: [], note: '', optOut: false,
    status: 'open', windowExpiresAt: null, createdAt: FieldValue.serverTimestamp(),
  }
  await saveOutgoingMessage(storeId, waId, waMessageId, {
    type: 'template',
    text,
    template: { name: template.name, language: template.language },
    ...(p.headerImageUrl ? { media: { url: p.headerImageUrl, mimeType: 'image/jpeg' } } : {}),
    status: 'sent',
    sentBy: p.sentBy,
  }, { ...convDefaults, lastMessage: previewText('template', text), lastTemplateAt: Timestamp.now() })
  return { ok: true, messageId: waMessageId, waId }
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/**
 * Lee name / language / params / header del body. params: string[] (contrato)
 * o { body: string[], header?, headerImageUrl? } (forma que manda
 * src/lib/shopichatService.ts). Se aceptan las dos.
 */
export function parseTemplateBody(body: Record<string, unknown>):
  | { ok: true; name: string; language: string; params: string[]; headerText: string | null; headerImageUrl: string | null }
  | { ok: false; status: number; error: string; message?: string } {
  const name = str(body.name, 512)
  const language = str(body.language, 20)
  const rawParams = body.params
  const pObj = rawParams && typeof rawParams === 'object' && !Array.isArray(rawParams) ? (rawParams as Record<string, unknown>) : null
  const bodyList = Array.isArray(rawParams) ? rawParams : Array.isArray(pObj?.body) ? (pObj!.body as unknown[]) : []
  const params = bodyList.slice(0, 20).map(v => String(v ?? '').slice(0, 1000))
  const headerText = str(body.headerText ?? pObj?.header ?? pObj?.headerText, 60) || null
  const headerImageUrl = str(body.headerImageUrl ?? pObj?.headerImageUrl, 2000) || null
  if (!name) return { ok: false, status: 400, error: 'MISSING_TEMPLATE' }
  // Se guarda como media.url y la bandeja la pinta: solo https.
  if (headerImageUrl && !/^https:\/\/[^\s]+$/i.test(headerImageUrl)) {
    return { ok: false, status: 400, error: 'INVALID_HEADER_IMAGE', message: 'La imagen de encabezado tiene que ser una URL https' }
  }
  return { ok: true, name, language, params, headerText, headerImageUrl }
}
