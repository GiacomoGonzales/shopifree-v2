import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

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
// ============================================

// Get all stores (admin only)
export const adminGetAllStores = functions.https.onCall(async (request) => {
  // Verify admin
  if (!isAdminRequest(request.auth)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }

  const { limit: limitNum = 50, startAfter } = request.data || {}

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
export const adminUpdateStorePlan = functions.https.onCall(async (request) => {
  // Verify admin
  if (!isAdminRequest(request.auth)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }

  const { storeId, plan, expiresAt } = request.data

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
export const adminGetAllUsers = functions.https.onCall(async (request) => {
  // Verify admin
  if (!isAdminRequest(request.auth)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }

  const { limit: limitNum = 50, startAfter } = request.data || {}

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
export const adminGetDashboardStats = functions.https.onCall(async (request) => {
  // Verify admin
  if (!isAdminRequest(request.auth)) {
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
