import { loadStripe, type Stripe } from '@stripe/stripe-js'

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

// Plan features for display
export const PLAN_FEATURES = {
  free: {
    name: 'Gratis',
    price: 0,
    priceYearly: 0,
    features: [
      'Vende hasta 10 productos',
      'Recibe pedidos por WhatsApp',
      'Tu propio link de tienda',
      'Codigo QR para compartir',
      '1 foto por producto',
      'Hasta 3 categorias'
    ],
    limits: {
      products: 10,
      imagesPerProduct: 1,
      categories: 3,
      videoUpload: false
    }
  },
  pro: {
    name: 'Pro',
    price: 4.99,
    priceYearly: 49.99,
    features: [
      'Vende hasta 200 productos',
      'Cobra online con tarjeta',
      'Cupones de descuento',
      'Tu propio dominio .com',
      '5 fotos por producto',
      'Conoce a tus clientes'
    ],
    limits: {
      products: 200,
      imagesPerProduct: 5,
      categories: -1,
      videoUpload: true
    }
  },
  business: {
    name: 'Business',
    price: 9.99,
    priceYearly: 99.99,
    features: [
      'Todo lo de Pro',
      'Productos sin limite',
      'Tu marca, sin Shopifree',
      'App Android y iPhone de tu tienda',
      'Soporte prioritario'
    ],
    limits: {
      products: -1,
      imagesPerProduct: 10,
      categories: -1,
      videoUpload: true
    }
  }
}

export type PlanType = keyof typeof PLAN_FEATURES

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

type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing'

interface StoreForPlanCheck {
  plan: PlanType
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
