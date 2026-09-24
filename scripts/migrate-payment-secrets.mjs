// Migración: mueve los secretos de pasarelas de pago del doc PÚBLICO
// stores/{storeId}.payments.* al doc privado stores/{storeId}/private/payments
// (solo accesible vía Admin SDK) y los borra del doc público.
//
// Campos movidos:
//   payments.mercadopago.accessToken
//   payments.stripe.secretKey
//   payments.paypal.clientSecret
//   payments.gocuotas.password
//
// En el doc público queda payments.<gateway>.secretConfigured = true para que
// el storefront sepa que la pasarela está configurada.
//
// Los endpoints de pago (api/_shared/paymentSecrets.ts) leen primero el doc
// privado y caen al campo legacy, así que se puede correr en cualquier momento
// sin cortar cobros. Es idempotente: si ya está migrado no toca nada.
//
// Credenciales: FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
// desde process.env o, si faltan, desde ../.env.
//
// Uso:
//   node scripts/migrate-payment-secrets.mjs            # dry run (default): lista tiendas afectadas
//   node scripts/migrate-payment-secrets.mjs --apply    # aplica la migración
//
// IMPORTANTE: estos secretos fueron públicos. Después de migrar, avisar a cada
// comerciante listado que ROTE sus credenciales en MP / Stripe / PayPal / GoCuotas.

import { existsSync, readFileSync } from 'node:fs'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const APPLY = process.argv.includes('--apply')

const SECRET_FIELD = {
  mercadopago: 'accessToken',
  stripe: 'secretKey',
  paypal: 'clientSecret',
  gocuotas: 'password',
}

// Cargar credenciales (process.env tiene prioridad sobre .env)
const env = { ...process.env }
const envFile = new URL('../.env', import.meta.url)
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
for (const k of ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']) {
  if (!env[k]) {
    console.error(`Falta ${k} (process.env o .env)`)
    process.exit(1)
  }
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()

console.log(`Modo: ${APPLY ? 'APPLY (escribe en Firestore)' : 'DRY RUN (no escribe nada)'}`)
console.log(`Proyecto: ${env.FIREBASE_PROJECT_ID}\n`)

const snap = await db.collection('stores').get()
const affected = []

for (const storeDoc of snap.docs) {
  const payments = storeDoc.data().payments || {}
  const privateUpdate = {}
  const publicUpdate = {}
  const gateways = []

  for (const [gw, field] of Object.entries(SECRET_FIELD)) {
    const gwData = payments[gw]
    if (!gwData || typeof gwData !== 'object' || !(field in gwData)) continue
    const value = gwData[field]
    // Siempre borrar el campo legacy del doc público (aunque sea null / vacío)
    publicUpdate[`payments.${gw}.${field}`] = FieldValue.delete()
    if (typeof value === 'string' && value.trim()) {
      privateUpdate[gw] = { [field]: value }
      publicUpdate[`payments.${gw}.secretConfigured`] = true
      gateways.push(gw)
    }
  }

  if (Object.keys(publicUpdate).length === 0) continue

  if (gateways.length) {
    affected.push({
      storeId: storeDoc.id,
      ownerId: storeDoc.data().ownerId || '',
      subdomain: storeDoc.data().subdomain || '',
      gateways,
    })
  }

  if (APPLY) {
    const privateRef = storeDoc.ref.collection('private').doc('payments')
    if (Object.keys(privateUpdate).length) {
      // Si el doc privado ya tiene un secreto (guardado por el dashboard nuevo),
      // NO lo pisamos con el valor legacy.
      const existing = (await privateRef.get()).data() || {}
      const toWrite = {}
      for (const [gw, obj] of Object.entries(privateUpdate)) {
        const field = SECRET_FIELD[gw]
        if (!existing[gw]?.[field]) toWrite[gw] = obj
      }
      if (Object.keys(toWrite).length) {
        await privateRef.set({ ...toWrite, updatedAt: new Date() }, { merge: true })
      }
    }
    await storeDoc.ref.update(publicUpdate)
  }
}

console.log(`Tiendas revisadas: ${snap.size}`)
console.log(`Tiendas con secretos expuestos: ${affected.length}\n`)
for (const a of affected) {
  // Nunca imprimir el valor del secreto: solo ids y pasarelas
  console.log(`${a.storeId}\towner=${a.ownerId}\tsubdomain=${a.subdomain}\tgateways=${a.gateways.join(',')}`)
}

if (!APPLY) {
  console.log('\nDry run: no se escribió nada. Correr con --apply para migrar.')
} else {
  console.log('\nMigración aplicada. Avisar a estos comerciantes que roten sus credenciales.')
}
