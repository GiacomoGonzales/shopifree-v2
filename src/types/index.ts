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
  }

  // === PAGOS ===
  payments?: StorePayments

  // === ENVÍO ===
  shipping?: StoreShipping

  // === PLAN & SUBSCRIPTION ===
  plan: 'free' | 'pro' | 'business'
  planExpiresAt?: Date
  subscription?: StoreSubscription

  // === TIPO DE NEGOCIO ===
  // New 8 business types (legacy values are normalized via normalizeBusinessType)
  businessType?: 'fashion' | 'food' | 'grocery' | 'cosmetics' | 'tech' | 'pets' | 'craft' | 'general' |
                 // Legacy values (for backwards compatibility, normalized on read)
                 'retail' | 'restaurant' | 'services' | 'other' | 'beauty'

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

export interface StorePayments {
  mercadopago?: {
    enabled: boolean
    publicKey?: string
    accessToken?: string        // encrypted
    sandbox: boolean
  }
  // Estructura lista para agregar más pasarelas
}

export interface StoreSubscription {
  stripeCustomerId: string      // cus_xxx
  stripeSubscriptionId: string  // sub_xxx
  stripePriceId: string         // price_xxx
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
}

export interface StoreShipping {
  enabled: boolean              // Si el envío tiene costo
  cost: number                  // Costo fijo de envío
  freeAbove?: number            // Envío gratis arriba de este monto (opcional)
  pickupEnabled?: boolean       // Permitir retiro en tienda (default true)
  deliveryEnabled?: boolean     // Permitir delivery a domicilio (default true)
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
    street: string
    city: string
    reference?: string
  }

  // Totales
  subtotal: number
  shippingCost?: number         // Costo de envío
  total: number

  // Estado
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

  // Pago
  paymentMethod?: 'whatsapp' | 'mercadopago' | 'transfer' | 'cash'
  paymentStatus?: 'pending' | 'paid' | 'refunded'
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
