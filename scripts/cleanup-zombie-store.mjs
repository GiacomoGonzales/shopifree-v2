// One-off cleanup for the orphan/zombie store left behind by an account
// deletion that never cancelled its Stripe subscription.
//
// PREREQUISITE: cancel the Stripe subscription FIRST (sub_1TRF77HTs0fHLD0ofJ2nz0Ow,
// customer cus_U4MC00BaTOjuDv). If the sub is still alive, deleting the doc is
// pointless — the next past_due webhook resurrects it.
//
// Usage:
//   node scripts/cleanup-zombie-store.mjs            # dry run (shows what it would do)
//   node scripts/cleanup-zombie-store.mjs --apply    # actually delete

import { readFileSync } from 'node:fs'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const STORE_ID = '1UiAieWZUjXQZsy64tiF1piA2Us2'
const APPLY = process.argv.includes('--apply')

const env = {}
for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
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
const auth = getAuth()

const docRef = db.collection('stores').doc(STORE_ID)
const snap = await docRef.get()

console.log(`Mode: ${APPLY ? 'APPLY (destructive)' : 'DRY RUN'}\n`)

if (!snap.exists) {
  console.log(`stores/${STORE_ID}: already gone`)
} else {
  const d = snap.data()
  console.log(`stores/${STORE_ID}: exists | sub status=${d.subscription?.status} | subId=${d.subscription?.stripeSubscriptionId}`)
  if (d.subscription?.status && d.subscription.status !== 'canceled') {
    console.log(`  WARNING: sub status is "${d.subscription.status}", not "canceled".`)
    console.log('  Make sure you cancelled it in Stripe first, or the webhook will resurrect this doc.')
  }
  if (APPLY) {
    await docRef.delete()
    console.log('  -> deleted store doc')
  } else {
    console.log('  -> would delete store doc')
  }
}

// Auth account (uid === storeId in this app)
try {
  const rec = await auth.getUser(STORE_ID)
  console.log(`\nAuth ${rec.email} (uid ${STORE_ID}): exists`)
  if (APPLY) {
    await auth.deleteUser(STORE_ID)
    console.log('  -> deleted Auth account')
  } else {
    console.log('  -> would delete Auth account')
  }
} catch (e) {
  console.log(`\nAuth uid ${STORE_ID}: ${e.code || e.message}`)
}

process.exit(0)
