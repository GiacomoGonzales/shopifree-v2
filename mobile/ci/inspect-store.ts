/**
 * Read-only inspector — dumps a store's plan/subscription state for
 * decision making before running restore-paid-period or similar tools.
 */
import { getDb } from './firebase-admin'

async function main() {
  const ids = process.argv.slice(2)
  if (ids.length === 0) {
    console.error('Usage: npx tsx mobile/ci/inspect-store.ts <storeId> [<storeId>...]')
    process.exit(1)
  }
  for (const id of ids) {
    const snap = await getDb().collection('stores').doc(id).get()
    if (!snap.exists) {
      console.log(`\n--- ${id} ---\n  NOT FOUND`)
      continue
    }
    const d = snap.data()!
    console.log(`\n--- ${id} (${d.name || d.subdomain || '(unnamed)'}) ---`)
    console.log('  plan         :', d.plan)
    console.log('  trialEndsAt  :', d.trialEndsAt?.toDate?.()?.toISOString() ?? d.trialEndsAt)
    console.log('  planExpiresAt:', d.planExpiresAt?.toDate?.()?.toISOString() ?? d.planExpiresAt)
    console.log('  subscription :')
    if (d.subscription) {
      const s = d.subscription
      console.log('    stripePriceId       :', s.stripePriceId)
      console.log('    stripeSubscriptionId:', s.stripeSubscriptionId)
      console.log('    status              :', s.status)
      console.log('    cancelAtPeriodEnd   :', s.cancelAtPeriodEnd)
      console.log('    currentPeriodStart  :', s.currentPeriodStart?.toDate?.()?.toISOString() ?? s.currentPeriodStart)
      console.log('    currentPeriodEnd    :', s.currentPeriodEnd?.toDate?.()?.toISOString() ?? s.currentPeriodEnd)
    } else {
      console.log('    (none)')
    }
    if (d.manualRestoration) {
      console.log('  manualRestoration:', JSON.stringify(d.manualRestoration, null, 2))
    }
  }
}

main().catch(err => { console.error(err); process.exit(1) })
