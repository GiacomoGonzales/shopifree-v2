import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { PLAN_FEATURES, type PlanType } from './plans'

// Initialize Stripe
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

let stripePromise: Promise<Stripe | null> | null = null

export const getStripe = () => {
  if (!stripePromise && STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

// Price IDs - These will be created in Stripe Dashboard
export const STRIPE_PRICES = {
  pro: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || '',
    yearly: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY || ''
  },
  business: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_BUSINESS_MONTHLY || '',
    yearly: import.meta.env.VITE_STRIPE_PRICE_BUSINESS_YEARLY || ''
  }
}

// PLAN_FEATURES + PlanType are now defined in ./plans (single source of truth,
// dependency-free so serverless code — e.g. the support bot — can import them
// too). Re-exported here so the many frontend modules that do
// `import { PLAN_FEATURES } from 'lib/stripe'` keep working unchanged.
export { PLAN_FEATURES }
export type { PlanType }

// ============================================
// PLAN LIMITS HELPERS
// ============================================

export function getPlanLimits(plan: PlanType) {
  return PLAN_FEATURES[plan]?.limits || PLAN_FEATURES.free.limits
}

export function canAddProduct(plan: PlanType, currentProductCount: number): { allowed: boolean; limit: number; message?: string } {
  const limits = getPlanLimits(plan)
  const limit = limits.products

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, limit: -1 }
  }

  if (currentProductCount >= limit) {
    const upgradePlan = plan === 'free' ? 'Pro' : 'Business'
    return {
      allowed: false,
      limit,
      message: `Has alcanzado el limite de ${limit} productos en el plan ${PLAN_FEATURES[plan].name}. Actualiza a ${upgradePlan} para mas productos.`
    }
  }

  return { allowed: true, limit }
}

export function canAddCategory(plan: PlanType, currentCategoryCount: number): { allowed: boolean; limit: number; message?: string } {
  const limits = getPlanLimits(plan)
  const limit = limits.categories

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, limit: -1 }
  }

  if (currentCategoryCount >= limit) {
    return {
      allowed: false,
      limit,
      message: `Has alcanzado el limite de ${limit} categorias en el plan ${PLAN_FEATURES[plan].name}. Actualiza a Pro para categorias ilimitadas.`
    }
  }

  return { allowed: true, limit }
}

export function getMaxImagesPerProduct(plan: PlanType): number {
  const limits = getPlanLimits(plan)
  return limits.imagesPerProduct
}

export function canUploadVideo(plan: PlanType): boolean {
  const limits = getPlanLimits(plan)
  return limits.videoUpload ?? false
}

export function getRemainingProducts(plan: PlanType, currentProductCount: number): number | 'unlimited' {
  const limits = getPlanLimits(plan)
  if (limits.products === -1) return 'unlimited'
  return Math.max(0, limits.products - currentProductCount)
}

export function getRemainingCategories(plan: PlanType, currentCategoryCount: number): number | 'unlimited' {
  const limits = getPlanLimits(plan)
  if (limits.categories === -1) return 'unlimited'
  return Math.max(0, limits.categories - currentCategoryCount)
}

// ============================================
// SUBSCRIPTION STATUS HELPERS
// ============================================

// Kept in sync with StoreSubscription.status in src/types/index.ts — both
// must reflect Stripe's full subscription.status enum so the type system
// catches references to in-flight states (incomplete, incomplete_expired)
// when callers branch on terminal cases.
type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'

interface StoreForPlanCheck {
  plan: PlanType
  planExpiresAt?: Date | { toDate: () => Date } | string | null
  trialEndsAt?: Date | { toDate: () => Date } | string | null
  subscription?: {
    status: SubscriptionStatus
  }
}

/**
 * Get the effective plan for a store based on subscription status and trial.
 * Returns 'free' if:
 * - Subscription is not in good standing (past_due, canceled, unpaid)
 * - Free trial (trialEndsAt) has expired
 * This ensures users who failed payment or expired trial don't keep Pro/Business access.
 */
export function getEffectivePlan(store: StoreForPlanCheck): PlanType {
  // Free plan doesn't require active subscription
  if (store.plan === 'free') {
    return 'free'
  }

  // Check if user has a Stripe subscription
  if (store.subscription) {
    // Only allow access if subscription is active or trialing
    const activeStatuses: SubscriptionStatus[] = ['active', 'trialing']
    if (activeStatuses.includes(store.subscription.status)) {
      return store.plan
    }
    // Subscription exists but not active (past_due, canceled, unpaid)
    // Still honor the plan - admin can manually downgrade if needed
    // This allows business/pro users to keep access even if payment fails temporarily
    return store.plan
  }

  // Check manual plan expiration (planExpiresAt) - admin-set expiration date
  if (store.planExpiresAt) {
    let expiresDate: Date
    if (store.planExpiresAt instanceof Date) {
      expiresDate = store.planExpiresAt
    } else if (typeof store.planExpiresAt === 'object' && 'toDate' in store.planExpiresAt) {
      expiresDate = store.planExpiresAt.toDate()
    } else {
      expiresDate = new Date(store.planExpiresAt as string)
    }

    if (expiresDate.getTime() <= Date.now()) {
      return 'free'
    }
    return store.plan
  }

  // planExpiresAt explicitamente null = comp de admin indefinido (Stores.tsx
  // lo escribe asi). Igual que api/_shared/plan.ts: gana sobre un trialEndsAt
  // vencido, si no el panel mostraba Free a una tienda que el server trata como paga.
  if (store.planExpiresAt === null) {
    return store.plan
  }

  // No Stripe subscription - check for free trial (trialEndsAt)
  if (store.trialEndsAt) {
    // Convert to Date if needed
    let trialEndDate: Date
    if (store.trialEndsAt instanceof Date) {
      trialEndDate = store.trialEndsAt
    } else if (typeof store.trialEndsAt === 'object' && 'toDate' in store.trialEndsAt) {
      trialEndDate = store.trialEndsAt.toDate()
    } else {
      trialEndDate = new Date(store.trialEndsAt as string)
    }

    // If trial hasn't expired, allow the plan
    if (trialEndDate.getTime() > Date.now()) {
      return store.plan
    }
    // Trial expired = downgrade to free
    return 'free'
  }

  // No subscription AND no trial defined = admin-granted access
  return store.plan
}

// ============================================
// BILLING API (create-checkout / sync-subscription)
// ============================================
// Todos los endpoints de billing exigen el Firebase ID token del usuario
// (Authorization: Bearer). El uid sale del token en el servidor — ya no se
// manda userId en el body. Imports dinamicos para no arrastrar firebase a los
// modulos livianos que solo usan PLAN_FEATURES.

type BillingLang = 'es' | 'en'

async function billingFetch<T = Record<string, unknown>>(path: string, body: Record<string, unknown>): Promise<T> {
  const [{ auth }, { apiUrl }] = await Promise.all([
    import('./firebase'),
    import('../utils/apiBase'),
  ])
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  const token = await user.getIdToken()
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return data
}

/**
 * Crea una sesion de Stripe Checkout (o, si la tienda ya tiene una suscripcion
 * viva, devuelve la URL del Billing Portal con redirectedToPortal=true).
 * `lang` arma las URLs de vuelta con el prefijo de idioma (/es|/en/dashboard/plan).
 */
export function createCheckoutSession(params: {
  storeId: string
  plan: Exclude<PlanType, 'free'>
  billing: 'monthly' | 'yearly'
  lang?: BillingLang
  applyDiscount?: boolean
}): Promise<{ url?: string; sessionId?: string; redirectedToPortal?: boolean }> {
  return billingFetch('/api/create-checkout', {
    storeId: params.storeId,
    plan: params.plan,
    billing: params.billing,
    lang: params.lang === 'en' ? 'en' : 'es',
    ...(params.applyDiscount && { applyDiscount: true }),
  })
}

/** URL del Stripe Billing Portal para la tienda del usuario autenticado. */
export function createBillingPortalSession(params: { storeId?: string; lang?: BillingLang } = {}): Promise<{ url?: string }> {
  return billingFetch('/api/create-checkout', {
    action: 'portal',
    ...(params.storeId && { storeId: params.storeId }),
    lang: params.lang === 'en' ? 'en' : 'es',
  })
}

/** Re-sincroniza la suscripcion de una tienda desde Stripe (dueno o admin). */
export function syncStoreSubscription(storeId: string): Promise<{ success?: boolean; status?: string; plan?: string; message?: string }> {
  return billingFetch('/api/sync-subscription', { action: 'sync', storeId })
}
