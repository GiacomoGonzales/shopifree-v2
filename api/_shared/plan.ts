/**
 * Server-side effective-plan check for merchant stores — the enforcement
 * counterpart of src/lib/stripe.ts getEffectivePlan (keep the logic in sync).
 *
 * Card-payment creation endpoints call this before talking to any gateway:
 * client-side gating alone is bypassable (a free store could flip
 * payments.*.enabled by writing Firestore directly), but every card charge
 * has to pass through these API routes, so this is the real gate.
 *
 * Mirrors the client's deliberate policies:
 *  - a store with a Stripe subscription in bad standing (past_due/canceled)
 *    still counts as paid — the webhook/cron are the downgrade authority;
 *  - plan pro/business with neither subscription nor trial = admin-granted.
 */

interface TimestampLike {
  toDate?: () => Date
}

export interface StorePlanData {
  plan?: string
  subscription?: { status?: string } | null
  planExpiresAt?: TimestampLike | Date | string | null
  trialEndsAt?: TimestampLike | Date | string | null
}

function toDate(value: TimestampLike | Date | string | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate()
  return null
}

/** true when the store's EFFECTIVE plan is pro/business (paid features allowed). */
export function hasPaidEffectivePlan(store: StorePlanData | undefined | null): boolean {
  if (!store) return false
  if (store.plan !== 'pro' && store.plan !== 'business') return false

  // Stripe subscription present → honor the stored plan (mirror of client:
  // even in dunning states, webhook/cron own the downgrade decision).
  if (store.subscription) return true

  // Admin comp expiration
  const compEnd = toDate(store.planExpiresAt)
  if (store.planExpiresAt !== undefined && store.planExpiresAt !== null && compEnd) {
    return compEnd.getTime() > Date.now()
  }
  if (store.planExpiresAt === null) return true // indefinite comp

  // Signup trial
  const trialEnd = toDate(store.trialEndsAt)
  if (trialEnd) return trialEnd.getTime() > Date.now()

  // pro/business with no subscription and no trial = admin-granted access
  return true
}

/** Standard 403 payload for payment endpoints when the plan doesn't allow cards. */
export const PLAN_REQUIRED_RESPONSE = {
  error: 'PLAN_REQUIRED',
  message: 'Los pagos con tarjeta requieren un plan Pro o Business activo',
} as const
