import { initializeApp } from 'firebase/app'
import { getAuth, initializeAuth, indexedDBLocalPersistence } from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, query, where, orderBy, limit, Timestamp, type DocumentData } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import type { User, Store, Product, Category, Order, AnalyticsEventMetadata, AnalyticsSummary, DailyStats, TopProduct, DeviceStats, ReferrerStats, RevenueMetrics } from '../types'

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
export const db = getFirestore(app)
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
  },

  async update(storeId: string, data: Partial<Store>): Promise<void> {
    await updateDoc(doc(db, 'stores', storeId), {
      ...data,
      updatedAt: new Date()
    })
  }
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

    await setDoc(newDocRef, {
      ...data,
      storeId,
      orderNumber,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    return { id: newDocRef.id, orderNumber }
  },

  async updateStatus(storeId: string, orderId: string, status: Order['status']): Promise<void> {
    await updateDoc(doc(db, 'stores', storeId, 'orders', orderId), {
      status,
      updatedAt: new Date()
    })
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
