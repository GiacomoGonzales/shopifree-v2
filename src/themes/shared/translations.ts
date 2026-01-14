/**
 * Theme UI Translations
 * These are the texts displayed in store themes (not product content)
 */

export type ThemeLanguage = 'es' | 'en' | 'pt'

export interface ThemeTranslations {
  // Categories
  all: string

  // Product count
  item: string
  items: string

  // Product card
  view: string
  sale: string
  hot: string

  // Empty state
  noItems: string
  checkBackSoon: string

  // Contact section
  contact: string
  followUs: string

  // Cart
  cart: string
  checkout: string
  total: string
  addToCart: string

  // Product details
  brand: string
  sku: string

  // WhatsApp messages
  whatsappOrder: string
  whatsappGreeting: string

  // CTA buttons
  hitUsUp: string
  orderViaWhatsApp: string

  // Powered by
  poweredBy: string
}

export const themeTranslations: Record<ThemeLanguage, ThemeTranslations> = {
  es: {
    // Categories
    all: 'Todos',

    // Product count
    item: 'producto',
    items: 'productos',

    // Product card
    view: 'Ver',
    sale: 'Oferta',
    hot: 'Nuevo',

    // Empty state
    noItems: 'Sin productos',
    checkBackSoon: 'Vuelve pronto',

    // Contact section
    contact: 'Contacto',
    followUs: 'Siguenos',

    // Cart
    cart: 'Carrito',
    checkout: 'Pedir',
    total: 'Total',
    addToCart: 'Agregar',

    // Product details
    brand: 'Marca',
    sku: 'Codigo',

    // WhatsApp messages
    whatsappOrder: 'Hola! Quiero hacer este pedido:',
    whatsappGreeting: 'Hola! Estoy viendo',

    // CTA buttons
    hitUsUp: 'Contactanos',
    orderViaWhatsApp: 'Pedir por WhatsApp',

    // Powered by
    poweredBy: 'Creado con Shopifree',
  },

  en: {
    // Categories
    all: 'All',

    // Product count
    item: 'item',
    items: 'items',

    // Product card
    view: 'View',
    sale: 'Sale',
    hot: 'Hot',

    // Empty state
    noItems: 'No items',
    checkBackSoon: 'Check back soon',

    // Contact section
    contact: 'Contact',
    followUs: 'Follow us',

    // Cart
    cart: 'Cart',
    checkout: 'Checkout',
    total: 'Total',
    addToCart: 'Add to cart',

    // Product details
    brand: 'Brand',
    sku: 'SKU',

    // WhatsApp messages
    whatsappOrder: 'Hi! I want to order:',
    whatsappGreeting: "Hi! I'm checking out",

    // CTA buttons
    hitUsUp: 'Contact us',
    orderViaWhatsApp: 'Order via WhatsApp',

    // Powered by
    poweredBy: 'Powered by Shopifree',
  },

  pt: {
    // Categories
    all: 'Todos',

    // Product count
    item: 'item',
    items: 'itens',

    // Product card
    view: 'Ver',
    sale: 'Oferta',
    hot: 'Novo',

    // Empty state
    noItems: 'Sem produtos',
    checkBackSoon: 'Volte em breve',

    // Contact section
    contact: 'Contato',
    followUs: 'Siga-nos',

    // Cart
    cart: 'Carrinho',
    checkout: 'Finalizar',
    total: 'Total',
    addToCart: 'Adicionar',

    // Product details
    brand: 'Marca',
    sku: 'Codigo',

    // WhatsApp messages
    whatsappOrder: 'Ola! Quero fazer este pedido:',
    whatsappGreeting: 'Ola! Estou vendo',

    // CTA buttons
    hitUsUp: 'Fale conosco',
    orderViaWhatsApp: 'Pedir pelo WhatsApp',

    // Powered by
    poweredBy: 'Criado com Shopifree',
  },
}

/**
 * Get translations for a specific language
 * Falls back to Spanish if language not supported
 */
export function getThemeTranslations(language?: string): ThemeTranslations {
  const lang = (language || 'es') as ThemeLanguage
  return themeTranslations[lang] || themeTranslations.es
}
