import { initializeApp } from 'firebase/app'
import { getAuth, initializeAuth, indexedDBLocalPersistence } from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, query, where, orderBy, limit, Timestamp, runTransaction, type DocumentData } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import type { User, Store, Product, Category, Order, Coupon, AnalyticsEventMetadata, AnalyticsSummary, DailyStats, TopProduct, DeviceStats, ReferrerStats, RevenueMetrics } from '../types'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'shopifree-v2',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)

export const auth = Capacitor.isNativePlatform()
  ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
  : getAuth(app)

// Enable Firestore persistence for faster subsequent loads
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
})

export const storage = getStorage(app)

// ============================================
// HELPER FUNCTIONS
// ============================================

const convertTimestamps = <T extends DocumentData>(data: T): T => {
  const converted = { ...data } as Record<string, unknown>
  for (const key in converted) {
    const value = converted[key]
    if (value instanceof Timestamp) {
      converted[key] = value.toDate()
    }
  }
  return converted as T
}

// ============================================
// USER SERVICES
// ============================================

export const userService = {
  async get(userId: string): Promise<User | null> {
    const docRef = doc(db, 'users', userId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as User
  },

  async create(userId: string, data: Partial<User>): Promise<void> {
    await setDoc(doc(db, 'users', userId), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  },

  async update(userId: string, data: Partial<User>): Promise<void> {
    await updateDoc(doc(db, 'users', userId), {
      ...data,
      updatedAt: new Date()
    })
  }
}

// ============================================
// STORE SERVICES
// ============================================

export const storeService = {
  async get(storeId: string): Promise<Store | null> {
    const docRef = doc(db, 'stores', storeId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Store
  },

  async getByOwner(ownerId: string): Promise<Store | null> {
    const q = query(collection(db, 'stores'), where('ownerId', '==', ownerId))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const docSnap = snapshot.docs[0]
    return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Store
  },

  async getBySubdomain(subdomain: string): Promise<Store | null> {
    const q = query(collection(db, 'stores'), where('subdomain', '==', subdomain))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const docSnap = snapshot.docs[0]
    return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Store
  },

  async create(storeId: string, data: Partial<Store>): Promise<void> {
    // CRITICAL: Check if store already exists to prevent accidental overwrites
    const existingStore = await this.get(storeId)
    if (existingStore) {
      console.warn('[storeService.create] Store already exists, skipping creation:', storeId)
      throw new Error('STORE_ALREADY_EXISTS')
    }

    await setDoc(doc(db, 'stores', storeId), {
      ...data,
      plan: data.plan || 'free', // Use provided plan or default to free
      stats: {
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // Register subdomain
    if (data.subdomain) {
      await setDoc(doc(db, 'subdomains', data.subdomain), {
        storeId,
        createdAt: new Date()
      })
    }

    // Create default branch + warehouse
    const branchRef = await addDoc(collection(db, `stores/${storeId}/branches`), {
      name: 'Principal',
      address: '',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await addDoc(collection(db, `stores/${storeId}/warehouses`), {
      name: 'Almacen Principal',
      address: '',
      branchId: branchRef.id,
      branchName: 'Principal',
      isDefault: true,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  },

  async update(storeId: string, data: Partial<Store>): Promise<void> {
    await updateDoc(doc(db, 'stores', storeId), {
      ...data,
      updatedAt: new Date()
    })
  }
}

// ============================================
// STOCK MUTATION HELPERS
// ============================================
// All stock mutations go through a Firestore transaction so concurrent writers
// (POS sales, purchases, inventory edits) can't race a read-modify-write and
// corrupt inventory (two writers both reading stock=1 and both writing 0).
// `sign` is -1 for a decrement (sale) and +1 for a restore (cancel/refund),
// which lets decrement and restore share one code path and stay symmetric.
//
// These decrements clamp at 0 (never throw): online orders apply stock
// server-side on payment confirmation (see api/_shared/order-stock.ts) where a
// confirmed-and-paid order can't be rejected, so clamping is the right policy.

type WarehouseStock = Record<string, number>

const sumValues = (m: WarehouseStock): number =>
  Object.values(m).reduce((s, n) => s + (n || 0), 0)

/**
 * Adjust a per-warehouse stock map by `delta` units (negative = take out,
 * positive = put back) while keeping the map non-negative and the total
 * correct. Single-warehouse stores (the common case) have exactly one key, so
 * this is exact. For multi-warehouse we prefer `preferredId`, otherwise take
 * from the fullest warehouse (decrement) / the default-or-first (restore) — an
 * approximation that always keeps `sum(warehouseStock)` consistent, which is
 * what `product.stock` mirrors.
 */
function adjustWarehouseStock(
  ws: WarehouseStock | undefined,
  delta: number,
  preferredId?: string,
): WarehouseStock | undefined {
  if (!ws || Object.keys(ws).length === 0) return ws
  const next: WarehouseStock = { ...ws }
  if (delta < 0) {
    let remaining = -delta
    const order = Object.keys(next).sort((a, b) => {
      if (a === preferredId) return -1
      if (b === preferredId) return 1
      return (next[b] || 0) - (next[a] || 0)
    })
    for (const wid of order) {
      if (remaining <= 0) break
      const take = Math.min(next[wid] || 0, remaining)
      next[wid] = (next[wid] || 0) - take
      remaining -= take
    }
  } else if (delta > 0) {
    const target = preferredId && preferredId in next ? preferredId : Object.keys(next)[0]
    next[target] = (next[target] || 0) + delta
  }
  return next
}

/** Run a stock mutator for one product inside a transaction (atomic RMW). */
async function mutateProductStock(
  storeId: string,
  productId: string,
  mutate: (data: DocumentData) => Record<string, unknown> | null,
): Promise<void> {
  const ref = doc(db, 'stores', storeId, 'products', productId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const patch = mutate(snap.data())
    if (!patch) return
    tx.update(ref, { ...patch, updatedAt: new Date() })
  })
}

/** Patch for a simple (non-variant) product. */
function simpleStockPatch(data: DocumentData, qty: number, sign: number): Record<string, unknown> {
  const ws = data.warehouseStock as WarehouseStock | undefined
  if (ws && Object.keys(ws).length > 0) {
    const newWs = adjustWarehouseStock(ws, sign * qty)!
    return { warehouseStock: newWs, stock: sumValues(newWs) }
  }
  const cur = typeof data.stock === 'number' ? data.stock : 0
  return { stock: Math.max(0, cur + sign * qty) }
}

/** Patch for a legacy variant product (option-level stock). */
function variantStockPatch(
  data: DocumentData,
  updates: { variationName: string; optionValue: string; quantity: number }[],
  sign: number,
): Record<string, unknown> | null {
  const variations = data.variations as Array<{ name: string; options: Array<{ value: string; stock?: number }> }> | undefined
  if (!variations) return null
  let totalDelta = 0
  for (const u of updates) {
    const variation = variations.find(v => v.name === u.variationName)
    const option = variation?.options.find(o => o.value === u.optionValue)
    if (option && typeof option.stock === 'number') {
      option.stock = Math.max(0, option.stock + sign * u.quantity)
    }
    totalDelta += sign * u.quantity
  }
  const patch: Record<string, unknown> = { variations }
  const ws = data.warehouseStock as WarehouseStock | undefined
  if (ws && Object.keys(ws).length > 0) {
    const newWs = adjustWarehouseStock(ws, totalDelta)!
    patch.warehouseStock = newWs
    patch.stock = sumValues(newWs)
  } else if (typeof data.stock === 'number') {
    patch.stock = Math.max(0, data.stock + totalDelta)
  }
  return patch
}

/** Patch for a modern combinations[] product (source of truth). */
function combinationStockPatch(
  data: DocumentData,
  updates: { combinationId: string; quantity: number; warehouseId?: string }[],
  sign: number,
): Record<string, unknown> | null {
  const combinations = (data.combinations || []) as Array<{ id: string; stock: number; warehouseStock?: WarehouseStock }>
  if (combinations.length === 0) return null
  for (const u of updates) {
    const combo = combinations.find(c => c.id === u.combinationId)
    if (!combo) continue
    combo.stock = Math.max(0, (combo.stock || 0) + sign * u.quantity)
    if (combo.warehouseStock && Object.keys(combo.warehouseStock).length > 0) {
      combo.warehouseStock = adjustWarehouseStock(combo.warehouseStock, sign * u.quantity, u.warehouseId)
    }
  }
  // product.stock / warehouseStock are always derived from the combinations.
  const patch: Record<string, unknown> = {
    combinations,
    stock: combinations.reduce((s, c) => s + (c.stock || 0), 0),
  }
  const newWs: WarehouseStock = {}
  let hasWs = false
  for (const c of combinations) {
    if (c.warehouseStock) {
      hasWs = true
      for (const [wid, q] of Object.entries(c.warehouseStock)) newWs[wid] = (newWs[wid] || 0) + (q || 0)
    }
  }
  if (hasWs) patch.warehouseStock = newWs
  return patch
}

/** Group a flat list of per-product updates by productId. */
function groupByProduct<T extends { productId: string }>(updates: T[]): Map<string, T[]> {
  const byProduct = new Map<string, T[]>()
  for (const u of updates) {
    const list = byProduct.get(u.productId) || []
    list.push(u)
    byProduct.set(u.productId, list)
  }
  return byProduct
}

// ============================================
// PRODUCT SERVICES (Subcollection)
// ============================================

export const productService = {
  getCollection(storeId: string) {
    return collection(db, 'stores', storeId, 'products')
  },

  async getAll(storeId: string): Promise<Product[]> {
    const q = query(
      this.getCollection(storeId),
      orderBy('order', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      storeId,
      ...convertTimestamps(doc.data())
    })) as Product[]
  },

  async getActive(storeId: string): Promise<Product[]> {
    const q = query(
      this.getCollection(storeId),
      where('active', '==', true),
      orderBy('order', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      storeId,
      ...convertTimestamps(doc.data())
    })) as Product[]
  },

  async get(storeId: string, productId: string): Promise<Product | null> {
    const docRef = doc(db, 'stores', storeId, 'products', productId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return { id: docSnap.id, storeId, ...convertTimestamps(docSnap.data()) } as Product
  },

  async create(storeId: string, data: Partial<Product>): Promise<string> {
    const productsRef = this.getCollection(storeId)
    const newDocRef = doc(productsRef)
    await setDoc(newDocRef, {
      ...data,
      storeId,
      active: data.active ?? true,
      order: data.order ?? 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    return newDocRef.id
  },

  async update(storeId: string, productId: string, data: Partial<Product>): Promise<void> {
    await updateDoc(doc(db, 'stores', storeId, 'products', productId), {
      ...data,
      updatedAt: new Date()
    })
  },

  async delete(storeId: string, productId: string): Promise<void> {
    await deleteDoc(doc(db, 'stores', storeId, 'products', productId))
  },

  // Simple products (no variants). Atomic per-product transaction keeps
  // `stock` (and `warehouseStock`, when present) in sync without racing.
  async decrementStock(storeId: string, items: { productId: string; quantity: number }[]): Promise<void> {
    for (const [productId, group] of groupByProduct(items)) {
      const qty = group.reduce((s, i) => s + i.quantity, 0)
      await mutateProductStock(storeId, productId, data => simpleStockPatch(data, qty, -1))
    }
  },

  async restoreStock(storeId: string, items: { productId: string; quantity: number }[]): Promise<void> {
    for (const [productId, group] of groupByProduct(items)) {
      const qty = group.reduce((s, i) => s + i.quantity, 0)
      await mutateProductStock(storeId, productId, data => simpleStockPatch(data, qty, +1))
    }
  },

  // Legacy variant products (option-level stock). Atomic; also keeps the
  // product-level total in sync so ProductCard ("agotado") and the dashboard
  // can't drift apart.
  async decrementVariantStock(storeId: string, updates: { productId: string; variationName: string; optionValue: string; quantity: number }[]): Promise<void> {
    for (const [productId, group] of groupByProduct(updates)) {
      await mutateProductStock(storeId, productId, data => variantStockPatch(data, group, -1))
    }
  },

  async restoreVariantStock(storeId: string, updates: { productId: string; variationName: string; optionValue: string; quantity: number }[]): Promise<void> {
    for (const [productId, group] of groupByProduct(updates)) {
      await mutateProductStock(storeId, productId, data => variantStockPatch(data, group, +1))
    }
  },

  // Modern path: stock lives on combinations[] (the source of truth used by the
  // dashboard inventory, purchases, and production flows). Atomic; product.stock
  // and product.warehouseStock are always recomputed from the combinations.
  async decrementCombinationStock(
    storeId: string,
    updates: { productId: string; combinationId: string; quantity: number; warehouseId?: string }[],
  ): Promise<void> {
    for (const [productId, group] of groupByProduct(updates)) {
      await mutateProductStock(storeId, productId, data => combinationStockPatch(data, group, -1))
    }
  },

  async restoreCombinationStock(
    storeId: string,
    updates: { productId: string; combinationId: string; quantity: number; warehouseId?: string }[],
  ): Promise<void> {
    for (const [productId, group] of groupByProduct(updates)) {
      await mutateProductStock(storeId, productId, data => combinationStockPatch(data, group, +1))
    }
  }
}

// ============================================
// CATEGORY SERVICES (Subcollection)
// ============================================

export const categoryService = {
  getCollection(storeId: string) {
    return collection(db, 'stores', storeId, 'categories')
  },

  async getAll(storeId: string): Promise<Category[]> {
    const q = query(
      this.getCollection(storeId),
      orderBy('order', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      storeId,
      ...convertTimestamps(doc.data())
    })) as Category[]
  },

  async getActive(storeId: string): Promise<Category[]> {
    const q = query(
      this.getCollection(storeId),
      where('active', '==', true),
      orderBy('order', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      storeId,
      ...convertTimestamps(doc.data())
    })) as Category[]
  },

  async get(storeId: string, categoryId: string): Promise<Category | null> {
    const docRef = doc(db, 'stores', storeId, 'categories', categoryId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return { id: docSnap.id, storeId, ...convertTimestamps(docSnap.data()) } as Category
  },

  async create(storeId: string, data: Partial<Category>): Promise<string> {
    const categoriesRef = this.getCollection(storeId)
    const newDocRef = doc(categoriesRef)
    await setDoc(newDocRef, {
      ...data,
      storeId,
      active: data.active ?? true,
      order: data.order ?? 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    return newDocRef.id
  },

  async update(storeId: string, categoryId: string, data: Partial<Category>): Promise<void> {
    await updateDoc(doc(db, 'stores', storeId, 'categories', categoryId), {
      ...data,
      updatedAt: new Date()
    })
  },

  async delete(storeId: string, categoryId: string): Promise<void> {
    await deleteDoc(doc(db, 'stores', storeId, 'categories', categoryId))
  }
}

// ============================================
// ORDER SERVICES (Subcollection)
// ============================================

export const orderService = {
  getCollection(storeId: string) {
    return collection(db, 'stores', storeId, 'orders')
  },

  async getAll(storeId: string, limitCount = 50): Promise<Order[]> {
    const q = query(
      this.getCollection(storeId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      storeId,
      ...convertTimestamps(doc.data())
    })) as Order[]
  },

  async create(storeId: string, data: Partial<Order>): Promise<{ id: string; orderNumber: string }> {
    const ordersRef = this.getCollection(storeId)
    const newDocRef = doc(ordersRef)

    // Generate order number using timestamp + random suffix (no read required)
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    const orderNumber = `ORD-${timestamp.toString(36).toUpperCase().slice(-4)}${random}`

    // Respect explicit status / paymentStatus from caller (e.g. manual sale created as paid+delivered).
    // Only default to 'pending' if caller didn't specify.
    await setDoc(newDocRef, {
      ...data,
      storeId,
      orderNumber,
      status: data.status || 'pending',
      paymentStatus: data.paymentStatus || 'pending',
      createdAt: data.createdAt || new Date(),
      updatedAt: new Date()
    })
    return { id: newDocRef.id, orderNumber }
  },

  async updateStatus(storeId: string, orderId: string, status: Order['status']): Promise<void> {
    await updateDoc(doc(db, 'stores', storeId, 'orders', orderId), {
      status,
      updatedAt: new Date()
    })
  },

  async update(storeId: string, orderId: string, data: Partial<Order>): Promise<void> {
    await updateDoc(doc(db, 'stores', storeId, 'orders', orderId), {
      ...data,
      updatedAt: new Date()
    })
  },

  async delete(storeId: string, orderId: string): Promise<void> {
    await deleteDoc(doc(db, 'stores', storeId, 'orders', orderId))
  }
}

// ============================================
// COUPON SERVICES (Subcollection)
// ============================================

export const couponService = {
  getCollection(storeId: string) {
    return collection(db, 'stores', storeId, 'coupons')
  },

  async getAll(storeId: string): Promise<Coupon[]> {
    const q = query(this.getCollection(storeId), orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({
      id: d.id,
      storeId,
      ...convertTimestamps(d.data())
    })) as Coupon[]
  },

  // Coupons the merchant chose to surface as one-tap buttons in the storefront
  // checkout. Filters expired/maxed-out coupons client-side so a stale flag
  // never shows an unusable button. Single-field query → no composite index.
  async getCheckoutVisible(storeId: string): Promise<Coupon[]> {
    const q = query(this.getCollection(storeId), where('showInCheckout', '==', true))
    const snapshot = await getDocs(q)
    const coupons = snapshot.docs.map(d => ({
      id: d.id,
      storeId,
      ...convertTimestamps(d.data())
    })) as Coupon[]
    return coupons.filter(c => {
      if (!c.active) return false
      if (c.expiresAt) {
        const expires = c.expiresAt instanceof Date ? c.expiresAt : new Date(c.expiresAt)
        if (expires.getTime() < Date.now()) return false
      }
      if (c.maxUses && c.currentUses >= c.maxUses) return false
      return true
    })
  },

  async create(storeId: string, data: Partial<Coupon>): Promise<string> {
    const docRef = await addDoc(this.getCollection(storeId), {
      ...data,
      storeId,
      code: (data.code || '').toUpperCase().trim(),
      currentUses: 0,
      active: true,
      createdAt: new Date()
    })
    return docRef.id
  },

  async update(storeId: string, couponId: string, data: Partial<Coupon>): Promise<void> {
    await updateDoc(doc(db, 'stores', storeId, 'coupons', couponId), { ...data })
  },

  async delete(storeId: string, couponId: string): Promise<void> {
    await deleteDoc(doc(db, 'stores', storeId, 'coupons', couponId))
  },

  async validateCode(storeId: string, code: string, subtotal: number): Promise<{ valid: boolean; coupon?: Coupon; error?: string }> {
    const upperCode = code.toUpperCase().trim()
    const q = query(this.getCollection(storeId), where('code', '==', upperCode), where('active', '==', true))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return { valid: false, error: 'invalid' }
    }

    const coupon = { id: snapshot.docs[0].id, storeId, ...convertTimestamps(snapshot.docs[0].data()) } as Coupon

    // Check expiration
    if (coupon.expiresAt) {
      const expires = coupon.expiresAt instanceof Date ? coupon.expiresAt : new Date(coupon.expiresAt)
      if (expires.getTime() < Date.now()) {
        return { valid: false, error: 'expired' }
      }
    }

    // Check max uses
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      return { valid: false, error: 'maxUses' }
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      return { valid: false, error: 'minAmount' }
    }

    return { valid: true, coupon }
  },

  async incrementUses(storeId: string, couponId: string): Promise<void> {
    const docRef = doc(db, 'stores', storeId, 'coupons', couponId)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      const current = snap.data().currentUses || 0
      await updateDoc(docRef, { currentUses: current + 1 })
    }
  }
}

// ============================================
// STORAGE SERVICES
// ============================================

export const storageService = {
  async uploadStoreImage(storeId: string, file: File, type: 'logo' | 'hero' | 'favicon'): Promise<string> {
    const ext = file.name.split('.').pop()
    const path = `stores/${storeId}/${type}.${ext}`
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  },

  async uploadProductImage(storeId: string, productId: string, file: File, index = 0): Promise<string> {
    const ext = file.name.split('.').pop()
    const fileName = index === 0 ? 'main' : String(index)
    const path = `stores/${storeId}/products/${productId}/${fileName}.${ext}`
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  },

  async deleteProductImage(storeId: string, productId: string, fileName: string): Promise<void> {
    const path = `stores/${storeId}/products/${productId}/${fileName}`
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
  }
}

// ============================================
// ANALYTICS SERVICES
// ============================================

export const analyticsService = {
  getCollection(storeId: string) {
    return collection(db, 'stores', storeId, 'analytics')
  },

  async track(
    storeId: string,
    type: 'page_view' | 'whatsapp_click' | 'product_view' | 'cart_add',
    productId?: string,
    metadata?: AnalyticsEventMetadata
  ): Promise<void> {
    try {
      await addDoc(this.getCollection(storeId), {
        type,
        productId: productId || null,
        timestamp: new Date(),
        ...(metadata && { metadata })
      })
    } catch (error) {
      console.error('Error tracking analytics:', error)
    }
  },

  async getWeeklyStats(storeId: string): Promise<{ pageViews: number; whatsappClicks: number }> {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    try {
      const q = query(
        this.getCollection(storeId),
        where('timestamp', '>=', oneWeekAgo)
      )
      const snapshot = await getDocs(q)

      let pageViews = 0
      let whatsappClicks = 0

      snapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.type === 'page_view') pageViews++
        if (data.type === 'whatsapp_click') whatsappClicks++
      })

      return { pageViews, whatsappClicks }
    } catch (error) {
      console.error('Error getting analytics:', error)
      return { pageViews: 0, whatsappClicks: 0 }
    }
  },

  async getDateRangeStats(storeId: string, startDate: Date, endDate: Date): Promise<AnalyticsSummary> {
    try {
      const q = query(
        this.getCollection(storeId),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate)
      )
      const snapshot = await getDocs(q)

      const stats: AnalyticsSummary = {
        pageViews: 0,
        productViews: 0,
        cartAdds: 0,
        whatsappClicks: 0
      }

      snapshot.docs.forEach(doc => {
        const data = doc.data()
        switch (data.type) {
          case 'page_view': stats.pageViews++; break
          case 'product_view': stats.productViews++; break
          case 'cart_add': stats.cartAdds++; break
          case 'whatsapp_click': stats.whatsappClicks++; break
        }
      })

      return stats
    } catch (error) {
      console.error('Error getting date range stats:', error)
      return { pageViews: 0, productViews: 0, cartAdds: 0, whatsappClicks: 0 }
    }
  },

  async getDailyStats(storeId: string, startDate: Date, endDate: Date): Promise<DailyStats[]> {
    try {
      const q = query(
        this.getCollection(storeId),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate)
      )
      const snapshot = await getDocs(q)

      // Group by date
      const dailyMap: Record<string, DailyStats> = {}

      snapshot.docs.forEach(doc => {
        const data = doc.data()
        const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp)
        const dateKey = timestamp.toISOString().split('T')[0]

        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = {
            date: dateKey,
            pageViews: 0,
            productViews: 0,
            cartAdds: 0,
            whatsappClicks: 0
          }
        }

        switch (data.type) {
          case 'page_view': dailyMap[dateKey].pageViews++; break
          case 'product_view': dailyMap[dateKey].productViews++; break
          case 'cart_add': dailyMap[dateKey].cartAdds++; break
          case 'whatsapp_click': dailyMap[dateKey].whatsappClicks++; break
        }
      })

      // Fill in missing dates with zeros
      const result: DailyStats[] = []
      const current = new Date(startDate)
      while (current <= endDate) {
        const dateKey = current.toISOString().split('T')[0]
        result.push(dailyMap[dateKey] || {
          date: dateKey,
          pageViews: 0,
          productViews: 0,
          cartAdds: 0,
          whatsappClicks: 0
        })
        current.setDate(current.getDate() + 1)
      }

      return result
    } catch (error) {
      console.error('Error getting daily stats:', error)
      return []
    }
  },

  async getTopProducts(storeId: string, startDate: Date, limitCount = 5): Promise<TopProduct[]> {
    try {
      // Query only by timestamp to avoid needing composite index
      const q = query(
        this.getCollection(storeId),
        where('timestamp', '>=', startDate)
      )
      const snapshot = await getDocs(q)

      // Count views per product (filter by type client-side)
      const productCounts: Record<string, { views: number; name: string }> = {}

      snapshot.docs.forEach(doc => {
        const data = doc.data()
        // Filter by type client-side
        if (data.type !== 'product_view') return

        if (data.productId) {
          if (!productCounts[data.productId]) {
            productCounts[data.productId] = {
              views: 0,
              name: data.metadata?.productName || 'Unknown'
            }
          }
          productCounts[data.productId].views++
          // Update name if we have it in metadata
          if (data.metadata?.productName) {
            productCounts[data.productId].name = data.metadata.productName
          }
        }
      })

      // Sort and limit
      return Object.entries(productCounts)
        .map(([productId, { views, name }]) => ({ productId, productName: name, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, limitCount)
    } catch (error) {
      console.error('Error getting top products:', error)
      return []
    }
  },

  async getDeviceStats(storeId: string, startDate: Date, endDate: Date): Promise<DeviceStats> {
    try {
      // Query only by timestamp to avoid needing composite index
      const q = query(
        this.getCollection(storeId),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate)
      )
      const snapshot = await getDocs(q)

      const stats: DeviceStats = { mobile: 0, desktop: 0 }

      snapshot.docs.forEach(doc => {
        const data = doc.data()
        // Filter by type client-side
        if (data.type !== 'page_view') return

        const deviceType = data.metadata?.deviceType || 'desktop'
        if (deviceType === 'mobile') {
          stats.mobile++
        } else {
          stats.desktop++
        }
      })

      return stats
    } catch (error) {
      console.error('Error getting device stats:', error)
      return { mobile: 0, desktop: 0 }
    }
  },

  async getFullAnalytics(storeId: string, startDate: Date, endDate: Date): Promise<{
    summary: AnalyticsSummary
    dailyStats: DailyStats[]
    topProducts: TopProduct[]
    deviceStats: DeviceStats
    referrerStats: ReferrerStats[]
  }> {
    try {
      const q = query(
        this.getCollection(storeId),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate)
      )
      const snapshot = await getDocs(q)

      const summary: AnalyticsSummary = { pageViews: 0, productViews: 0, cartAdds: 0, whatsappClicks: 0 }
      const dailyMap: Record<string, DailyStats> = {}
      const productCounts: Record<string, { views: number; name: string }> = {}
      const deviceStats: DeviceStats = { mobile: 0, desktop: 0 }
      const referrerMap: Record<string, number> = {}

      snapshot.docs.forEach(doc => {
        const data = doc.data()
        const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp)
        const dateKey = timestamp.toISOString().split('T')[0]

        // Summary
        switch (data.type) {
          case 'page_view': summary.pageViews++; break
          case 'product_view': summary.productViews++; break
          case 'cart_add': summary.cartAdds++; break
          case 'whatsapp_click': summary.whatsappClicks++; break
        }

        // Daily stats
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { date: dateKey, pageViews: 0, productViews: 0, cartAdds: 0, whatsappClicks: 0 }
        }
        switch (data.type) {
          case 'page_view': dailyMap[dateKey].pageViews++; break
          case 'product_view': dailyMap[dateKey].productViews++; break
          case 'cart_add': dailyMap[dateKey].cartAdds++; break
          case 'whatsapp_click': dailyMap[dateKey].whatsappClicks++; break
        }

        // Top products
        if (data.type === 'product_view' && data.productId) {
          if (!productCounts[data.productId]) {
            productCounts[data.productId] = { views: 0, name: data.metadata?.productName || 'Unknown' }
          }
          productCounts[data.productId].views++
          if (data.metadata?.productName) productCounts[data.productId].name = data.metadata.productName
        }

        // Device stats
        if (data.type === 'page_view') {
          const deviceType = data.metadata?.deviceType || 'desktop'
          if (deviceType === 'mobile') deviceStats.mobile++
          else deviceStats.desktop++
        }

        // Referrer stats
        if (data.type === 'page_view') {
          const referrer = data.metadata?.referrer || 'direct'
          const source = categorizeReferrer(referrer)
          referrerMap[source] = (referrerMap[source] || 0) + 1
        }
      })

      // Fill missing dates
      const dailyStats: DailyStats[] = []
      const current = new Date(startDate)
      while (current <= endDate) {
        const dateKey = current.toISOString().split('T')[0]
        dailyStats.push(dailyMap[dateKey] || { date: dateKey, pageViews: 0, productViews: 0, cartAdds: 0, whatsappClicks: 0 })
        current.setDate(current.getDate() + 1)
      }

      const topProducts = Object.entries(productCounts)
        .map(([productId, { views, name }]) => ({ productId, productName: name, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)

      const referrerStats = Object.entries(referrerMap)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)

      return { summary, dailyStats, topProducts, deviceStats, referrerStats }
    } catch (error) {
      console.error('Error getting full analytics:', error)
      return {
        summary: { pageViews: 0, productViews: 0, cartAdds: 0, whatsappClicks: 0 },
        dailyStats: [],
        topProducts: [],
        deviceStats: { mobile: 0, desktop: 0 },
        referrerStats: []
      }
    }
  },

  async getOrdersByDateRange(storeId: string, startDate: Date, endDate: Date): Promise<Order[]> {
    try {
      const q = query(
        collection(db, 'stores', storeId, 'orders'),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate)
      )
      const snapshot = await getDocs(q)
      return snapshot.docs
        .map(doc => ({ id: doc.id, storeId, ...convertTimestamps(doc.data()) }) as Order)
        .filter(order => order.status !== 'cancelled')
    } catch (error) {
      console.error('Error getting orders by date range:', error)
      return []
    }
  },

  async getRevenueMetrics(storeId: string, startDate: Date, endDate: Date): Promise<RevenueMetrics> {
    const orders = await this.getOrdersByDateRange(storeId, startDate, endDate)
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
    const totalOrders = orders.length
    return {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
    }
  }
}

function categorizeReferrer(referrer: string): string {
  if (!referrer || referrer === 'direct') return 'direct'
  const r = referrer.toLowerCase()
  if (r.includes('whatsapp') || r.includes('wa.me')) return 'whatsapp'
  if (r.includes('instagram')) return 'instagram'
  if (r.includes('facebook') || r.includes('fb.com')) return 'facebook'
  if (r.includes('google')) return 'google'
  if (r.includes('tiktok')) return 'tiktok'
  return 'other'
}

export default app
