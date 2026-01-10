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
      'Hasta 20 productos',
      'Pedidos por WhatsApp',
      'Link compartible',
      'Codigo QR de tu catalogo'
    ],
    limits: {
      products: 20,
      imagesPerProduct: 1,
      categories: 3
    }
  },
  pro: {
    name: 'Pro',
    price: 4.99,
    priceYearly: 49.99,
    features: [
      'Productos ilimitados',
      'Sin marca Shopifree',
      'Multiples fotos por producto',
      'Categorias ilimitadas',
      'Estadisticas basicas',
      'Soporte por email'
    ],
    limits: {
      products: -1, // unlimited
      imagesPerProduct: 5,
      categories: -1
    }
  },
  business: {
    name: 'Business',
    price: 9.99,
    priceYearly: 99.99,
    features: [
      'Todo lo de Pro',
      'Cupones de descuento',
      'Analytics avanzados',
      'Dominio personalizado',
      'Pagos en linea',
      'Soporte prioritario'
    ],
    limits: {
      products: -1,
      imagesPerProduct: 10,
      categories: -1
    }
  }
}

export type PlanType = keyof typeof PLAN_FEATURES
