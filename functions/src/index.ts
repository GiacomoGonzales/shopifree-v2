import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { defineSecret } from 'firebase-functions/params'

// Initialize Firebase Admin
admin.initializeApp()

const db = admin.firestore()

// Lazy getters for config
const getAdminEmail = () => process.env.ADMIN_EMAIL || 'admin@shopifree.app'

// Admin = email configurado Y verificado. Sin email_verified cualquiera podia
// registrar una cuenta email/password con esa direccion (sin verificar) y
// pasar el chequeo.
function isAdminRequest(auth: { token: { email?: string; email_verified?: boolean } } | undefined): boolean {
  return !!auth?.token.email
    && auth.token.email_verified === true
    && auth.token.email.toLowerCase() === getAdminEmail().toLowerCase()
}

// ============================================
// BILLING (Stripe): ELIMINADO DE CLOUD FUNCTIONS
// ============================================
// createCheckoutSession, createPortalSession, stripeWebhook y expireTrials
// vivian aca sin autenticacion (portal de facturacion de cualquier usuario por
// userId del body, checkout sin auth, webhook que mapeaba precios desconocidos
// a 'pro', cron que bajaba a free a tiendas past_due y con manualRestoration).
// Todo eso ahora vive en api/ (Vercel): create-checkout.ts, stripe-webhook.ts,
// sync-subscription.ts y el cron de send-email.ts. Despues de deployar este
// archivo hay que borrar las funciones viejas del proyecto:
//   firebase functions:delete createCheckoutSession createPortalSession stripeWebhook expireTrials

// ============================================
// ADMIN FUNCTIONS
// Callables de 1a generacion (firebase-functions v1): la firma es (data, context).
// ============================================

// Get all stores (admin only)
export const adminGetAllStores = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!isAdminRequest(context.auth)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }

  const { limit: limitNum = 50, startAfter } = data || {}

  let query = db.collection('stores')
    .orderBy('createdAt', 'desc')
    .limit(limitNum)

  if (startAfter) {
    const startDoc = await db.collection('stores').doc(startAfter).get()
    if (startDoc.exists) {
      query = query.startAfter(startDoc)
    }
  }

  const snapshot = await query.get()
  const stores = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))

  return { stores }
})

// Update store plan manually (admin only)
export const adminUpdateStorePlan = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!isAdminRequest(context.auth)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }

  const { storeId, plan, expiresAt } = data

  if (!storeId || !plan) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing storeId or plan')
  }
  if (!['free', 'pro', 'business'].includes(plan)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid plan')
  }

  await db.collection('stores').doc(storeId).update({
    plan,
    planExpiresAt: expiresAt ? new Date(expiresAt) : null,
    // Comp de admin: sin el trial de alta, para que el plan efectivo no caiga
    // en un trialEndsAt vencido (mismo criterio que admin/Stores.tsx).
    ...(plan !== 'free' && { trialEndsAt: admin.firestore.FieldValue.delete() }),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })

  return { success: true }
})

// Get all users (admin only)
export const adminGetAllUsers = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!isAdminRequest(context.auth)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }

  const { limit: limitNum = 50, startAfter } = data || {}

  let query = db.collection('users')
    .orderBy('createdAt', 'desc')
    .limit(limitNum)

  if (startAfter) {
    const startDoc = await db.collection('users').doc(startAfter).get()
    if (startDoc.exists) {
      query = query.startAfter(startDoc)
    }
  }

  const snapshot = await query.get()
  const users = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))

  return { users }
})

// Dashboard stats (admin only)
export const adminGetDashboardStats = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!isAdminRequest(context.auth)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }

  // Get counts
  const [storesSnapshot, usersSnapshot] = await Promise.all([
    db.collection('stores').count().get(),
    db.collection('users').count().get()
  ])

  // Get plan distribution
  const planCounts = {
    free: 0,
    pro: 0,
    business: 0
  }

  const storesWithPlans = await db.collection('stores').get()
  storesWithPlans.docs.forEach(doc => {
    const plan = doc.data().plan as keyof typeof planCounts
    if (planCounts[plan] !== undefined) {
      planCounts[plan]++
    }
  })

  return {
    totalStores: storesSnapshot.data().count,
    totalUsers: usersSnapshot.data().count,
    planDistribution: planCounts
  }
})

// ============================================
// AVISO AL DUEÑO: PEDIDO NUEVO
// ============================================

/**
 * Dispara al crearse un pedido y le manda una push al dueño de la tienda.
 *
 * Por qué un trigger de Firestore y no una llamada desde el cliente: el pedido
 * lo crea el navegador del COMPRADOR. Si el aviso dependiera de él, se perdería
 * cuando cierra la pestaña, y habría que darle permiso de notificar a otra
 * persona. Acá se ejecuta siempre, sin importar el medio de pago (WhatsApp,
 * MercadoPago, Stripe, transferencia o manual).
 *
 * Los tokens salen de `users/{ownerId}/pushTokens`, que son los dispositivos
 * del dueño. NO de `stores/{storeId}/pushTokens`, que son los clientes.
 */
export const notifyNewOrder = functions.firestore
  .document('stores/{storeId}/orders/{orderId}')
  .onCreate(async (snap, context) => {
    const { storeId, orderId } = context.params
    const order = snap.data()

    try {
      const storeSnap = await db.collection('stores').doc(storeId).get()
      if (!storeSnap.exists) {
        console.warn(`[notifyNewOrder] Store ${storeId} not found`)
        return null
      }
      const store = storeSnap.data() || {}
      const ownerId: string | undefined = store.ownerId
      if (!ownerId) {
        console.warn(`[notifyNewOrder] Store ${storeId} has no ownerId`)
        return null
      }

      const tokensSnap = await db
        .collection('users')
        .doc(ownerId)
        .collection('pushTokens')
        .get()

      if (tokensSnap.empty) {
        // Normal: el dueño todavía no abrió la app o no dio permiso.
        console.log(`[notifyNewOrder] Owner ${ownerId} has no devices registered`)
        return null
      }

      // El total se formatea con la moneda de la tienda. Si falta, se manda el
      // número pelado antes que un símbolo equivocado.
      const currency: string | undefined = store.currency
      const total = typeof order.total === 'number' ? order.total : null
      const amount = total === null
        ? ''
        : currency
          ? ` · ${currency} ${total.toFixed(2)}`
          : ` · ${total.toFixed(2)}`

      const customerName: string = order.customer?.name?.split(' ')[0] || ''
      const itemCount: number = Array.isArray(order.items) ? order.items.length : 0
      const itemsLabel = itemCount === 1 ? '1 producto' : `${itemCount} productos`

      const title = 'Nuevo pedido'
      const body = `${order.orderNumber || 'Pedido'}${customerName ? ` de ${customerName}` : ''} · ${itemsLabel}${amount}`

      const tokens = tokensSnap.docs.map(d => d.data().token as string).filter(Boolean)
      if (tokens.length === 0) return null

      const messaging = admin.messaging()
      const staleDocIds: string[] = []

      for (let i = 0; i < tokens.length; i += 500) {
        const batch = tokens.slice(i, i + 500)
        const response = await messaging.sendEachForMulticast({
          tokens: batch,
          notification: { title, body },
          // Lo lee el handler de "tap" en la app para abrir el pedido.
          data: { type: 'new-order', storeId, orderId },
          android: { priority: 'high', notification: { sound: 'default' } },
          apns: { payload: { aps: { sound: 'default' } } }
        })

        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
            const doc = tokensSnap.docs[i + idx]
            if (doc) staleDocIds.push(doc.id)
          }
        })
      }

      // Limpia los tokens de apps desinstaladas para no reintentar por siempre.
      if (staleDocIds.length > 0) {
        const writeBatch = db.batch()
        for (const id of staleDocIds) {
          writeBatch.delete(
            db.collection('users').doc(ownerId).collection('pushTokens').doc(id)
          )
        }
        await writeBatch.commit()
      }

      console.log(`[notifyNewOrder] ${orderId} → ${tokens.length} devices, ${staleDocIds.length} stale`)
      return null
    } catch (err) {
      // Nunca reventar: el pedido ya está guardado y la notificación es
      // secundaria. Si lanzáramos, Firestore reintentaría y podría duplicar.
      console.error('[notifyNewOrder] Error:', err)
      return null
    }
  })

// ============================================
// SHOPICHAT: AVISOS AUTOMÁTICOS DE PEDIDOS POR WHATSAPP
// ============================================

/**
 * Secreto compartido con Vercel (api/whatsapp-notify.ts). Se carga con
 *   firebase functions:secrets:set WHATSAPP_NOTIFY_SECRET
 * y en Vercel como variable de entorno con el MISMO valor.
 */
const WHATSAPP_NOTIFY_SECRET = defineSecret('WHATSAPP_NOTIFY_SECRET')

/** Endpoint de Vercel que manda los avisos (se puede apuntar a un preview con la env WHATSAPP_NOTIFY_URL). */
const getNotifyUrl = () => process.env.WHATSAPP_NOTIFY_URL || 'https://shopifree.app/api/whatsapp-notify'

type WaOrderEvent = 'received' | 'confirmed' | 'shipped' | 'readyForPickup' | 'delivered' | 'paymentReminder'

const ONLINE_METHODS = new Set(['mercadopago', 'stripe', 'paypal', 'gocuotas'])

/** Recordatorio de pago: horas permitidas (lo mismo que ofrece la UI). */
const clampDelayHours = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 1), 72) : 24
}

/**
 * Qué avisos corresponden a este cambio del pedido. Mapeo:
 *  - pedido creado                                  → received
 *  - status → confirmed                             → confirmed
 *  - status → ready con deliveryMethod 'delivery'   → shipped (listo = despachado)
 *  - status → ready con retiro (o sin método)       → readyForPickup
 *  - fulfillmentStatus → shipped (CJ / Printful)    → shipped (con tracking)
 *  - status → delivered                             → delivered
 * 'preparing' no avisa (el cliente ya recibió "confirmado, lo estamos
 * preparando"). paymentStatus → paid no manda nada: solo cancela el
 * recordatorio de pago pendiente (un pago online ya pasa el pedido a
 * confirmed, que sí avisa). Nada para pedidos de prueba.
 */
function waEventsFor(before: FirebaseFirestore.DocumentData | undefined, after: FirebaseFirestore.DocumentData): WaOrderEvent[] {
  if (after.isTest === true) return []
  if (!before) return ['received']
  const events: WaOrderEvent[] = []
  if (before.status !== after.status) {
    if (after.status === 'confirmed') events.push('confirmed')
    else if (after.status === 'ready') events.push(after.deliveryMethod === 'delivery' ? 'shipped' : 'readyForPickup')
    else if (after.status === 'delivered') events.push('delivered')
  }
  if (before.fulfillmentStatus !== after.fulfillmentStatus && after.fulfillmentStatus === 'shipped' && !events.includes('shipped')) {
    events.push('shipped')
  }
  return events
}

/** POST al endpoint de Vercel. Nunca lanza: un aviso perdido no rompe nada. */
async function callWhatsappNotify(storeId: string, orderId: string, event: WaOrderEvent): Promise<boolean> {
  const secret = WHATSAPP_NOTIFY_SECRET.value()
  if (!secret) {
    console.warn('[waNotify] WHATSAPP_NOTIFY_SECRET no configurado')
    return false
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25_000)
  try {
    const res = await fetch(getNotifyUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ storeId, orderId, event }),
      signal: ctrl.signal,
    })
    const data = await res.json().catch(() => ({})) as Record<string, unknown>
    if (!res.ok) console.warn(`[waNotify] ${storeId}/${orderId} ${event} → HTTP ${res.status}`, data.error || '', data.message || '')
    else console.log(`[waNotify] ${storeId}/${orderId} ${event} →`, data.skipped ? `omitido (${data.skipped})` : 'enviado')
    return res.ok
  } catch (e) {
    console.warn(`[waNotify] ${storeId}/${orderId} ${event} fallo:`, (e as Error).message)
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Detecta los cambios del pedido que merecen aviso al cliente por WhatsApp y
 * se los pasa a api/whatsapp-notify (que tiene el token, la plantilla, el
 * teléfono y la idempotencia). Convive con notifyNewOrder (push al dueño).
 *
 * Para no llamar a Vercel en cada escritura de cada pedido, primero lee
 * waSettings/automations (1 lectura) y solo sigue si ese aviso está prendido.
 * Al crear un pedido con pago online pendiente y el recordatorio prendido,
 * deja waReminderDueAt para waPaymentReminders; si el pedido se paga o se
 * cancela antes, lo borra.
 */
export const onOrderWriteWhatsapp = functions
  .runWith({ secrets: [WHATSAPP_NOTIFY_SECRET], timeoutSeconds: 60 })
  .firestore.document('stores/{storeId}/orders/{orderId}')
  .onWrite(async (change, context) => {
    const { storeId, orderId } = context.params
    const before = change.before.exists ? change.before.data() : undefined
    const after = change.after.exists ? change.after.data() : undefined
    if (!after) return null

    try {
      // Pagado o cancelado: el recordatorio pendiente ya no corresponde.
      const reminderObsolete = after.waReminderDueAt
        && (after.paymentStatus === 'paid' || after.paymentStatus === 'refunded' || after.status === 'cancelled')
      if (reminderObsolete) {
        await change.after.ref.update({ waReminderDueAt: admin.firestore.FieldValue.delete() })
      }

      const events = waEventsFor(before, after)
      const wantsReminder = !before
        && after.isTest !== true
        && (after.paymentStatus || 'pending') === 'pending'
        && ONLINE_METHODS.has(String(after.paymentMethod || ''))
        && after.status !== 'cancelled'
      if (!events.length && !wantsReminder) return null

      const autoSnap = await db.collection('stores').doc(storeId).collection('waSettings').doc('automations').get()
      const cfg = (autoSnap.data()?.orderNotifications || {}) as Record<string, unknown>
      const reminder = (cfg.paymentReminder || {}) as { enabled?: boolean; delayHours?: number }

      if (wantsReminder && reminder.enabled === true) {
        const dueAt = admin.firestore.Timestamp.fromMillis(Date.now() + clampDelayHours(reminder.delayHours) * 3600_000)
        await change.after.ref.update({ waReminderDueAt: dueAt })
      }

      const already = (after.waNotified || {}) as Record<string, unknown>
      for (const event of events) {
        if (cfg[event] !== true || already[event]) continue
        await callWhatsappNotify(storeId, orderId, event)
      }
      return null
    } catch (err) {
      // Nunca reventar: Firestore reintentaría y el pedido ya está guardado.
      console.error('[onOrderWriteWhatsapp] Error:', err)
      return null
    }
  })

/**
 * Recordatorio de pago: cada 30 minutos busca pedidos con waReminderDueAt
 * vencido (collection group, índice de campo único en firestore.indexes.json),
 * como mucho 100 por pasada, y le pide a api/whatsapp-notify el aviso
 * 'paymentReminder'. El endpoint vuelve a validar todo (sigue impago, método
 * online activo, toggle prendido, plantilla aprobada, no enviado antes).
 *
 * Después se borra waReminderDueAt. Si el endpoint no respondió (red, 5xx) se
 * reintenta en la próxima pasada, hasta 3 veces.
 */
export const waPaymentReminders = functions
  .runWith({ secrets: [WHATSAPP_NOTIFY_SECRET], timeoutSeconds: 300 })
  .pubsub.schedule('every 30 minutes')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now()
    const snap = await db.collectionGroup('orders')
      .where('waReminderDueAt', '<=', now)
      .orderBy('waReminderDueAt', 'asc')
      .limit(100)
      .get()

    let sent = 0
    for (const doc of snap.docs) {
      const storeId = doc.ref.parent.parent?.id
      const o = doc.data()
      const stillDue = storeId
        && o.isTest !== true
        && (o.paymentStatus || 'pending') === 'pending'
        && o.status !== 'cancelled'
        && !o.waNotified?.paymentReminder
      let done = true
      if (stillDue) {
        const okCall = await callWhatsappNotify(storeId, doc.id, 'paymentReminder')
        const attempts = (Number(o.waReminderAttempts) || 0) + 1
        if (okCall) sent++
        else if (attempts < 3) {
          done = false
          await doc.ref.update({ waReminderAttempts: attempts }).catch(() => {})
        }
      }
      if (done) {
        await doc.ref.update({
          waReminderDueAt: admin.firestore.FieldValue.delete(),
          waReminderAttempts: admin.firestore.FieldValue.delete(),
        }).catch(e => console.warn(`[waPaymentReminders] ${doc.ref.path}:`, (e as Error).message))
      }
    }
    console.log(`[waPaymentReminders] ${snap.size} vencidos, ${sent} llamadas OK`)
    return null
  })
