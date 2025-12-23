// Store types
export interface Store {
  id: string
  userId: string
  name: string
  subdomain: string
  description?: string
  whatsapp: string
  logo?: string
  banner?: string
  theme: string
  primaryColor?: string
  currency: string
  country: string
  plan: 'free' | 'premium' | 'pro'
  createdAt: Date
  updatedAt: Date
}

// Product types - simplified for catalog mode
export interface Product {
  id: string
  storeId: string
  name: string
  slug: string
  description?: string | null
  price: number
  comparePrice?: number
  image?: string | null  // Single image for basic version
  images?: string[]      // Multiple images for premium
  categoryId?: string | null
  variations?: Variation[]
  stock?: number
  trackStock?: boolean
  active: boolean
  order?: number
  createdAt: Date
  updatedAt: Date
}

export interface Variation {
  id: string
  type: 'color' | 'size' | 'custom'
  name: string
  options: VariationOption[]
}

export interface VariationOption {
  id: string
  value: string
  image?: string
  stock?: number
  priceModifier?: number
}

// Category types
export interface Category {
  id: string
  storeId: string
  name: string
  slug?: string
  description?: string
  image?: string
  order: number
  active?: boolean
  createdAt?: Date
  updatedAt?: Date
}

// Order types (for WhatsApp orders)
export interface Order {
  id: string
  storeId: string
  items: OrderItem[]
  customer: {
    name?: string
    phone: string
    email?: string
  }
  total: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  paymentMethod?: string
  paymentStatus?: 'pending' | 'paid' | 'failed'
  notes?: string
  createdAt: Date
}

export interface OrderItem {
  productId: string
  name: string
  price: number
  quantity: number
  variation?: string
  image?: string
}

// User types
export interface User {
  id: string
  email: string
  name?: string
  phone?: string
  storeId?: string
  createdAt: Date
}
