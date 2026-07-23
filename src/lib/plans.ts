/**
 * Plan pricing, features and limits — the SINGLE SOURCE OF TRUTH.
 *
 * This module is intentionally dependency-free (no `@stripe/stripe-js`, no
 * `import.meta.env`, no browser globals) so it can be imported from BOTH:
 *   - the frontend, via `src/lib/stripe.ts` (which re-exports PLAN_FEATURES), and
 *   - Vercel serverless functions, e.g. `api/_shared/sofia-knowledge.ts`
 *     (which builds the support-bot system prompt from these numbers so its
 *     plan/pricing knowledge can never drift from reality).
 *
 * If you change a price, a limit, or a plan feature, change it HERE and both
 * sides stay in sync automatically. Bundled into API functions via vercel.json
 * `functions["api/**\/*.ts"].includeFiles = "src/lib/**"`.
 */

// `-1` means "unlimited" throughout the codebase.
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
      'Dropshipping (CJ, Printful...)',
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
