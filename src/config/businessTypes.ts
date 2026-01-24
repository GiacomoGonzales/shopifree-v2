/**
 * Business Type Configuration
 * Defines feature flags and labels for each business type
 */

export type BusinessType = 'food' | 'fashion' | 'beauty' | 'craft' | 'tech' | 'pets' | 'general'

export interface BusinessTypeFeatures {
  // Food features
  showModifiers: boolean        // Extras, toppings, sides
  showPrepTime: boolean         // Preparation time

  // Fashion features
  showVariants: boolean         // Size, color variations

  // Beauty features
  showServiceDuration: boolean  // Service duration
  showBookingCTA: boolean       // "Book via WhatsApp" CTA

  // Craft features
  showCustomOrder: boolean      // Custom order textarea
  showLimitedStock: boolean     // "Only X left" badge

  // Tech features
  showSpecs: boolean            // Technical specifications table
  showWarranty: boolean         // Warranty badge
  showModel: boolean            // Model number

  // Pets features
  showPetType: boolean          // For dogs, cats, etc.
  showPetAge: boolean           // Puppy, adult, senior

  // Shared features
  multipleImages: boolean       // Gallery support

  // Advanced form fields (conditionally shown per business type)
  showComparePrice: boolean     // Compare/original price for discounts
  showSku: boolean              // SKU code
  showBarcode: boolean          // Barcode
  showStock: boolean            // Stock tracking
  showCost: boolean             // Cost price (for margin calculation)
  showBrand: boolean            // Brand field
  showTags: boolean             // Tags field
  showShipping: boolean         // Shipping dimensions (weight, size)
}

export interface BusinessTypeLabels {
  name: string
  description: string
  icon: string
  // Product form labels
  productName: string
  productNamePlaceholder: string
  priceLabel: string
  // CTA labels
  addToCartLabel: string
  orderLabel: string
}

export interface BusinessTypeConfig {
  type: BusinessType
  features: BusinessTypeFeatures
  labels: {
    es: BusinessTypeLabels
    en: BusinessTypeLabels
    pt: BusinessTypeLabels
  }
}

// Default features (all disabled)
const defaultFeatures: BusinessTypeFeatures = {
  showModifiers: false,
  showPrepTime: false,
  showVariants: false,
  showServiceDuration: false,
  showBookingCTA: false,
  showCustomOrder: false,
  showLimitedStock: false,
  showSpecs: false,
  showWarranty: false,
  showModel: false,
  showPetType: false,
  showPetAge: false,
  multipleImages: false,
  // Advanced form fields - default to false
  showComparePrice: false,
  showSku: false,
  showBarcode: false,
  showStock: false,
  showCost: false,
  showBrand: false,
  showTags: false,
  showShipping: false,
}

export const BUSINESS_TYPES: Record<BusinessType, BusinessTypeConfig> = {
  food: {
    type: 'food',
    features: {
      ...defaultFeatures,
      showModifiers: true,
      showPrepTime: true,
      // Food: only cost for margin calculation
      showCost: true,
      showTags: true,
    },
    labels: {
      es: {
        name: 'Restaurante / Comida',
        description: 'Restaurantes, cafes, delivery de comida',
        icon: 'food',
        productName: 'Nombre del platillo',
        productNamePlaceholder: 'Ej: Hamburguesa clasica',
        priceLabel: 'Precio',
        addToCartLabel: 'Agregar',
        orderLabel: 'Ordenar',
      },
      en: {
        name: 'Restaurant / Food',
        description: 'Restaurants, cafes, food delivery',
        icon: 'food',
        productName: 'Dish name',
        productNamePlaceholder: 'E.g.: Classic burger',
        priceLabel: 'Price',
        addToCartLabel: 'Add',
        orderLabel: 'Order',
      },
      pt: {
        name: 'Restaurante / Comida',
        description: 'Restaurantes, cafes, delivery de comida',
        icon: 'food',
        productName: 'Nome do prato',
        productNamePlaceholder: 'Ex: Hamburguer classico',
        priceLabel: 'Preco',
        addToCartLabel: 'Adicionar',
        orderLabel: 'Pedir',
      },
    },
  },

  fashion: {
    type: 'fashion',
    features: {
      ...defaultFeatures,
      showVariants: true,
      multipleImages: true,
      // Fashion: full retail features
      showComparePrice: true,
      showSku: true,
      showStock: true,
      showCost: true,
      showBrand: true,
      showTags: true,
      showShipping: true,
    },
    labels: {
      es: {
        name: 'Moda / Ropa',
        description: 'Ropa, accesorios, boutiques',
        icon: 'fashion',
        productName: 'Nombre del producto',
        productNamePlaceholder: 'Ej: Vestido floral',
        priceLabel: 'Precio',
        addToCartLabel: 'Agregar',
        orderLabel: 'Comprar',
      },
      en: {
        name: 'Fashion / Clothing',
        description: 'Clothing, accessories, boutiques',
        icon: 'fashion',
        productName: 'Product name',
        productNamePlaceholder: 'E.g.: Floral dress',
        priceLabel: 'Price',
        addToCartLabel: 'Add',
        orderLabel: 'Buy',
      },
      pt: {
        name: 'Moda / Roupas',
        description: 'Roupas, acessorios, boutiques',
        icon: 'fashion',
        productName: 'Nome do produto',
        productNamePlaceholder: 'Ex: Vestido floral',
        priceLabel: 'Preco',
        addToCartLabel: 'Adicionar',
        orderLabel: 'Comprar',
      },
    },
  },

  beauty: {
    type: 'beauty',
    features: {
      ...defaultFeatures,
      showServiceDuration: true,
      showBookingCTA: true,
      // Beauty: services - minimal fields, no inventory/shipping
      showTags: true,
    },
    labels: {
      es: {
        name: 'Belleza / Servicios',
        description: 'Salones, spas, servicios de belleza',
        icon: 'beauty',
        productName: 'Nombre del servicio',
        productNamePlaceholder: 'Ej: Manicure gel',
        priceLabel: 'Precio',
        addToCartLabel: 'Reservar',
        orderLabel: 'Agendar',
      },
      en: {
        name: 'Beauty / Services',
        description: 'Salons, spas, beauty services',
        icon: 'beauty',
        productName: 'Service name',
        productNamePlaceholder: 'E.g.: Gel manicure',
        priceLabel: 'Price',
        addToCartLabel: 'Book',
        orderLabel: 'Schedule',
      },
      pt: {
        name: 'Beleza / Servicos',
        description: 'Saloes, spas, servicos de beleza',
        icon: 'beauty',
        productName: 'Nome do servico',
        productNamePlaceholder: 'Ex: Manicure em gel',
        priceLabel: 'Preco',
        addToCartLabel: 'Reservar',
        orderLabel: 'Agendar',
      },
    },
  },

  craft: {
    type: 'craft',
    features: {
      ...defaultFeatures,
      showCustomOrder: true,
      showLimitedStock: true,
      multipleImages: true,
      // Craft: handmade - cost for margin, tags, no barcodes
      showComparePrice: true,
      showCost: true,
      showTags: true,
    },
    labels: {
      es: {
        name: 'Artesanal / Handmade',
        description: 'Productos artesanales, hechos a mano',
        icon: 'craft',
        productName: 'Nombre del producto',
        productNamePlaceholder: 'Ej: Macrame colgante',
        priceLabel: 'Precio',
        addToCartLabel: 'Agregar',
        orderLabel: 'Encargar',
      },
      en: {
        name: 'Craft / Handmade',
        description: 'Handmade, artisanal products',
        icon: 'craft',
        productName: 'Product name',
        productNamePlaceholder: 'E.g.: Macrame wall hanging',
        priceLabel: 'Price',
        addToCartLabel: 'Add',
        orderLabel: 'Order',
      },
      pt: {
        name: 'Artesanal / Handmade',
        description: 'Produtos artesanais, feitos a mao',
        icon: 'craft',
        productName: 'Nome do produto',
        productNamePlaceholder: 'Ex: Macrame decorativo',
        priceLabel: 'Preco',
        addToCartLabel: 'Adicionar',
        orderLabel: 'Encomendar',
      },
    },
  },

  tech: {
    type: 'tech',
    features: {
      ...defaultFeatures,
      showSpecs: true,
      showWarranty: true,
      showModel: true,
      multipleImages: true,
      // Tech: full retail features
      showComparePrice: true,
      showSku: true,
      showBarcode: true,
      showStock: true,
      showCost: true,
      showBrand: true,
      showTags: true,
      showShipping: true,
    },
    labels: {
      es: {
        name: 'Tecnologia / Electronica',
        description: 'Electronica, gadgets, accesorios tech',
        icon: 'tech',
        productName: 'Nombre del producto',
        productNamePlaceholder: 'Ej: Audifonos Bluetooth',
        priceLabel: 'Precio',
        addToCartLabel: 'Agregar',
        orderLabel: 'Comprar',
      },
      en: {
        name: 'Tech / Electronics',
        description: 'Electronics, gadgets, tech accessories',
        icon: 'tech',
        productName: 'Product name',
        productNamePlaceholder: 'E.g.: Bluetooth headphones',
        priceLabel: 'Price',
        addToCartLabel: 'Add',
        orderLabel: 'Buy',
      },
      pt: {
        name: 'Tecnologia / Eletronica',
        description: 'Eletronicos, gadgets, acessorios tech',
        icon: 'tech',
        productName: 'Nome do produto',
        productNamePlaceholder: 'Ex: Fone Bluetooth',
        priceLabel: 'Preco',
        addToCartLabel: 'Adicionar',
        orderLabel: 'Comprar',
      },
    },
  },

  pets: {
    type: 'pets',
    features: {
      ...defaultFeatures,
      showVariants: true,         // Size variations for food/accessories
      showPetType: true,
      showPetAge: true,
      multipleImages: true,
      // Pets: retail with brand focus
      showComparePrice: true,
      showSku: true,
      showStock: true,
      showCost: true,
      showBrand: true,
      showTags: true,
      showShipping: true,
    },
    labels: {
      es: {
        name: 'Mascotas',
        description: 'Productos y accesorios para mascotas',
        icon: 'pets',
        productName: 'Nombre del producto',
        productNamePlaceholder: 'Ej: Alimento premium perros',
        priceLabel: 'Precio',
        addToCartLabel: 'Agregar',
        orderLabel: 'Comprar',
      },
      en: {
        name: 'Pets',
        description: 'Pet products and accessories',
        icon: 'pets',
        productName: 'Product name',
        productNamePlaceholder: 'E.g.: Premium dog food',
        priceLabel: 'Price',
        addToCartLabel: 'Add',
        orderLabel: 'Buy',
      },
      pt: {
        name: 'Pets',
        description: 'Produtos e acessorios para pets',
        icon: 'pets',
        productName: 'Nome do produto',
        productNamePlaceholder: 'Ex: Racao premium caes',
        priceLabel: 'Preco',
        addToCartLabel: 'Adicionar',
        orderLabel: 'Comprar',
      },
    },
  },

  general: {
    type: 'general',
    features: {
      ...defaultFeatures,
      // General: basic retail features
      showComparePrice: true,
      showSku: true,
      showStock: true,
      showCost: true,
      showBrand: true,
      showTags: true,
    },
    labels: {
      es: {
        name: 'General',
        description: 'Catalogo basico sin features especiales',
        icon: 'general',
        productName: 'Nombre del producto',
        productNamePlaceholder: 'Ej: Mi producto',
        priceLabel: 'Precio',
        addToCartLabel: 'Agregar',
        orderLabel: 'Pedir',
      },
      en: {
        name: 'General',
        description: 'Basic catalog without special features',
        icon: 'general',
        productName: 'Product name',
        productNamePlaceholder: 'E.g.: My product',
        priceLabel: 'Price',
        addToCartLabel: 'Add',
        orderLabel: 'Order',
      },
      pt: {
        name: 'Geral',
        description: 'Catalogo basico sem features especiais',
        icon: 'general',
        productName: 'Nome do produto',
        productNamePlaceholder: 'Ex: Meu produto',
        priceLabel: 'Preco',
        addToCartLabel: 'Adicionar',
        orderLabel: 'Pedir',
      },
    },
  },
}

/**
 * Get business type configuration
 */
export function getBusinessTypeConfig(type: BusinessType | string | undefined): BusinessTypeConfig {
  const normalizedType = normalizeBusinessType(type)
  return BUSINESS_TYPES[normalizedType]
}

/**
 * Get feature flags for a business type
 */
export function getBusinessTypeFeatures(type: BusinessType | string | undefined): BusinessTypeFeatures {
  return getBusinessTypeConfig(type).features
}

/**
 * Check if a specific feature is enabled for a business type
 */
export function hasFeature(type: BusinessType | string | undefined, feature: keyof BusinessTypeFeatures): boolean {
  return getBusinessTypeFeatures(type)[feature]
}

/**
 * Normalize legacy business types to new ones
 * Handles migration from old values (retail, restaurant, services, other)
 */
export function normalizeBusinessType(type: string | undefined): BusinessType {
  if (!type) return 'general'

  // Direct match
  if (type in BUSINESS_TYPES) {
    return type as BusinessType
  }

  // Legacy type mapping
  const legacyMap: Record<string, BusinessType> = {
    retail: 'general',
    restaurant: 'food',
    services: 'beauty',
    other: 'general',
  }

  return legacyMap[type] || 'general'
}

/**
 * Get all business types for selection UI
 */
export function getAllBusinessTypes(): BusinessTypeConfig[] {
  return Object.values(BUSINESS_TYPES)
}

/**
 * Get labels for a business type in a specific language
 */
export function getBusinessTypeLabels(
  type: BusinessType | string | undefined,
  language: 'es' | 'en' | 'pt' = 'es'
): BusinessTypeLabels {
  const config = getBusinessTypeConfig(type)
  return config.labels[language] || config.labels.es
}
