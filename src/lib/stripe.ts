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
      'Hasta 10 productos',
      '1 imagen por producto',
      'Subdominio shopifree.app',
      'Soporte por email'
    ],
    limits: {
      products: 10,
      imagesPerProduct: 1,
      categories: 3
    }
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    priceYearly: 99,
    features: [
      'Productos ilimitados',
      'Hasta 5 imágenes por producto',
      'Categorías ilimitadas',
      'Dominio personalizado',
      'Sin marca de agua',
      'Estadísticas avanzadas',
      'Soporte prioritario'
    ],
    limits: {
      products: -1, // unlimited
      imagesPerProduct: 5,
      categories: -1
    }
  },
  business: {
    name: 'Business',
    price: 29.99,
    priceYearly: 299,
    features: [
      'Todo lo de Pro',
      'Múltiples tiendas',
      'API access',
      'Cupones y descuentos',
      'Integraciones (WhatsApp Business)',
      'Reportes personalizados',
      'Soporte dedicado 24/7'
    ],
    limits: {
      products: -1,
      imagesPerProduct: 10,
      categories: -1,
      stores: 5
    }
  }
}

export type PlanType = keyof typeof PLAN_FEATURES
