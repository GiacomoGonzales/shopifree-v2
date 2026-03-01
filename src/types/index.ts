// ============================================
// USER TYPES
// ============================================
export interface User {
  id: string                    // Firebase Auth UID
  email: string
  // Datos personales
  firstName?: string
  lastName?: string
  phone?: string
  avatar?: string
  // Datos de empresa (para facturación)
  company?: {
    name?: string
    taxId?: string              // RUC, CUIT, RFC, etc.
    address?: string
    city?: string
    country?: string
  }
  // Referencia
  storeId?: string
  // Admin role
  role?: 'user' | 'admin'
  // Stripe
  stripeCustomerId?: string
  createdAt: Date
  updatedAt?: Date
}

// ============================================
// STORE TYPES
// ============================================
export interface Store {
  id: string
  ownerId: string               // user.id

  // === BÁSICO ===
  name: string
  subdomain: string             // mitienda.shopifree.app
  customDomain?: string         // mitienda.com (premium)
  domainStatus?: 'pending_verification' | 'verified' | 'not_found'
  domainVerification?: DomainVerification[]
  domainDnsRecords?: DnsRecord[]

  // === BRANDING ===
  logo?: string                 // URL Cloudinary
  heroImage?: string            // URL Cloudinary - Desktop (1920x600 recomendado)
  heroImageMobile?: string      // URL Cloudinary - Móvil (1200x800 recomendado, ratio 3:2)
  favicon?: string

  // === TIRA PUBLICITARIA ===
  announcement?: StoreAnnouncement

  // === TRUST BADGES ===
  trustBadges?: StoreTrustBadges

  // === FLASH SALE ===
  flashSale?: StoreFlashSale

  // === SOCIAL PROOF ===
  socialProof?: StoreSocialProof

  // === CONTACTO ===
  whatsapp: string
  email?: string
  instagram?: string
  facebook?: string
  tiktok?: string

  // === UBICACIÓN ===
  location?: StoreLocation

  // === SOBRE NOSOTROS ===
  about?: {
    slogan?: string             // Frase corta
    description?: string        // Texto más largo
  }

  // === CONFIGURACIÓN ===
  currency: string              // 'PEN', 'MXN', 'USD'
  timezone?: string
  language?: string             // 'es', 'en'

  // === TEMA ===
  themeId?: string              // ID del tema seleccionado
  themeSettings?: {
    primaryColor?: string
    secondaryColor?: string
    fontFamily?: string
    scrollReveal?: boolean
    imageSwapOnHover?: boolean
    productLayout?: 'grid' | 'masonry' | 'magazine' | 'carousel' | 'list'
    paginationType?: 'none' | 'load-more' | 'infinite-scroll' | 'classic'
    productViewMode?: 'drawer' | 'reels'
  }

  // === INTEGRACIONES ===
  integrations?: StoreIntegrations

  // === PAGOS ===
  payments?: StorePayments

  // === ENVÍO ===
  shipping?: StoreShipping

  // === APP MÓVIL ===
  appConfig?: StoreAppConfig

  // === PLAN & SUBSCRIPTION ===
  plan: 'free' | 'pro' | 'business'
  planExpiresAt?: Date
  trialEndsAt?: Date              // Free Pro trial (no card required)
  onboardingDismissed?: boolean   // User dismissed onboarding checklist
  emailsSent?: string[]           // Track which email sequences have been sent ('welcome', 'trial-reminder', 'trial-expired')
  subscription?: StoreSubscription

  // === TIPO DE NEGOCIO ===
  // New 8 business types (legacy values are normalized via normalizeBusinessType)
  businessType?: 'fashion' | 'food' | 'grocery' | 'cosmetics' | 'tech' | 'pets' | 'craft' | 'general' |
                 // Legacy values (for backwards compatibility, normalized on read)
                 'retail' | 'restaurant' | 'services' | 'other' | 'beauty'

  // === PRESENCIA ===
  lastOnlineAt?: Date

  // === META ===
  createdAt: Date
  updatedAt: Date
}

export interface StoreAnnouncement {
  enabled: boolean
  text: string                  // "Envío gratis en compras +$50"
  link?: string                 // URL opcional
  backgroundColor?: string      // hex color
  textColor?: string
  mode?: 'static' | 'marquee'  // Pro/Business only
}

export interface TrustBadgeItem {
  id: 'shipping' | 'secure' | 'returns' | 'quality' | 'support' | 'freeShipping' | 'natural' | 'madeWithLove'
  enabled: boolean
  text?: string                 // Custom text override
}

export interface StoreTrustBadges {
  enabled: boolean
  badges: TrustBadgeItem[]
}

export interface StoreFlashSale {
  enabled: boolean
  endDate: string           // ISO 8601 string
  text?: string             // "Oferta Flash! Termina en:"
  backgroundColor?: string
  textColor?: string
}

export interface StoreSocialProof {
  enabled: boolean
}

export interface DomainVerification {
  type: string                  // 'TXT' or 'CNAME'
  domain: string
  value: string
  reason: string
}

export interface DnsRecord {
  type: string                  // 'A', 'CNAME', 'TXT'
  name: string                  // '@', 'www', etc.
  value: string                 // IP or domain
}

export interface StoreLocation {
  address?: string
  city?: string
  state?: string
  country: string               // 'PE', 'MX', 'CO', etc.
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface StoreIntegrations {
  googleAnalytics?: string    // G-XXXXXXXXXX
  metaPixel?: string          // 123456789
  tiktokPixel?: string        // CXXXXXXXXX
  googleSearchConsole?: string // verification code
}

export interface StorePayments {
  whatsapp?: {
    enabled: boolean
  }
  mercadopago?: {
    enabled: boolean
    publicKey?: string
    accessToken?: string        // encrypted
    sandbox: boolean
  }
  stripe?: {
    enabled: boolean
    publishableKey?: string
    secretKey?: string
    testMode: boolean
  }
}

export interface StoreSubscription {
  stripeCustomerId: string      // cus_xxx
  stripeSubscriptionId: string  // sub_xxx
  stripePriceId: string         // price_xxx
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  trialEnd?: Date               // End date of the trial period (if trialing)
}

export interface StoreShipping {
  enabled: boolean              // Si el envío tiene costo
  cost: number                  // Costo fijo de envío
  freeAbove?: number            // Envío gratis arriba de este monto (opcional)
  pickupEnabled?: boolean       // Permitir retiro en tienda (default true)
  deliveryEnabled?: boolean     // Permitir delivery a domicilio (default true)
  // Zonas de envío - Fase 1
  coverageMode?: 'nationwide' | 'zones' | 'local'  // default: 'nationwide'
  allowedZones?: string[]       // lista de departamentos/estados permitidos (modo zones)
  localCost?: number            // costo envío local (misma zona que la tienda)
  nationalCost?: number         // costo envío nacional (otras zonas)
}

// ============================================
// PRODUCT TYPES
// ============================================
export interface Product {
  id: string
  storeId: string

  // === BÁSICO ===
  name: string
  slug: string
  description?: string | null
  shortDescription?: string | null  // Descripción corta para listados
  price: number
  comparePrice?: number         // Precio tachado (antes)
  cost?: number                 // Costo del producto (para calcular ganancia)

  // === INVENTARIO ===
  sku?: string                  // Código único del producto
  barcode?: string              // Código de barras (EAN, UPC)
  stock?: number                // Cantidad en inventario
  trackStock?: boolean          // Si se controla el stock
  lowStockAlert?: number        // Alerta cuando stock sea menor a este número

  // === IMÁGENES ===
  image?: string | null         // Imagen principal
  images?: string[]             // Galería (premium)
  video?: string | null         // Video del producto (Pro/Business, solo en Reels)

  // === ORGANIZACIÓN ===
  categoryId?: string | null
  brand?: string                // Marca del producto
  tags?: string[]

  // === FÍSICO (para envíos) ===
  weight?: number               // Peso en gramos
  dimensions?: {
    length?: number             // Largo en cm
    width?: number              // Ancho en cm
    height?: number             // Alto en cm
  }

  // === VARIACIONES (para ropa/retail) ===
  hasVariations?: boolean
  variations?: ProductVariation[]

  // === MODIFICADORES (para restaurantes/food) ===
  hasModifiers?: boolean
  modifierGroups?: ModifierGroup[]

  // === BUSINESS TYPE SPECIFIC FIELDS ===

  // Food: Preparation time
  prepTime?: {
    min: number
    max: number
    unit: 'min' | 'hr'
  }

  // Beauty: Service duration
  duration?: {
    value: number
    unit: 'min' | 'hr'
  }

  // Craft: Custom orders
  customizable?: boolean
  customizationInstructions?: string
  availableQuantity?: number     // For "Only X left" badge

  // Tech: Specifications and warranty
  specs?: Array<{
    key: string                  // E.g.: "RAM", "Storage", "Battery"
    value: string                // E.g.: "8GB", "256GB", "5000mAh"
  }>
  warranty?: {
    months: number
    description?: string         // E.g.: "Manufacturer warranty"
  }
  model?: string                 // Model number

  // Pets: Pet type and age
  petType?: 'dog' | 'cat' | 'bird' | 'fish' | 'small' | 'other'  // small = hamsters, rabbits, etc.
  petAge?: 'puppy' | 'adult' | 'senior' | 'all'

  // === SEO ===
  metaTitle?: string
  metaDescription?: string

  // === ESTADO ===
  active: boolean
  featured?: boolean
  order?: number

  // === META ===
  createdAt: Date
  updatedAt: Date
}

// Para RETAIL: Variaciones simples (sin stock)
export interface ProductVariation {
  id: string
  name: string                  // "Color", "Talla"
  options: VariationOption[]
}

export interface VariationOption {
  id: string
  value: string                 // "Rojo", "XL"
  image?: string                // Imagen de esa variante
  available: boolean            // Si está disponible
}

// Para RESTAURANTES: Modificadores
export interface ModifierGroup {
  id: string
  name: string                  // "Tipo de pan", "Extras"
  required: boolean             // Obligatorio?
  minSelect: number             // Mínimo a seleccionar (0 si opcional)
  maxSelect: number             // Máximo a seleccionar
  options: ModifierOption[]
}

export interface ModifierOption {
  id: string
  name: string                  // "Pan francés", "Queso extra"
  price: number                 // 0 si no tiene costo adicional
  available: boolean
}

// ============================================
// CATEGORY TYPES
// ============================================
export interface Category {
  id: string
  storeId: string
  name: string
  slug: string
  description?: string
  image?: string
  order: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================
// THEME TYPES
// ============================================
export interface Theme {
  id: string
  name: string                  // "Minimal", "Bold", "Classic"
  description: string
  thumbnail: string             // Preview image
  category: 'all' | 'retail' | 'restaurant' | 'services' | 'tech' | 'cosmetics' | 'grocery' | 'pets'
  isPremium: boolean
  isNew: boolean                // Para destacar en landing
  createdAt: Date
  colors?: {
    primary: string
    background: string
    accent: string
  }
}

// ============================================
// NEWSLETTER TYPES
// ============================================
export interface NewsletterSubscriber {
  id: string
  email: string
  source: 'landing' | 'store'   // De dónde se suscribió
  storeId?: string              // Si fue desde una tienda
  createdAt: Date
  unsubscribedAt?: Date
}

// ============================================
// ORDER TYPES
// ============================================
export interface Order {
  id: string
  storeId: string
  orderNumber: string           // ORD-001

  // Items del pedido
  items: OrderItem[]

  // Cliente
  customer?: {
    name?: string
    phone: string
    email?: string
  }

  // Delivery
  deliveryMethod?: 'pickup' | 'delivery'
  deliveryAddress?: {
    state?: string              // Departamento/Estado/Provincia
    city?: string               // Provincia/Municipio/Ciudad
    district?: string           // Distrito/Colonia/Barrio (PE, MX, etc.)
    street: string              // Dirección/Calle
    reference?: string          // Referencia
  }

  // Totales
  subtotal: number
  shippingCost?: number         // Costo de envío
  discount?: {
    code: string
    type: 'percentage' | 'fixed'
    value: number               // Percentage or fixed amount
    amount: number              // Actual amount discounted
  }
  total: number

  // Estado
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

  // Pago
  paymentMethod?: 'whatsapp' | 'mercadopago' | 'stripe' | 'transfer' | 'cash'
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded'
  paymentId?: string            // ID de MercadoPago

  // Notas
  notes?: string

  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  productId: string
  productName: string
  productImage?: string
  price: number
  quantity: number
  // Variaciones seleccionadas
  selectedVariations?: {
    name: string                // "Color"
    value: string               // "Rojo"
  }[]
  // Modificadores seleccionados
  selectedModifiers?: {
    groupName: string           // "Extras"
    options: {
      name: string              // "Queso extra"
      price: number
    }[]
  }[]
  itemTotal: number
}

// ============================================
// COUPON TYPES
// ============================================
export interface Coupon {
  id: string
  storeId: string
  code: string                    // e.g. "VERANO20"
  discountType: 'percentage' | 'fixed'
  discountValue: number           // 20 = 20% or $20
  minOrderAmount?: number         // Minimum subtotal to apply
  maxUses?: number                // null = unlimited
  currentUses: number
  active: boolean
  expiresAt?: Date
  createdAt: Date
}

// ============================================
// BLOG TYPES (para artículos hardcodeados)
// ============================================
export interface BlogArticle {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string               // Contenido en markdown o HTML
  image: string
  author: string
  publishedAt: Date
  tags?: string[]
}

// ============================================
// FAQ TYPES
// ============================================
export interface FAQItem {
  id: string
  question: string
  answer: string
  order: number
}

// ============================================
// ANALYTICS TYPES
// ============================================
export interface AnalyticsEventMetadata {
  deviceType?: 'mobile' | 'desktop'
  referrer?: string
  productName?: string
}

export interface AnalyticsEvent {
  id: string
  storeId: string
  type: 'page_view' | 'whatsapp_click' | 'product_view' | 'cart_add'
  productId?: string
  timestamp: Date
  metadata?: AnalyticsEventMetadata
  // For deduplication (session-based)
  sessionId?: string
}

export interface AnalyticsSummary {
  pageViews: number
  productViews: number
  cartAdds: number
  whatsappClicks: number
}

export interface DailyStats {
  date: string // YYYY-MM-DD format
  pageViews: number
  productViews: number
  cartAdds: number
  whatsappClicks: number
}

export interface TopProduct {
  productId: string
  productName: string
  views: number
}

export interface DeviceStats {
  mobile: number
  desktop: number
}

export interface RevenueMetrics {
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
}

export interface DailyRevenue {
  date: string  // YYYY-MM-DD
  revenue: number
  orders: number
}

export interface TopSellingProduct {
  productId: string
  productName: string
  quantitySold: number
  revenue: number
}

export interface ReferrerStats {
  source: string  // 'direct' | 'whatsapp' | 'instagram' | etc.
  count: number
}

export interface TrendComparison {
  current: number
  previous: number
  percentChange: number
  direction: 'up' | 'down' | 'flat'
}

// ============================================
// APP MÓVIL TYPES
// ============================================
export interface StoreAppConfig {
  appName: string
  icon?: string              // URL Cloudinary
  primaryColor: string
  secondaryColor: string
  splashColor: string
  status: 'none' | 'requested' | 'building' | 'published'
  requestedAt?: Date
  publishedAt?: Date
  androidUrl?: string
  iosUrl?: string
  pushEnabled: boolean
}

export interface PushToken {
  id: string
  token: string
  platform: 'ios' | 'android' | 'web'
  storeId: string
  createdAt: Date
}

export interface PushNotification {
  id: string
  storeId: string
  title: string
  body: string
  sentAt: Date
  recipientCount: number
}
