/**
 * Mail al admin cuando Sofía escala un chat de soporte (api/ai-chat.ts).
 *
 * Se manda por Resend, igual que api/send-email.ts (RESEND_API_KEY y
 * RESEND_FROM_EMAIL). El destino es ADMIN_EMAIL o, si no está, el admin
 * principal de ADMIN_EMAILS. Nunca tira: si falla devuelve false y el chat
 * sigue funcionando.
 */
import { Resend } from 'resend'
import { ADMIN_EMAILS } from './admin.js'

export const SUPPORT_CHATS_URL = 'https://shopifree.app/es/dashboard/support-chats'

export interface EscalationEmailData {
  storeName: string
  userEmail: string
  plan: string
  reason: string
  subdomain?: string
  // Últimos mensajes del chat, del más viejo al más nuevo
  messages: { from: string; text: string }[]
}

// Todo lo que viene del chat o de la tienda lo escribe el usuario: se escapa.
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function oneLine(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  return clean.length > max ? clean.slice(0, max - 1) + '…' : clean
}

export async function sendEscalationEmail(data: EscalationEmailData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[escalation-email] RESEND_API_KEY no configurada, no se manda el mail')
    return false
  }
  try {
    const resend = new Resend(apiKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Giacomo de Shopifree <hola@shopifree.app>'
    const adminEmail = process.env.ADMIN_EMAIL || ADMIN_EMAILS[0]

    const storeLabel = data.subdomain ? `${data.storeName} (${data.subdomain}.shopifree.app)` : data.storeName
    const messagesHtml = data.messages.map(m =>
      `<tr><td style="padding:6px 8px;vertical-align:top;color:#64748b;font-size:12px;white-space:nowrap">${escapeHtml(m.from)}</td>`
      + `<td style="padding:6px 8px;font-size:13px;color:#1e293b">${escapeHtml(oneLine(m.text, 600))}</td></tr>`
    ).join('')
    const messagesText = data.messages.map(m => `${m.from}: ${oneLine(m.text, 600)}`).join('\n')

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: `Soporte: ${oneLine(data.storeName, 60)} necesita al equipo`,
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px">
<p style="font-size:15px">Sofía escaló un chat de soporte.</p>
<table style="font-size:14px;border-collapse:collapse;margin-bottom:12px">
<tr><td style="padding:2px 12px 2px 0;color:#64748b">Tienda</td><td><strong>${escapeHtml(storeLabel)}</strong></td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#64748b">Usuario</td><td>${escapeHtml(data.userEmail)}</td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#64748b">Plan</td><td>${escapeHtml(data.plan)}</td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#64748b">Motivo</td><td><strong>${escapeHtml(data.reason)}</strong></td></tr>
</table>
<p style="font-size:13px;color:#64748b;margin:16px 0 4px">Últimos mensajes</p>
<table style="border-collapse:collapse;width:100%;background:#f8fafc;border-radius:8px">${messagesHtml}</table>
<p style="margin:20px 0">
<a href="${SUPPORT_CHATS_URL}" style="display:inline-block;padding:12px 20px;background:#1e3a5f;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Abrir chats de soporte</a>
</p>
</div>`,
      text: `Sofía escaló un chat de soporte.\n\nTienda: ${storeLabel}\nUsuario: ${data.userEmail}\nPlan: ${data.plan}\nMotivo: ${data.reason}\n\nÚltimos mensajes:\n${messagesText}\n\nAbrir: ${SUPPORT_CHATS_URL}`,
    })
    if (error) {
      console.error('[escalation-email] Resend error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[escalation-email] Error:', err)
    return false
  }
}
