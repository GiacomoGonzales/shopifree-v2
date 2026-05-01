/**
 * One-off recovery: restore the paid period a customer lost when
 * `create-checkout.ts` preemptively canceled their active subscription
 * before the new checkout completed (or the customer abandoned it).
 *
 * Sets plan back to whatever they had paid for and stamps planExpiresAt
 * to the original Stripe currentPeriodEnd so the daily expireTrials cron
 * leaves them alone until that date — at which point the natural
 * downgrade fires as expected.
 *
 * Usage:
 *   npx tsx mobile/ci/restore-paid-period.ts <storeId> <plan> <expiresISO>
 *
 * Example (Wilton's case):
 *   npx tsx mobile/ci/restore-paid-period.ts \
 *     lxcSVBeyZdQo2qjoEpbksaR3w372 \
 *     pro \
 *     2026-05-23T22:57:54Z
 */
import { getDb } from './firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

async function main() {
  const storeId = process.argv[2]
  const plan = process.argv[3] as 'pro' | 'business'
  const expiresIso = process.argv[4]

  if (!storeId || !plan || !expiresIso) {
    console.error('Usage: npx tsx mobile/ci/restore-paid-period.ts <storeId> <plan> <expiresISO>')
    process.exit(1)
  }
  if (!['pro', 'business'].includes(plan)) {
    console.error(`Invalid plan "${plan}". Must be pro or business.`)
    process.exit(1)
  }
  const expiresAt = new Date(expiresIso)
  if (isNaN(expiresAt.getTime())) {
    console.error(`Invalid date "${expiresIso}". Use ISO 8601 (e.g. 2026-05-23T22:57:54Z).`)
    process.exit(1)
  }
  if (expiresAt.getTime() < Date.now()) {
    console.error(`Refusing to restore: ${expiresIso} is in the past, would have no effect.`)
    process.exit(1)
  }

  const db = getDb()
  const ref = db.collection('stores').doc(storeId)
  const snap = await ref.get()
  if (!snap.exists) {
    console.error(`Store ${storeId} not found`)
    process.exit(1)
  }
  const before = snap.data()!
  console.log('--- BEFORE ---')
  console.log('plan         :', before.plan)
  console.log('planExpiresAt:', before.planExpiresAt)
  console.log('subscription :', before.subscription?.status)

  await ref.update({
    plan,
    planExpiresAt: expiresAt,
    // Audit trail so we can find these later if a pattern emerges
    manualRestoration: {
      restoredAt: FieldValue.serverTimestamp(),
      reason: 'Recovered paid period after preemptive sub cancel in create-checkout',
      previousPlan: before.plan,
      previousSubscriptionStatus: before.subscription?.status ?? null,
      restoredUntil: expiresAt,
    },
    updatedAt: new Date(),
  })

  const after = (await ref.get()).data()!
  console.log('\n--- AFTER ---')
  console.log('plan         :', after.plan)
  console.log('planExpiresAt:', after.planExpiresAt?.toDate?.()?.toISOString() || after.planExpiresAt)
  console.log('subscription :', after.subscription?.status)
  console.log('\n✓ Restored. The expireTrials cron will leave this store alone until', expiresIso)
}

main().catch(err => { console.error(err); process.exit(1) })
