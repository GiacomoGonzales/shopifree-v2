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
//
// `features` son las funciones que se venden HOY (la pagina de planes las
// muestra con check). `comingSoon` son funciones anunciadas pero todavia no
// disponibles (la ruta muestra "Proximamente"): se muestran con una etiqueta
// "Proximamente" y NO deben venderse como incluidas.
// Las traducciones de la pagina de planes estan en
// src/i18n/locales/{es,en}/dashboard.json → plan.featureList / plan.comingSoonList
// (por indice): si cambias el orden o el texto aca, actualiza esas listas.
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
    ] as string[],
    comingSoon: [] as string[],
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
    ] as string[],
    comingSoon: [] as string[],
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
    ] as string[],
    // Dropshipping todavia no esta disponible (/dashboard/dropshipping es ComingSoon).
    comingSoon: ['Dropshipping (CJ, Printful...)'] as string[],
    limits: {
      products: -1,
      imagesPerProduct: 10,
      categories: -1,
      videoUpload: true
    }
  }
}

export type PlanType = keyof typeof PLAN_FEATURES

/**
 * Funciones que ya existen pero se venden solo cuando se lanzan al publico.
 * No van en `features` porque este modulo no puede leer el flag de lanzamiento
 * (no hay `import.meta.env` en las funciones de Vercel): cada lado pasa si
 * esta lanzada —
 *   - frontend: `SHOPICHAT_PUBLIC` de src/lib/shopichatAccess.ts (VITE_SHOPICHAT_PUBLIC)
 *   - api (Sofia): `process.env.SHOPICHAT_PUBLIC === 'true'`
 * Se agregan al FINAL de `features`, asi los indices de plan.featureList del
 * i18n siguen valiendo (la traduccion va en el indice siguiente al ultimo).
 */
export const PLAN_LAUNCH_FEATURES = {
  shopichat: { plan: 'business' as PlanType, text: 'ShopiChat: tu WhatsApp con IA y avisos de pedidos' },
}

export type LaunchFeature = keyof typeof PLAN_LAUNCH_FEATURES

/** Funciones que se venden hoy en un plan, sumando las lanzadas que se indiquen. */
export function getPlanFeatures(plan: PlanType, launched: Partial<Record<LaunchFeature, boolean>> = {}): string[] {
  const extra = (Object.keys(PLAN_LAUNCH_FEATURES) as LaunchFeature[])
    .filter(key => launched[key] && PLAN_LAUNCH_FEATURES[key].plan === plan)
    .map(key => PLAN_LAUNCH_FEATURES[key].text)
  return [...PLAN_FEATURES[plan].features, ...extra]
}

/**
 * Convierte cualquier fecha que venga de Firestore a Date (o null).
 * Los timestamps anidados (p. ej. `subscription.currentPeriodEnd`) llegan como
 * Timestamp de Firestore y `new Date(timestamp)` da "Invalid Date". Acepta:
 * Timestamp ({ toDate }), { seconds } / { _seconds }, Date, string ISO y numero (ms).
 */
export function toPlanDate(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === '') return null
  let d: Date | null = null
  if (raw instanceof Date) {
    d = raw
  } else if (typeof raw === 'object') {
    const obj = raw as { toDate?: () => Date; seconds?: number; _seconds?: number }
    if (typeof obj.toDate === 'function') d = obj.toDate()
    else if (typeof obj.seconds === 'number') d = new Date(obj.seconds * 1000)
    else if (typeof obj._seconds === 'number') d = new Date(obj._seconds * 1000)
  } else if (typeof raw === 'string' || typeof raw === 'number') {
    d = new Date(raw)
  }
  return d && !Number.isNaN(d.getTime()) ? d : null
}
