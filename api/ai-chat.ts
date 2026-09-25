import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, type Firestore, FieldValue, Timestamp, type DocumentReference, type DocumentData, type Query } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt, buildEscalatedNote } from './_shared/sofia-knowledge.js'
import { hasPaidEffectivePlan } from './_shared/plan.js'
import { checkIpRateLimit, checkRateLimit } from './_shared/orderTotal.js'
import { sendEscalationEmail } from './_shared/escalation-email.js'
import { toPlanDate } from '../src/lib/plans.js'

let db: Firestore

function getDb(): Firestore {
  if (!db) {
    if (!getApps().length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        })
      })
    }
    db = getFirestore()
  }
  return db
}

interface RequestBody {
  chatId: string
  storeId: string
  userMessage: string
  userId: string
}

// Sofía's knowledge base lives in ./_shared/sofia-knowledge.ts (plan
// prices/limits injected from src/lib/plans.ts). Built once at load.
const SYSTEM_PROMPT = buildSystemPrompt()

// Si un admin escribió en el chat hace menos de esto, Sofía no responde para
// no pisar a la persona que está atendiendo.
const ADMIN_ACTIVE_WINDOW_MS = 30 * 60 * 1000
// Mail de escalación: como mucho uno cada 30 min por chat, salvo que cambie el
// motivo; y aun con motivo nuevo, nunca dos en menos de 5 min (tope anti-spam:
// el motivo lo redacta el modelo y el camino con token no tiene rate limit).
const EMAIL_THROTTLE_MS = 30 * 60 * 1000
const EMAIL_MIN_GAP_MS = 5 * 60 * 1000
// [ESCALATE] o [ESCALATE: motivo]
const ESCALATE_RE = /\[ESCALATE(?:\s*:\s*([^\]]*))?\]/gi
const TEAM_PREFIX = '[Equipo Shopifree]'

const DAY_MS = 24 * 60 * 60 * 1000

// Todo lo que va al system prompt y viene de la tienda lo escribe el merchant:
// una línea, acotado.
function oneLine(value: unknown, max = 120): string {
  const clean = String(value ?? '').replace(/\s+/g, ' ').trim()
  return clean.length > max ? clean.slice(0, max - 1) + '…' : clean
}

function isoDay(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null
}

function normalizeReason(r: unknown): string {
  return String(r ?? '').toLowerCase().replace(/[^a-z0-9áéíóúñü ]/gi, '').replace(/\s+/g, ' ').trim()
}

async function safeCount(q: Query): Promise<number | null> {
  try {
    return (await q.count().get()).data().count
  } catch (err) {
    console.error('[ai-chat] count error:', err)
    return null
  }
}

function effectivePlanOf(storeData: DocumentData | null | undefined): string {
  if (!storeData) return 'free'
  return hasPaidEffectivePlan(storeData) ? (storeData.plan || 'free') : 'free'
}

/**
 * Contexto de la tienda para Sofía. Solo la tienda del chat (ya validada como
 * del usuario). Nunca lee stores/{id}/private ni credenciales: de las
 * pasarelas solo se mira enabled/modo prueba.
 */
async function buildStoreContext(firestore: Firestore, storeId: string, storeData: DocumentData): Promise<string> {
  const storeRef = firestore.collection('stores').doc(storeId)
  const since = Timestamp.fromMillis(Date.now() - 30 * DAY_MS)

  const [productsSnap, ordersSnap, productCount, categoryCount, orders30d] = await Promise.all([
    storeRef.collection('products').limit(10).get().catch(() => null),
    storeRef.collection('orders').orderBy('createdAt', 'desc').limit(5).get().catch(() => null),
    safeCount(storeRef.collection('products')),
    safeCount(storeRef.collection('categories')),
    safeCount(storeRef.collection('orders').where('createdAt', '>=', since)),
  ])

  const lines: string[] = []
  lines.push(`- Fecha de hoy: ${isoDay(new Date())}`)
  lines.push(`- Nombre: ${oneLine(storeData.name || 'Sin nombre', 80)}`)
  if (storeData.subdomain) {
    lines.push(`- Link de la tienda: https://${oneLine(storeData.subdomain, 60)}.shopifree.app (subdominio: ${oneLine(storeData.subdomain, 60)})`)
  }
  if (storeData.customDomain) {
    const st = storeData.domainStatus === 'verified' ? 'verificado' : storeData.domainStatus === 'pending_verification' ? 'pendiente de verificación DNS' : (storeData.domainStatus ? oneLine(storeData.domainStatus, 30) : 'estado desconocido')
    lines.push(`- Dominio propio: ${oneLine(storeData.customDomain, 80)} (${st})`)
  } else {
    lines.push('- Dominio propio: no configurado')
  }
  const country = storeData.location?.country
  lines.push(`- País: ${country ? oneLine(country, 10) : 'no configurado'} · Moneda: ${storeData.currency ? oneLine(storeData.currency, 10) : 'no configurada'}`)

  // Plan efectivo (no el guardado: una prueba vencida puede seguir como 'pro'
  // hasta que corra el cron) + estado de prueba/suscripción, para que Sofía
  // no ofrezca pruebas que no existen ni invente fechas.
  const plan = effectivePlanOf(storeData)
  lines.push(`- Plan actual (efectivo): ${plan}${storeData.plan && storeData.plan !== plan ? ` (guardado como ${storeData.plan}, pero ya no está vigente)` : ''}`)
  const trialEnd = toPlanDate(storeData.trialEndsAt)
  const sub = storeData.subscription
  if (sub) {
    const renew = isoDay(toPlanDate(sub.currentPeriodEnd))
    let subLine = `- Suscripción Stripe: ${oneLine(sub.status || 'desconocido', 20)}`
    const ended = ['canceled', 'incomplete_expired', 'unpaid', 'paused'].includes(sub.status)
    if (renew) {
      subLine += ended
        ? `, fin del último periodo: ${renew}`
        : sub.cancelAtPeriodEnd ? `, cancelada: se termina el ${renew} (no se renueva)` : `, próxima renovación el ${renew}`
    }
    if (sub.status === 'past_due') subLine += ' (hay un cobro fallido que Stripe está reintentando)'
    lines.push(subLine)
  } else {
    lines.push('- Suscripción Stripe: no tiene')
    if (trialEnd) {
      lines.push(trialEnd.getTime() > Date.now()
        ? `- Prueba gratis de Pro: activa, termina el ${isoDay(trialEnd)}`
        : `- Prueba gratis de Pro: ya la usó (terminó el ${isoDay(trialEnd)}); no tiene otra`)
    } else if (plan !== 'free') {
      lines.push('- Plan otorgado por el equipo (sin suscripción)')
    }
  }

  const appStatus = storeData.appConfig?.status || 'none'
  const appLabel: Record<string, string> = { none: 'sin solicitar', requested: 'solicitada', building: 'en construcción', published: 'publicada' }
  lines.push(`- Mi App (app móvil): ${appLabel[appStatus] || oneLine(appStatus, 20)}`)

  lines.push(`- Productos: ${productCount ?? 'desconocido'} · Categorías: ${categoryCount ?? 'desconocido'}`)
  const products = productsSnap?.docs.map(d => d.data()) || []
  if (products.length > 0) {
    lines.push(`- Algunos productos: ${products.map(p => `${oneLine(p.name, 40)} (${p.price ?? '?'})`).join(', ')}`)
  }
  lines.push(`- Pedidos de los últimos 30 días: ${orders30d ?? 'desconocido'} (incluye ventas manuales y de prueba)`)
  const orders = ordersSnap?.docs.map(d => d.data()) || []
  if (orders.length > 0) {
    lines.push(`- Pedidos recientes: ${orders.map(o => `#${oneLine(o.orderNumber, 20)} (${oneLine(o.status, 20)}, ${isoDay(toPlanDate(o.createdAt)) || 's/f'})`).join(', ')}`)
  }

  // Pasarelas: solo enabled y modo prueba. Nunca claves.
  const pay = storeData.payments || {}
  const gateways: string[] = []
  if (pay.whatsapp?.enabled !== false) gateways.push('WhatsApp')
  if (pay.mercadopago?.enabled) gateways.push(`MercadoPago${pay.mercadopago.sandbox ? ' (modo prueba)' : ''}`)
  if (pay.stripe?.enabled) gateways.push(`Stripe${pay.stripe.testMode ? ' (modo test)' : ''}`)
  if (pay.paypal?.enabled) gateways.push(`PayPal${pay.paypal.sandbox ? ' (sandbox)' : ''}`)
  if (pay.gocuotas?.enabled) gateways.push(`Go Cuotas${pay.gocuotas.sandbox ? ' (sandbox)' : ''}`)
  lines.push(`- Métodos de pago activos: ${gateways.length ? gateways.join(', ') : 'ninguno'}`)

  const sh = storeData.shipping
  if (sh) {
    const methods: string[] = []
    if (sh.deliveryEnabled !== false) methods.push('delivery')
    if (sh.pickupEnabled !== false) methods.push('retiro en tienda')
    const coverage: Record<string, string> = { nationwide: 'nacional', zones: 'por zonas', local: 'local (solo su ciudad)' }
    const parts = [
      `métodos: ${methods.join(' y ') || 'ninguno'}`,
      `cobertura: ${coverage[sh.coverageMode || 'nationwide'] || oneLine(sh.coverageMode, 20)}`,
    ]
    if (sh.coverageMode === 'zones' && Array.isArray(sh.allowedZones)) parts.push(`${sh.allowedZones.length} zona(s)`)
    if (Array.isArray(sh.allowedDistricts) && sh.allowedDistricts.length) parts.push(`${sh.allowedDistricts.length} distrito(s) permitidos`)
    parts.push(sh.enabled ? `con costo (fijo ${sh.cost ?? 0}${sh.freeAbove ? `, gratis desde ${sh.freeAbove}` : ''})` : 'sin costo de envío')
    parts.push(`pide barrio/distrito en checkout: ${sh.askDistrict === false ? 'no' : 'sí'}`)
    if (sh.internationalShipping) parts.push('acepta envíos internacionales')
    lines.push(`- Envíos: ${parts.join('; ')}`)
  } else {
    lines.push('- Envíos: sin configurar (valores por defecto)')
  }

  return `\n\n## Contexto de la tienda del usuario\n${lines.join('\n')}`
}

/**
 * Reserva el envío del mail de escalación en una transacción (dos mensajes
 * seguidos no mandan dos mails) y guarda el motivo. Devuelve si hay que
 * mandar y el valor anterior de lastEscalationEmailAt (para revertir si
 * Resend falla).
 */
async function claimEscalationEmail(
  firestore: Firestore,
  chatRef: DocumentReference,
  reason: string,
): Promise<{ send: boolean; prevAt: Timestamp | null }> {
  return firestore.runTransaction(async tx => {
    const snap = await tx.get(chatRef)
    const data = snap.data() || {}
    const prevAt: Timestamp | null = data.lastEscalationEmailAt instanceof Timestamp ? data.lastEscalationEmailAt : null
    const elapsed = prevAt ? Date.now() - prevAt.toMillis() : Infinity
    const reasonChanged = normalizeReason(data.escalationReason) !== normalizeReason(reason)
    const send = elapsed >= EMAIL_THROTTLE_MS || (reasonChanged && elapsed >= EMAIL_MIN_GAP_MS)
    const update: Record<string, unknown> = { escalationReason: reason }
    if (send) update.lastEscalationEmailAt = Timestamp.now()
    tx.update(chatRef, update)
    return { send, prevAt }
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { chatId, storeId, userMessage, userId: bodyUserId } = (req.body || {}) as RequestBody

  if (!chatId || !storeId || !userMessage || typeof userMessage !== 'string') {
    return res.status(400).json({ error: 'Missing required parameters' })
  }

  const firestore = getDb()

  // El uid sale del Firebase ID token, no del body: antes body.userId y
  // storeId los elegia el caller y se podia leer el contexto de otra tienda
  // (plan, productos, pedidos) y gastar tokens de Anthropic sin cuenta.
  //
  // Compat: las apps nativas ya publicadas (bundle viejo) llaman sin token y
  // mandan body.userId. Se acepta SOLO sin header Authorization (un token
  // invalido sigue siendo 401), con rate limit por IP y por chat, y con los
  // mismos chequeos de abajo (chat.userId y store.ownerId == userId). La
  // respuesta no devuelve contexto: Sofia escribe en el chat, que solo lee su
  // dueno, asi que lo peor es gastar tokens (acotado por el rate limit).
  const authHeader = req.headers.authorization || ''
  let userId: string
  if (authHeader.startsWith('Bearer ')) {
    try {
      userId = (await getAuth().verifyIdToken(authHeader.slice(7))).uid
    } catch {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  } else if (!authHeader && typeof bodyUserId === 'string' && bodyUserId) {
    if (
      !(await checkIpRateLimit(firestore, req, 'ai-chat-legacy', 20))
      || !(await checkRateLimit(firestore, 'ai-chat-legacy-chat', String(chatId), 15, 600))
    ) {
      return res.status(429).json({ error: 'Too many requests' })
    }
    userId = bodyUserId
  } else {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const chatRef = firestore.collection('chats').doc(chatId)
    const chatDoc = await chatRef.get()
    const chatData = chatDoc.data()
    // Verify chat belongs to user
    if (!chatDoc.exists || !chatData || chatData.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }
    const alreadyEscalated = !!chatData.escalated

    // El admin pausó las respuestas automáticas de este chat
    if (chatData.aiPaused) {
      return res.status(200).json({ success: true, escalated: alreadyEscalated, skipped: true })
    }

    // Historial (últimos 20 mensajes). Se lee antes que la tienda para poder
    // cortar temprano si hay un humano atendiendo.
    const historySnap = await chatRef.collection('messages')
      .orderBy('createdAt', 'asc')
      .limitToLast(20)
      .get()

    // Un admin está atendiendo: último mensaje del equipo hace < 30 min →
    // Sofía no habla encima. senderId distinto del dueño del chat: el dueño
    // puede crear mensajes (reglas) y no queremos que un senderType falso
    // cuente como admin.
    let lastAdminAt = 0
    for (const d of historySnap.docs) {
      const m = d.data()
      if (m.senderType === 'admin' && m.senderId !== chatData.userId) {
        const t = toPlanDate(m.createdAt)?.getTime() ?? 0
        if (t > lastAdminAt) lastAdminAt = t
      }
    }
    if (lastAdminAt && Date.now() - lastAdminAt < ADMIN_ACTIVE_WINDOW_MS) {
      return res.status(200).json({ success: true, escalated: alreadyEscalated, skipped: true })
    }

    // Tienda: la del chat (no la que elija el caller) y solo si es del usuario
    const effectiveStoreId: string = typeof chatData.storeId === 'string' && chatData.storeId ? chatData.storeId : storeId
    const storeDoc = await firestore.collection('stores').doc(effectiveStoreId).get()
    const storeData = storeDoc.exists ? storeDoc.data() : null
    if (storeData && storeData.ownerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    let contextBlock = ''
    if (storeData) {
      try {
        contextBlock = await buildStoreContext(firestore, effectiveStoreId, storeData)
      } catch (ctxErr) {
        console.error('[ai-chat] store context error:', ctxErr)
      }
    }

    const history: Anthropic.MessageParam[] = []
    for (const doc of historySnap.docs) {
      const data = doc.data()
      const role = data.senderType === 'user' ? 'user' as const : 'assistant' as const
      let textContent: string = typeof data.text === 'string' ? data.text : ''
      // Mensajes nuevos usan imageUrls (array); los viejos, imageUrl
      const imageUrls: string[] = Array.isArray(data.imageUrls)
        ? data.imageUrls.filter((u: unknown): u is string => typeof u === 'string')
        : (typeof data.imageUrl === 'string' && data.imageUrl ? [data.imageUrl] : [])

      const contentBlocks: Anthropic.ContentBlockParam[] = []
      if (role === 'user') {
        for (const url of imageUrls.slice(0, 4)) {
          contentBlocks.push({ type: 'image', source: { type: 'url', url } })
        }
      }
      if (textContent === 'Imagen') textContent = ''
      // Los mensajes del equipo humano se marcan para que Sofía no los tome
      // como propios
      if (textContent && data.senderType === 'admin') textContent = `${TEAM_PREFIX} ${textContent}`
      if (textContent) {
        contentBlocks.push({ type: 'text', text: textContent })
      }
      // If only an image with no real text, add a description
      if (contentBlocks.length > 0 && !contentBlocks.some(b => b.type === 'text')) {
        contentBlocks.push({ type: 'text', text: '(El usuario envió una imagen)' })
      }
      if (contentBlocks.length === 0) continue

      // Mensajes seguidos del mismo rol se juntan en un solo turno
      const last = history[history.length - 1]
      if (last && last.role === role) {
        const prev: Anthropic.ContentBlockParam[] = typeof last.content === 'string'
          ? [{ type: 'text', text: last.content }]
          : [...last.content]
        last.content = [...prev, ...contentBlocks]
      } else if (contentBlocks.length === 1 && contentBlocks[0].type === 'text') {
        history.push({ role, content: (contentBlocks[0] as Anthropic.TextBlockParam).text })
      } else {
        history.push({ role, content: contentBlocks })
      }
    }

    // Ensure history starts with user: remove leading assistant messages
    while (history.length > 0 && history[0].role === 'assistant') {
      history.shift()
    }
    // Y que termine en el usuario (si no, el mensaje actual todavía no está)
    if (history.length === 0 || history[history.length - 1].role !== 'user') {
      history.push({ role: 'user', content: userMessage })
    }

    const systemPrompt = SYSTEM_PROMPT
      + (alreadyEscalated ? buildEscalatedNote(chatData.escalationReason ? oneLine(chatData.escalationReason, 200) : null) : '')
      + contextBlock

    // Call Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    let aiResponse: string
    let escalate = false
    let reason = ''

    try {
      const completion = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 500,
        thinking: { type: 'disabled' },
        system: systemPrompt,
        messages: history,
      })

      aiResponse = completion.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('')

      // Detectar escalación: [ESCALATE] o [ESCALATE: motivo]
      aiResponse = aiResponse.replace(ESCALATE_RE, (_m, r?: string) => {
        escalate = true
        if (!reason && r) reason = oneLine(r, 200)
        return ''
      }).trim()
      // Por si el modelo imita la marca de los mensajes del equipo
      if (aiResponse.startsWith(TEAM_PREFIX)) aiResponse = aiResponse.slice(TEAM_PREFIX.length).trim()
      if (!aiResponse) {
        aiResponse = alreadyEscalated || escalate
          ? 'El equipo ya tiene tu caso y te va a responder por este chat lo antes posible.'
          : 'Perdón, ¿me lo podés contar con un poco más de detalle?'
      }
    } catch (aiError) {
      console.error('[ai-chat] Claude API error:', aiError)
      if (alreadyEscalated) {
        // El caso ya lo tiene el equipo: no hace falta otro mail
        aiResponse = 'Disculpa, estoy teniendo dificultades técnicas en este momento. El equipo ya tiene tu caso y te va a responder por este chat lo antes posible.'
      } else {
        aiResponse = 'Disculpa, estoy teniendo dificultades técnicas en este momento. Te conecto con nuestro equipo de soporte para ayudarte mejor.'
        escalate = true
        reason = 'Sofía no pudo responder (error técnico de la IA)'
      }
    }

    // Write AI response to Firestore
    await chatRef.collection('messages').add({
      text: aiResponse,
      senderId: 'ai-assistant',
      senderType: 'assistant',
      createdAt: FieldValue.serverTimestamp(),
    })

    // Update chat metadata
    const chatUpdate: Record<string, unknown> = {
      lastMessage: aiResponse,
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageBy: 'assistant',
    }
    if (escalate) {
      chatUpdate.escalated = true
      // Increment unreadByAdmin so admin sees it
      chatUpdate.unreadByAdmin = FieldValue.increment(1)
    }
    await chatRef.update(chatUpdate)

    // Mail al admin (primera escalación o pedido nuevo en un chat escalado).
    // Nada de esto puede romper la respuesta del chat.
    if (escalate) {
      const finalReason = reason || (typeof chatData.escalationReason === 'string' && chatData.escalationReason) || 'Sin motivo especificado'
      try {
        const { send, prevAt } = await claimEscalationEmail(firestore, chatRef, finalReason)
        if (send) {
          const label = (t: unknown) => t === 'user' ? 'Usuario' : t === 'admin' ? 'Equipo' : 'Sofía'
          const recent = historySnap.docs.slice(-5).map(d => {
            const m = d.data()
            const text = typeof m.text === 'string' && m.text ? m.text : '(imagen)'
            return { from: label(m.senderType), text }
          })
          recent.push({ from: 'Sofía', text: aiResponse })
          const ok = await sendEscalationEmail({
            storeName: storeData?.name || chatData.storeName || 'Sin nombre',
            subdomain: storeData?.subdomain,
            userEmail: chatData.userEmail || '(sin email)',
            plan: effectivePlanOf(storeData),
            reason: finalReason,
            messages: recent,
          })
          if (!ok) {
            // Liberar el throttle para que la próxima escalación reintente
            await chatRef.update({ lastEscalationEmailAt: prevAt ?? FieldValue.delete() }).catch(() => {})
          }
        }
      } catch (mailErr) {
        console.error('[ai-chat] escalation email error:', mailErr)
      }
    }

    return res.status(200).json({ success: true, escalated: escalate || alreadyEscalated })
  } catch (error) {
    console.error('[ai-chat] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
