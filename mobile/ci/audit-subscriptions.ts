/**
 * One-shot audit of subscription state across all stores. Finds anomalies:
 *
 *   A. STUCK_FREE        — plan='free' but customer paid (subscription field
 *                          exists with stripeSubscriptionId), and the original
 *                          period hasn't ended yet. Lost paid time.
 *   B. UI_LIES           — admin "Pagadas" badge shows "Cancelada" while the
 *                          plan is still pro/business. Confusing in admin.
 *   C. INCONSISTENT      — plan + subscription.status disagree in other
 *                          unexpected ways (e.g. plan=pro, status=past_due).
 *   D. PERIOD_NULL       — subscription exists but currentPeriodEnd missing.
 *                          Webhook write was incomplete.
 *   E. NO_SUBSCRIPTION   — paid plan + trialEndsAt past + no subscription
 *                          field. They're free-riding past their trial. The
 *                          cron is the only line of defense; if it ran ok
 *                          this list should be empty.
 *
 * Read-only. Prints to stdout. Does not mutate anything.
 *
 * Usage: npx tsx mobile/ci/audit-subscriptions.ts
 */
import { getDb } from './firebase-admin'

interface StoreShape {
  name?: string
  subdomain?: string
  plan?: string
  trialEndsAt?: { toDate: () => Date } | Date | null
  planExpiresAt?: { toDate: () => Date } | Date | null
  subscription?: {
    stripeSubscriptionId?: string
    status?: string
    currentPeriodEnd?: { toDate: () => Date } | Date | null
    cancelAtPeriodEnd?: boolean
  }
  manualRestoration?: unknown
}

function toDate(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === 'object' && v && 'toDate' in (v as object)) {
    return (v as { toDate: () => Date }).toDate()
  }
  if (typeof v === 'string') {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

async function main() {
  const db = getDb()
  const now = new Date()
  const all = await db.collection('stores').get()
  console.log(`Scanning ${all.size} stores...\n`)

  const buckets = {
    STUCK_FREE: [] as string[],
    UI_LIES: [] as string[],
    INCONSISTENT: [] as string[],
    PERIOD_NULL: [] as string[],
    NO_SUBSCRIPTION: [] as string[],
  }

  for (const doc of all.docs) {
    const s = doc.data() as StoreShape
    const id = doc.id
    const plan = s.plan ?? 'free'
    const sub = s.subscription
    const subStatus = sub?.status
    const periodEnd = toDate(sub?.currentPeriodEnd)
    const trialEnd = toDate(s.trialEndsAt)
    const compEnd = toDate(s.planExpiresAt)
    const restored = !!s.manualRestoration

    const ident = `${id}  ${s.name || s.subdomain || '(no name)'}`

    // A. STUCK_FREE: paid customer who has free plan but their paid period hasn't ended
    if (plan === 'free' && sub?.stripeSubscriptionId && periodEnd && periodEnd > now) {
      buckets.STUCK_FREE.push(
        `${ident}\n  → plan=free  status=${subStatus}  periodEnd=${periodEnd.toISOString()}  (paid through this date but locked out)`
      )
      continue
    }

    // B. UI_LIES: paid plan but subscription status says canceled/past_due (admin badge wrong)
    if ((plan === 'pro' || plan === 'business') && subStatus && subStatus !== 'active' && subStatus !== 'trialing') {
      buckets.UI_LIES.push(
        `${ident}\n  → plan=${plan}  status=${subStatus}  cancelAtPeriodEnd=${sub?.cancelAtPeriodEnd}  compEnd=${compEnd?.toISOString() ?? 'none'}  ${restored ? '[manualRestoration]' : ''}`
      )
      continue
    }

    // C. INCONSISTENT: paid plan, status active, but periodEnd in the past
    if ((plan === 'pro' || plan === 'business') && subStatus === 'active' && periodEnd && periodEnd < now) {
      buckets.INCONSISTENT.push(
        `${ident}\n  → plan=${plan}  status=active  periodEnd=${periodEnd.toISOString()} (in the past — Stripe may not have fired update event)`
      )
      continue
    }

    // D. PERIOD_NULL: subscription exists but no period info
    if (sub?.stripeSubscriptionId && !periodEnd && subStatus !== 'canceled') {
      buckets.PERIOD_NULL.push(
        `${ident}\n  → status=${subStatus}  no currentPeriodEnd. Incomplete webhook write?`
      )
      continue
    }

    // E. NO_SUBSCRIPTION but paid plan + trial over + no admin comp
    if (
      (plan === 'pro' || plan === 'business') &&
      !sub &&
      trialEnd && trialEnd < now &&
      !compEnd
    ) {
      buckets.NO_SUBSCRIPTION.push(
        `${ident}\n  → plan=${plan}  trialEndsAt=${trialEnd.toISOString()} (past)  no subscription, no comp — the cron should have caught this`
      )
      continue
    }
  }

  function emit(label: string, why: string, list: string[]) {
    console.log(`\n=== ${label} (${list.length}) ===`)
    console.log(why)
    if (list.length === 0) console.log('  (none)')
    else list.forEach(line => console.log(line))
  }

  emit('A. STUCK_FREE',
    'Paid customers locked out before their period ended. These need restoring.',
    buckets.STUCK_FREE)
  emit('B. UI_LIES',
    'Plan is pro/business but subscription.status says canceled/past_due. Admin "Pagadas" badge is misleading. Either the customer is in their last paid period after canceling, or there is a stale state.',
    buckets.UI_LIES)
  emit('C. INCONSISTENT',
    'plan + status active but period end is in the past. Stripe may not have fired the update for renewal.',
    buckets.INCONSISTENT)
  emit('D. PERIOD_NULL',
    'Has a Stripe subscription but our doc lost the period info. Webhook race / partial write.',
    buckets.PERIOD_NULL)
  emit('E. NO_SUBSCRIPTION',
    'Paid plan + trial expired + no Stripe subscription. The cron should have downgraded these. If non-empty, the cron is failing silently.',
    buckets.NO_SUBSCRIPTION)

  const total =
    buckets.STUCK_FREE.length +
    buckets.UI_LIES.length +
    buckets.INCONSISTENT.length +
    buckets.PERIOD_NULL.length +
    buckets.NO_SUBSCRIPTION.length
  console.log(`\n────\n${total} anomalies across ${all.size} stores`)
}

main().catch(err => { console.error(err); process.exit(1) })
