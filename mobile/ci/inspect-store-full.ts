import { getDb } from './firebase-admin'

async function main() {
  const id = process.argv[2]
  const snap = await getDb().collection('stores').doc(id).get()
  if (!snap.exists) {
    console.log('NOT FOUND')
    return
  }
  const d = snap.data()!
  // dump only the billing-related fields, in date-readable form
  const billing = {
    plan: d.plan,
    trialEndsAt: d.trialEndsAt?.toDate?.()?.toISOString() ?? d.trialEndsAt,
    trialExpiredAt: d.trialExpiredAt?.toDate?.()?.toISOString() ?? d.trialExpiredAt,
    planExpiresAt: d.planExpiresAt?.toDate?.()?.toISOString() ?? d.planExpiresAt,
    updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? d.updatedAt,
    subscription: d.subscription ? {
      ...d.subscription,
      currentPeriodStart: d.subscription.currentPeriodStart?.toDate?.()?.toISOString() ?? d.subscription.currentPeriodStart,
      currentPeriodEnd: d.subscription.currentPeriodEnd?.toDate?.()?.toISOString() ?? d.subscription.currentPeriodEnd,
    } : null,
    manualRestoration: d.manualRestoration ? {
      ...d.manualRestoration,
      restoredAt: d.manualRestoration.restoredAt?.toDate?.()?.toISOString() ?? d.manualRestoration.restoredAt,
      restoredUntil: d.manualRestoration.restoredUntil?.toDate?.()?.toISOString() ?? d.manualRestoration.restoredUntil,
    } : null,
  }
  console.log(JSON.stringify(billing, null, 2))
}
main().catch(err => { console.error(err); process.exit(1) })
