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

  // === CATÁLOGO ===
  catalogSettings?: StoreCatalogSettings

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

export interface StoreCatalogSettings {
  showOutOfStock?: boolean      // If true, show products with stock 0 in catalog (with "Agotado" badge). If false, they are hidden. Default true.
  showLowStockBadge?: boolean   // If true, show a "low stock" badge on cards when remaining units are at/below threshold. Default false.
  lowStockThreshold?: number    // Number of units considered "low stock". Default 5.
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
  district?: string             // Distrito/Colonia/Barrio (PE, MX, etc.)
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
  cjApiKey?: string           // CJ Dropshipping API key
  printfulToken?: string      // Printful API private token
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
  // Zonas de envío
  coverageMode?: 'nationwide' | 'zones' | 'local'  // default: 'nationwide'
  allowedZones?: string[]       // lista de departamentos/estados permitidos (modo zones)
  allowedProvinces?: string[]   // lista de provincias: "Departamento|Provincia"
  allowedDistricts?: string[]   // lista de distritos: "Departamento|Provincia|Distrito"
  localCost?: number            // costo envío local (misma zona que la tienda)
  nationalCost?: number         // costo envío nacional (otras zonas)
  // Dropshipping: auto-calculate from CJ freight + margin
  cjAutoShipping?: boolean      // If true, use CJ freight cost instead of fixed cost for CJ products
  cjShippingMargin?: number     // Extra amount to add on top of CJ freight (in store currency)
  // International shipping
  internationalShipping?: boolean  // Allow customers from other countries
  internationalCost?: number       // Flat shipping cost for international orders
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
  combinations?: VariantCombination[]  // Combinaciones generadas (ej: Negro-XL, Blanco-M)

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

  // === DROPSHIPPING ===
  cjProductId?: string            // CJ Dropshipping product ID
  cjVariants?: CJVariantMap[]     // Maps variant combos to CJ vid/sku for fulfillment
  printfulProductId?: number      // Printful sync product ID
  printfulVariants?: PrintfulVariantMap[]  // Maps variant combos to Printful variant IDs

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
  stock?: number                // Stock por variante (legacy, usar combinations)
}

// Combinacion de variantes con stock y precio independiente
// Ej: { options: { "Color": "Negro", "Talla": "XL" }, sku: "CAM-NEG-XL", stock: 15, price: 28 }
export interface VariantCombination {
  id: string                    // ID unico
  options: Record<string, string>  // { "Color": "Negro", "Talla": "XL" }
  sku?: string
  barcode?: string
  stock: number                 // Stock total (suma de todos los almacenes)
  warehouseStock?: Record<string, number>  // { warehouseId: quantity } stock por almacen
  price?: number                // Si no tiene, usa el precio del producto
  cost?: number                 // Costo de esta combinacion
  image?: string                // Imagen de esta combinacion
  available: boolean
}

// Maps a CJ variant combination to its vid/sku for order fulfillment
// e.g. { variantKey: "Red-XL", vid: "abc123", sku: "CJ-SKU-001", sellPrice: 5.99 }
export interface CJVariantMap {
  variantKey: string            // "Cherry wood-IPhone11" — the combo identifier
  vid: string                   // CJ variant ID needed for order creation
  sku: string                   // CJ variant SKU
  sellPrice: number             // CJ cost in USD
}

// Maps a Printful variant to its catalog variant ID for order fulfillment
export interface PrintfulVariantMap {
  variantKey: string            // "Black-M" — the combo identifier
  variantId: number             // Printful catalog variant ID
  retailPrice: number           // Price set by the store owner
  costPrice: number             // Printful base cost in USD
  sku?: string                  // Optional SKU
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
    country?: string            // Country code (PE, AR, MX) — only for international
    state?: string              // Departamento/Estado/Provincia
    city?: string               // Provincia/Municipio/Ciudad
    district?: string           // Distrito/Colonia/Barrio (PE, MX, etc.)
    street: string              // Dirección/Calle
    reference?: string          // Referencia
    zipCode?: string            // Código postal
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
  paymentMethod?: 'whatsapp' | 'mercadopago' | 'stripe' | 'transfer' | 'cash' | 'card' | 'other'
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded'
  paymentId?: string            // ID de MercadoPago
  paidAt?: Date                 // When payment was confirmed (marks real income for cash flow)
  paymentNote?: string          // Optional note: reference #, terminal, etc.

  // Origen del pedido (para distinguir ventas online vs manuales)
  channel?: 'online' | 'in_store' | 'whatsapp' | 'instagram' | 'other'
  manual?: boolean              // true if created from Dashboard (Nueva venta), false/undefined if from storefront

  // Notas
  notes?: string

  // Dropshipping fulfillment
  cjOrderId?: string
  printfulOrderId?: number        // Printful order ID
  fulfillmentProvider?: 'cj' | 'printful'  // Which provider fulfills this order
  trackingNumber?: string
  trackingCarrier?: string
  fulfillmentStatus?: 'none' | 'submitted' | 'shipped' | 'delivered' | 'failed'
  fulfillmentError?: string

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
  // Dropshipping
  cjProductId?: string            // Set if this item is from CJ Dropshipping
  printfulProductId?: number      // Set if this item is from Printful
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

  // CI build tracking — updated by the GitHub Actions workflow.
  build?: {
    status: 'idle' | 'queued' | 'running' | 'success' | 'failed'
    runId?: string              // GitHub Actions run ID (for log linking)
    runUrl?: string             // Direct URL to the run on github.com
    artifactUrl?: string        // Signed URL to download AAB (Firebase Storage)
    artifactName?: string       // e.g. "alienstore-v3.aab"
    buildNumber?: number        // Android versionCode (auto-incrementing)
    versionName?: string        // e.g. "1.0.3"
    lastError?: string
    startedAt?: Date
    finishedAt?: Date
  }
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

// ============================================
// FINANCE TYPES
// ============================================
export interface StockMovement {
  id: string
  productId: string
  productName: string
  variationName?: string
  optionValue?: string
  type: 'sale' | 'purchase' | 'adjustment' | 'production' | 'transfer'
  quantity: number              // positive = increase, negative = decrease
  previousStock: number
  newStock: number
  referenceType?: 'order' | 'purchase' | 'production_order' | 'manual'
  referenceId?: string
  reason?: string
  warehouseId?: string
  warehouseName?: string
  createdBy: string
  createdAt: Date
}

export interface Supplier {
  id: string
  name: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  productIds?: string[]
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PurchaseItem {
  productId: string
  productName: string
  quantity: number
  unitCost: number
  totalCost: number
  variationName?: string
  optionValue?: string
}

export interface Purchase {
  id: string
  supplierId: string
  supplierName: string
  items: PurchaseItem[]
  subtotal: number
  total: number
  status: 'draft' | 'received' | 'cancelled'
  warehouseId?: string
  warehouseName?: string
  notes?: string
  date: Date
  expenseId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Warehouse {
  id: string
  name: string
  address?: string
  branchId: string
  branchName?: string
  isDefault: boolean
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Branch {
  id: string
  name: string
  address?: string
  phone?: string
  warehouseId?: string
  warehouseName?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProductionOrder {
  id: string
  productId: string
  productName: string
  variationName?: string
  optionValue?: string
  quantity: number
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  warehouseId?: string
  warehouseName?: string
  notes?: string
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}
